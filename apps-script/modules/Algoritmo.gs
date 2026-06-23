/**
 * Algoritmo.gs - Assegnazione Automatica Turni
 */

function Algoritmo_calculateTurniAutomaticiInternal(userId) {
  try {
    const config = getConfigData();
    const usersResult = Anagrafica_getUsersInternal();
    const turnsResult = Calendario_getTurnsInternal();
    const prefResult = Preferenze_getPreferencesInternal();

    if (!usersResult.success || !turnsResult.success) {
      return { success: false, error: 'Errore nel recupero dati' };
    }

    const users = usersResult.users.filter(u => u.stato === 'ON');
    const turns = turnsResult.turns
      .filter(t => !t.idTecnico && (t.tipoGiorno === 'SABATO' || t.tipoGiorno === 'DOMENICA' || t.tipoGiorno === 'FESTIVO'))
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));

    let assegnazioni = 0;
    let anomalie = [];

    for (const turno of turns) {
      const result = assegnaTurno(turno, users, prefResult.preferences || [], config);

      if (result.success) {
        Calendario_addTurnInternal({
          data: turno.data,
          idTecnico: result.idTecnico,
          tecnicoNome: result.tecnicoNome,
          tipoGiorno: turno.tipoGiorno,
          punti: result.punti,
          note: 'Assegnazione automatica',
          skipPointsUpdate: true
        }, userId);

        const user = users.find(u => u.id === result.idTecnico);
        if (user) {
          user.punti = (parseFloat(user.punti) || 0) + result.punti;
          user.ultimoTurno = turno.data;
        }

        assegnazioni++;
      } else {
        anomalie.push({ data: turno.data, motivo: result.motivo });
      }
    }

    Algoritmo_updatePointsInternal(userId);
    return { success: true, assegnazioni: assegnazioni, anomalie: anomalie };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Algoritmo_updatePointsInternal(userId) {
  try {
    const usersSheet = getSheetOrInit('Anagrafica');
    const turnsResult = Calendario_getTurnsInternal();
    const turns = turnsResult.success ? turnsResult.turns : [];
    const users = getDataRows(usersSheet);

    const puntiPerUtente = {};
    const ultimoTurnoPerUtente = {};

    for (const turn of turns) {
      if (turn.statoTurno !== 'ASSEGNATO' || !turn.idTecnico) continue;
      const idTecnico = turn.idTecnico;
      const punti = parseFloat(turn.puntiAssegnati) || 0;
      const dataTurno = turn.data || '';

      puntiPerUtente[idTecnico] = (puntiPerUtente[idTecnico] || 0) + punti;
      if (dataTurno && (!ultimoTurnoPerUtente[idTecnico] || dataTurno > ultimoTurnoPerUtente[idTecnico])) {
        ultimoTurnoPerUtente[idTecnico] = dataTurno;
      }
    }

    for (let i = 0; i < users.length; i++) {
      const id = users[i][0];
      const row = i + 2;
      usersSheet.getRange(row, 6).setValue(puntiPerUtente[id] || 0);
      usersSheet.getRange(row, 7).setValue(ultimoTurnoPerUtente[id] || '');
    }

    logAction('ALGORITMO', 'UPDATE_POINTS', '', userId, 'Punti riallineati dal foglio Calendario');
    return { success: true, message: 'Punti aggiornati' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function assegnaTurno(turno, users, preferences, config) {
  const turnoDate = parseLocalDateForCalendar(turno.data);

  let candidati = users.filter(u => {
    if (u.stato === 'OFF') return false;
    if (u.ultimoTurno) {
      const giorniDallUltimo = signedDaysBetween(parseLocalDateForCalendar(u.ultimoTurno), turnoDate);
      if (giorniDallUltimo >= 0 && giorniDallUltimo < config.pausaMinima) return false;
    }
    return true;
  });

  if (candidati.length === 0) {
    return { success: false, motivo: 'Nessun tecnico disponibile: tutti OFF o in pausa minima' };
  }

  const preferenza = getPreferenzaPerData(candidati, turno.data, preferences);
  candidati = candidati.filter(u => preferenza[u.id] !== 'ROSSO');

  if (candidati.length === 0) {
    return { success: false, motivo: 'Tutti i tecnici disponibili hanno preferenza ROSSO' };
  }

  const punteggiVirtuali = candidati.map(u => {
    const pref = preferenza[u.id] || 'BIANCO';
    let bonusMalus = 0;
    if (pref === 'VERDE') bonusMalus = -2;
    else if (pref === 'GIALLO') bonusMalus = 2;

    return {
      user: u,
      puntiVirtuali: (parseFloat(u.punti) || 0) + bonusMalus,
      preferenza: pref
    };
  });

  punteggiVirtuali.sort((a, b) => {
    if (a.puntiVirtuali !== b.puntiVirtuali) return a.puntiVirtuali - b.puntiVirtuali;
    const aLast = a.user.ultimoTurno || '0000-00-00';
    const bLast = b.user.ultimoTurno || '0000-00-00';
    return aLast.localeCompare(bLast);
  });

  const vincitore = punteggiVirtuali[0];
  const punti = getPuntiByTipoGiorno(turno.tipoGiorno);

  return {
    success: true,
    idTecnico: vincitore.user.id,
    tecnicoNome: vincitore.user.nome + ' ' + vincitore.user.cognome,
    punti: punti,
    puntiReali: parseFloat(vincitore.user.punti) || 0,
    punteggioVirtuale: vincitore.puntiVirtuali,
    preferenza: vincitore.preferenza
  };
}

function getPreferenzaPerData(users, data, preferences) {
  const result = {};
  if (!data) {
    users.forEach(u => result[u.id] = 'BIANCO');
    return result;
  }
  const dataStr = formatDate(data);
  users.forEach(u => {
    const pref = preferences.find(p => p.idTecnico === u.id && p.data === dataStr);
    result[u.id] = pref ? pref.preferenza : 'BIANCO';
  });
  return result;
}

function getConfigData() {
  if (typeof Config_getConfigInternal === 'function') {
    const result = Config_getConfigInternal(null);
    if (result && result.success && result.config) return result.config;
  }
  return {
    pausaMinima: 30,
    puntiSabato: 1,
    puntiDomenica: 2,
    puntiFestivo: 3,
    giornoFreeze: 15,
    mesiFuturiMax: 2,
    managerEmail: 'manager@azienda.com',
    ultimoCalcolo: ''
  };
}

function getPuntiByTipoGiorno(tipoGiorno) {
  const config = getConfigData();
  if (tipoGiorno === 'FESTIVO') return config.puntiFestivo;
  if (tipoGiorno === 'DOMENICA') return config.puntiDomenica;
  if (tipoGiorno === 'SABATO') return config.puntiSabato;
  return 0;
}

function signedDaysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date2 - date1) / oneDay);
}

function daysBetween(date1, date2) {
  return Math.abs(signedDaysBetween(date1, date2));
}
