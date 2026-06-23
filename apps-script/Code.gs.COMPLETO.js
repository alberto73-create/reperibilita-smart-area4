/**
 * REPERIBILITÀ SMART - AREA 4
 * Codice completo per Google Apps Script
 * 
 * Generato automaticamente - NON MODIFICARE QUESTO FILE
 * Modifica i file in /modules e rigenera
 */

// ============================================================================
// HELPERS.GS
// ============================================================================

/**
 * Helpers.gs - Funzioni Utility Comuni
 */

function getSheet(name) {
  if (!name) {
    throw new Error('Non eseguire getSheet dal menu. È una funzione interna: seleziona ed esegui STEP2_inizializzaApi oppure initTutto.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('Foglio non trovato: ' + name);
  }
  return sheet;
}

function getSheetOrInit(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function getDataRows(sheet) {
  const rows = sheet.getDataRange().getValues();
  return rows.slice(1);
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function parseDateString(value) {
  if (value instanceof Date) return value;
  const parts = String(value).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// AUTH.GS
// ============================================================================

const SHEET_AUTH = 'Auth';

function initAuth() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_AUTH);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_AUTH);
    sheet.getRange(1, 1, 1, 5).setValues([['ID', 'Email', 'PIN', 'Ruolo', 'Nome']]);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    sheet.getRange(1, 1, 1, 5).setBackground('#4285f4');
    sheet.getRange(1, 1, 1, 5).setFontColor('white');
    sheet.setFrozenRows(1);

    const defaultUsers = [
      ['USR001', 'mario.rossi@azienda.com', '1234', 'USER', 'Mario Rossi'],
      ['USR002', 'luca.bianchi@azienda.com', '1234', 'USER', 'Luca Bianchi'],
      ['USR003', 'anna.verdi@azienda.com', '1234', 'USER', 'Anna Verdi'],
      ['USR004', 'giulia.neri@azienda.com', '1234', 'USER', 'Giulia Neri'],
      ['MGR001', 'manager@azienda.com', '0000', 'MANAGER', 'Manager'],
    ];
    if (defaultUsers.length > 0) {
      sheet.getRange(2, 1, defaultUsers.length, 5).setValues(defaultUsers);
    }
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 80);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 150);
  }
  return sheet;
}

function Auth_loginInternal(email, pin) {
  try {
    const sheet = getSheetOrInit(SHEET_AUTH);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowEmail = String(row[1]).toLowerCase().trim();
      const rowPin = String(row[2]).trim();
      if (rowEmail === email.toLowerCase().trim() && rowPin === pin) {
        return {
          success: true,
          user: {
            id: row[0],
            email: row[1],
            ruolo: row[3],
            nome: row[4],
            isManager: row[3] === 'MANAGER'
          }
        };
      }
    }
    return { success: false, error: 'Email o PIN non validi' };
  } catch (error) {
    return { success: false, error: 'Errore nel login: ' + error.toString() };
  }
}

function Auth_changePinInternal(userId, newPin, requestedBy) {
  try {
    const sheet = getSheetOrInit(SHEET_AUTH);
    const rows = sheet.getDataRange().getValues();
    let isManager = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === requestedBy && rows[i][3] === 'MANAGER') {
        isManager = true;
        break;
      }
    }
    if (!isManager) {
      return { success: false, error: 'Solo un manager può cambiare i PIN' };
    }
    if (!/^\d{4}$/.test(newPin)) {
      return { success: false, error: 'Il PIN deve essere composto da 4 cifre' };
    }
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId) {
        const row = i + 1;
        sheet.getRange(row, 3).setValue(newPin);
        logAuth('CHANGE_PIN', userId, requestedBy, 'PIN modificato');
        return { success: true, message: 'PIN aggiornato con successo' };
      }
    }
    return { success: false, error: 'Utente non trovato' };
  } catch (error) {
    return { success: false, error: 'Errore: ' + error.toString() };
  }
}

function Auth_resetPinInternal(userId, requestedBy) {
  try {
    const sheet = getSheetOrInit(SHEET_AUTH);
    const rows = sheet.getDataRange().getValues();
    let isManager = false;
    let userRole = '';
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === requestedBy && rows[i][3] === 'MANAGER') isManager = true;
      if (rows[i][0] === userId) userRole = rows[i][3];
    }
    if (!isManager) {
      return { success: false, error: 'Solo un manager può resettare i PIN' };
    }
    const defaultPin = userRole === 'MANAGER' ? '0000' : '1234';
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId) {
        const row = i + 1;
        sheet.getRange(row, 3).setValue(defaultPin);
        logAuth('RESET_PIN', userId, requestedBy, 'PIN resettato a ' + defaultPin);
        return { success: true, message: 'PIN resettato a ' + defaultPin, newPin: defaultPin };
      }
    }
    return { success: false, error: 'Utente non trovato' };
  } catch (error) {
    return { success: false, error: 'Errore: ' + error.toString() };
  }
}

function Auth_getUserListInternal(requestedBy) {
  try {
    const sheet = getSheetOrInit(SHEET_AUTH);
    const rows = sheet.getDataRange().getValues();
    let isManager = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === requestedBy && rows[i][3] === 'MANAGER') {
        isManager = true;
        break;
      }
    }
    if (!isManager) {
      return { success: false, error: 'Accesso riservato ai manager' };
    }
    const users = [];
    for (let i = 1; i < rows.length; i++) {
      users.push({ id: rows[i][0], email: rows[i][1], ruolo: rows[i][3], nome: rows[i][4], pinMasked: '****' });
    }
    return { success: true, users: users };
  } catch (error) {
    return { success: false, error: 'Errore: ' + error.toString() };
  }
}

function logAuth(azione, targetUserId, actorUserId, dettagli) {
  try {
    const sheet = getSheetOrInit(SHEET_AUTH + '_Log');
    sheet.appendRow([new Date(), azione, targetUserId, actorUserId, dettagli]);
  } catch (e) {}
}

// ============================================================================
// ANAGRAFICA.GS
// ============================================================================

const SHEET_ANAGRAFICA = 'Anagrafica';

function initAnagrafica() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_ANAGRAFICA);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ANAGRAFICA);
    const headers = ['ID', 'Nome', 'Cognome', 'Email', 'Stato', 'Punti_Totali', 'Ultimo_Turno', 'Data_Assunzione', 'Note'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#4285f4');
    sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
    sheet.setFrozenRows(1);
    const sampleData = [
      ['USR001', 'Mario', 'Rossi', 'mario.rossi@azienda.com', 'ON', 0, '', '', ''],
      ['USR002', 'Luca', 'Bianchi', 'luca.bianchi@azienda.com', 'ON', 0, '', '', ''],
      ['USR003', 'Anna', 'Verdi', 'anna.verdi@azienda.com', 'ON', 0, '', '', ''],
      ['USR004', 'Giulia', 'Neri', 'giulia.neri@azienda.com', 'ON', 0, '', '', ''],
    ];
    if (sampleData.length > 0) {
      sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
    }
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(5, 60);
    sheet.setColumnWidth(6, 80);
    sheet.setColumnWidth(7, 100);
    sheet.setColumnWidth(8, 100);
    sheet.setColumnWidth(9, 200);
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['ON', 'OFF'], true).build();
    sheet.getRange('E2:E').setDataValidation(rule);
  }
  return sheet;
}

function Anagrafica_getUsersInternal() {
  try {
    const sheet = initAnagrafica();
    const rows = getDataRows(sheet);
    const users = rows.map(r => ({
      id: r[0], nome: r[1], cognome: r[2], email: r[3], stato: r[4],
      punti: parseFloat(r[5]) || 0, ultimoTurno: r[6] ? formatDate(r[6]) : '',
      dataAssunzione: r[7] ? formatDate(r[7]) : '', note: r[8] || ''
    }));
    return { success: true, users: users };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Anagrafica_addUserInternal(data, userId) {
  try {
    const sheet = initAnagrafica();
    const id = data.id || 'USR' + Date.now();
    sheet.appendRow([id, data.nome, data.cognome, data.email, data.stato || 'ON', 0, '', data.dataAssunzione || new Date(), data.note || '']);
    addToAuth(id, data.email, data.nome + ' ' + data.cognome);
    logAction('ANAGRAFICA', 'ADD_USER', id, userId, 'Utente aggiunto: ' + data.nome + ' ' + data.cognome);
    return { success: true, user: { id, ...data }, message: 'Utente aggiunto con successo' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Anagrafica_updateUserInternal(data, userId) {
  try {
    const sheet = initAnagrafica();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        const row = i + 1;
        if (data.nome) sheet.getRange(row, 2).setValue(data.nome);
        if (data.cognome) sheet.getRange(row, 3).setValue(data.cognome);
        if (data.email) sheet.getRange(row, 4).setValue(data.email);
        if (data.stato) sheet.getRange(row, 5).setValue(data.stato);
        if (data.note) sheet.getRange(row, 9).setValue(data.note);
        logAction('ANAGRAFICA', 'UPDATE_USER', data.id, userId, 'Utente aggiornato');
        return { success: true, message: 'Utente aggiornato' };
      }
    }
    return { success: false, error: 'Utente non trovato' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Anagrafica_setUserStatusInternal(id, stato, userId, motivo) {
  try {
    const sheet = initAnagrafica();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        const row = i + 1;
        sheet.getRange(row, 5).setValue(stato);
        logAction('ANAGRAFICA', 'SET_STATUS', id, userId, 'Stato cambiato a ' + stato + ' - ' + (motivo || ''));
        return { success: true, message: 'Stato aggiornato' };
      }
    }
    return { success: false, error: 'Utente non trovato' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function aggiornaPuntiUtente(idTecnico, punti, dataTurno) {
  try {
    const sheet = initAnagrafica();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === idTecnico) {
        const attuali = parseFloat(rows[i][5]) || 0;
        const row = i + 1;
        sheet.getRange(row, 6).setValue(attuali + punti);
        if (dataTurno) sheet.getRange(row, 7).setValue(dataTurno);
        break;
      }
    }
    return true;
  } catch (error) {
    Logger.log('Errore aggiornaPuntiUtente: ' + error.toString());
    return false;
  }
}

function addToAuth(userId, email, nome) {
  try {
    const authSheet = getSheetOrInit('Auth');
    authSheet.appendRow([userId, email, '1234', 'USER', nome]);
  } catch (e) {
    Logger.log('Errore addToAuth: ' + e.toString());
  }
}

function logAction(modulo, azione, targetId, actorId, dettagli) {
  try {
    const sheet = getSheetOrInit('Log_Azioni');
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'Modulo', 'Azione', 'Target_ID', 'Actor_ID', 'Dettagli']]);
    }
    sheet.appendRow([new Date(), modulo, azione, targetId, actorId, dettagli]);
  } catch (e) {}
}

function Anagrafica_resetPointsInternal(userId) {
  try {
    const sheet = initAnagrafica();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, message: 'Nessun utente da aggiornare' };
    sheet.getRange(2, 6, lastRow - 1, 1).setValue(0);
    sheet.getRange(2, 7, lastRow - 1, 1).clearContent();
    logAction('ANAGRAFICA', 'RESET_POINTS', '', userId, 'Punti e ultimo turno azzerati');
    return { success: true, message: 'Punti azzerati' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================================================
// CALENDARIO.GS
// ============================================================================

const SHEET_CALENDARIO = 'Calendario';

function initCalendario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_CALENDARIO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CALENDARIO);
    const headers = ['Data', 'Giorno', 'Tipo_Giorno', 'Tecnico_Assegnato', 'ID_Tecnico', 'Stato_Turno', 'Punti_Assegnati', 'Note'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#0f9d58');
    sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
    sheet.setFrozenRows(1);
    generaDateFuture(sheet);
  }
  return sheet;
}

function Calendario_getTurnsInternal() {
  try {
    const sheet = initCalendario();
    const rows = getDataRows(sheet);
    const config = getConfigData();
    const today = new Date();
    const start = parseDateString(config.calendarioStart || '2026-01-01');
    const end = new Date(today.getFullYear(), today.getMonth() + (config.mesiFuturiMax || 2) + 1, 0);
    const turns = rows.map(r => ({
      data: r[0] ? formatDate(r[0]) : '', giorno: r[1], tipoGiorno: r[2],
      tecnicoAssegnato: r[3] || '', idTecnico: r[4] || '', statoTurno: r[5] || '',
      puntiAssegnati: parseFloat(r[6]) || 0, note: r[7] || ''
    })).filter(t => {
      if (!t.data) return false;
      const d = new Date(t.data);
      return d >= start && d <= end;
    });
    return { success: true, turns: turns };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Calendario_addTurnInternal(data, userId) {
  try {
    const sheet = initCalendario();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (formatDate(rows[i][0]) === data.data) {
        const row = i + 1;
        const tipoGiorno = data.tipoGiorno || rows[i][2] || '';
        const config = getConfigData();
        let punti = data.punti;
        if (punti === undefined) {
          if (tipoGiorno === 'FESTIVO') punti = config.puntiFestivo;
          else if (tipoGiorno === 'DOMENICA') punti = config.puntiDomenica;
          else if (tipoGiorno === 'SABATO') punti = config.puntiSabato;
          else punti = 0;
        }
        sheet.getRange(row, 4).setValue(data.tecnicoNome);
        sheet.getRange(row, 5).setValue(data.idTecnico);
        sheet.getRange(row, 6).setValue('ASSEGNATO');
        sheet.getRange(row, 7).setValue(punti || 0);
        sheet.getRange(row, 8).setValue(data.note || '');
        Calendario_addToStorico({ ...data, tipoGiorno: tipoGiorno, punti: punti });
        Algoritmo_updatePointsInternal(userId);
        logAction('CALENDARIO', 'ADD_TURN', data.idTecnico, userId, 'Turno aggiunto il ' + data.data);
        return { success: true, message: 'Turno aggiunto' };
      }
    }
    return { success: false, error: 'Data non trovata' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Calendario_deleteTurnInternal(data, userId) {
  try {
    const sheet = initCalendario();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (formatDate(rows[i][0]) === data) {
        const row = i + 1;
        sheet.getRange(row, 4).clearContent();
        sheet.getRange(row, 5).clearContent();
        sheet.getRange(row, 6).clearContent();
        sheet.getRange(row, 7).clearContent();
        sheet.getRange(row, 8).clearContent();
        logAction('CALENDARIO', 'DELETE_TURN', '', userId, 'Turno eliminato del ' + data);
        return { success: true, message: 'Turno eliminato' };
      }
    }
    return { success: false, error: 'Turno non trovato' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function generaDateFuture(sheet) {
  const config = getConfigData();
  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth() + (config.mesiFuturiMax || 2) + 1, 0);
  let row = 2;
  let currentDate = parseDateString(config.calendarioStart || '2026-01-01');
  while (currentDate <= endDate) {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 6 || dayOfWeek === 0) {
        const isHoliday = isFestivo(date);
        const tipoGiorno = getTipoGiorno(dayOfWeek, isHoliday);
        sheet.getRange(row, 1).setValue(date);
        sheet.getRange(row, 2).setValue(getNomeGiorno(dayOfWeek));
        sheet.getRange(row, 3).setValue(tipoGiorno);
        row++;
      }
    }
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
}

function getTipoGiorno(dayOfWeek, isHoliday) {
  if (isHoliday) return 'FESTIVO';
  if (dayOfWeek === 6) return 'SABATO';
  if (dayOfWeek === 0) return 'DOMENICA';
  return 'FERIALE';
}

function getNomeGiorno(dayOfWeek) {
  const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return giorni[dayOfWeek];
}

function isFestivo(date) {
  const month = date.getMonth();
  const day = date.getDate();
  const fisse = [
    { m: 0, d: 1 }, { m: 0, d: 6 }, { m: 3, d: 25 }, { m: 4, d: 1 },
    { m: 5, d: 2 }, { m: 7, d: 15 }, { m: 9, d: 1 }, { m: 10, d: 8 },
    { m: 11, d: 25 }, { m: 11, d: 26 }
  ];
  return fisse.some(f => f.m === month && f.d === day);
}

function Calendario_addToStorico(data) {
  try {
    const sheet = getSheetOrInit('Turni_Storico');
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 8).setValues([['ID_Turno', 'Data', 'ID_Tecnico', 'Nome_Tecnico', 'Tipo_Giorno', 'Punti', 'Data_Inserimento', 'Stato']]);
    }
    sheet.appendRow(['TRN' + Date.now(), data.data, data.idTecnico, data.tecnicoNome, data.tipoGiorno || '', data.punti || 0, new Date(), 'COMPLETATO']);
  } catch (e) {}
}

// ============================================================================
// PREFERENZE.GS
// ============================================================================

const SHEET_PREFERENZE = 'Preferenze_Colori';

function initPreferenze() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_PREFERENZE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PREFERENZE);
    const headers = ['ID_Tecnico', 'Nome_Tecnico', 'Data', 'Preferenza', 'Mese_Riferimento', 'Data_Inserimento'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f4b400');
    sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
    sheet.setFrozenRows(1);
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['VERDE', 'BIANCO', 'GIALLO', 'ROSSO'], true).build();
    sheet.getRange('D2:D').setDataValidation(rule);
  }
  return sheet;
}

function Preferenze_getPreferencesInternal() {
  try {
    const sheet = initPreferenze();
    const rows = getDataRows(sheet);
    const preferences = rows.map(r => ({
      idTecnico: r[0], nomeTecnico: r[1], data: r[2] ? formatDate(r[2]) : '',
      preferenza: r[3], meseRiferimento: r[4], dataInserimento: r[5] ? formatDate(r[5]) : ''
    }));
    return { success: true, preferences: preferences };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Preferenze_setPreferenceInternal(data, userId) {
  try {
    const sheet = initPreferenze();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.idTecnico && formatDate(rows[i][2]) === data.data) {
        sheet.getRange(i + 1, 4).setValue(data.preferenza);
        sheet.getRange(i + 1, 6).setValue(new Date());
        return { success: true, action: 'updated' };
      }
    }
    sheet.appendRow([data.idTecnico, data.nomeTecnico, data.data, data.preferenza, getMeseRiferimento(data.data), new Date()]);
    return { success: true, action: 'created' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getMeseRiferimento(dataString) {
  const d = new Date(dataString);
  const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  return mesi[d.getMonth()] + ' ' + d.getFullYear();
}

// ============================================================================
// LOG.GS
// ============================================================================

const SHEET_LOG = 'Log_IA';

function initLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LOG);
    const headers = ['Timestamp', 'Azione', 'Data_Turno', 'ID_Tecnico', 'Nome_Tecnico', 'Punteggio', 'Motivo', 'Dettagli'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#607d8b');
    sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function Log_getLogInternal() {
  try {
    const sheet = initLog();
    const rows = getDataRows(sheet);
    const log = rows.map(r => ({
      timestamp: r[0] ? new Date(r[0]).toISOString() : '', azione: r[1],
      dataTurno: r[2] ? formatDate(r[2]) : '', idTecnico: r[3], nomeTecnico: r[4],
      punteggio: r[5], motivo: r[6], dettagli: r[7]
    }));
    log.reverse();
    return { success: true, log: log };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logIA(azione, dataTurno, idTecnico, nomeTecnico, punteggio, motivo, dettagli) {
  try {
    const sheet = initLog();
    sheet.appendRow([new Date(), azione, dataTurno, idTecnico, nomeTecnico, punteggio, motivo, dettagli]);
  } catch (e) {}
}

// ============================================================================
// ALGORITMO.GS
// ============================================================================

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
    const allTurns = turnsResult.turns || [];
    const turns = allTurns.filter(t =>
      !t.idTecnico && (t.tipoGiorno === 'SABATO' || t.tipoGiorno === 'DOMENICA' || t.tipoGiorno === 'FESTIVO')
    );
    let assegnazioni = 0;
    let anomalie = [];
    for (const turno of turns) {
      const result = assegnaTurno(turno, users, prefResult.preferences || [], config, allTurns);
      if (result.success) {
        Calendario_addTurnInternal({
          data: turno.data, idTecnico: result.idTecnico, tecnicoNome: result.tecnicoNome,
          tipoGiorno: turno.tipoGiorno, punti: result.punti, note: 'Assegnazione automatica'
        }, userId);
        const user = users.find(u => u.id === result.idTecnico);
        if (user) {
          user.punti = (parseFloat(user.punti) || 0) + result.punti;
          user.ultimoTurno = turno.data;
        }
        allTurns.push({
          data: turno.data,
          idTecnico: result.idTecnico,
          statoTurno: 'ASSEGNATO',
          puntiAssegnati: result.punti
        });
        assegnazioni++;
        logIA('AUTO_ASSIGN', turno.data, result.idTecnico, result.tecnicoNome,
          result.punteggioVirtuale, 'Assegnazione automatica - ' + turno.tipoGiorno,
          'Punti reali: ' + result.puntiReali);
      } else {
        anomalie.push({ data: turno.data, motivo: result.motivo });
        logIA('ANOMALY', turno.data, '', '', 0, 'Nessun tecnico disponibile', result.motivo);
      }
    }
    return { success: true, assegnazioni: assegnazioni, anomalie: anomalie };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Algoritmo_updatePointsInternal(userId) {
  try {
    const usersSheet = getSheetOrInit('Anagrafica');
    const storicoSheet = getSheetOrInit('Turni_Storico');
    const users = getDataRows(usersSheet);
    const storico = getDataRows(storicoSheet);
    const puntiPerUtente = {};
    for (const row of storico) {
      const idTecnico = row[2];
      const punti = parseFloat(row[5]) || 0;
      puntiPerUtente[idTecnico] = (puntiPerUtente[idTecnico] || 0) + punti;
    }
    for (let i = 0; i < users.length; i++) {
      const id = users[i][0];
      const puntiTotali = puntiPerUtente[id] || 0;
      usersSheet.getRange(i + 2, 6).setValue(puntiTotali);
    }
    logAction('ALGORITMO', 'UPDATE_POINTS', '', userId, 'Punti aggiornati per tutti gli utenti');
    return { success: true, message: 'Punti aggiornati' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function assegnaTurno(turno, users, preferences, config, allTurns) {
  const turnoDate = new Date(turno.data);
  let candidati = users.filter(u => {
    if (u.stato === 'OFF') return false;
    const turnsForUser = (allTurns || []).filter(t => t.idTecnico === u.id && t.statoTurno === 'ASSEGNATO' && t.data);
    for (const assignedTurn of turnsForUser) {
      const giorniDallTurno = daysBetween(new Date(assignedTurn.data), turnoDate);
      if (giorniDallTurno < config.pausaMinima) return false;
    }
    return true;
  });
  if (candidati.length === 0) {
    return { success: false, motivo: 'Nessun tecnico disponibile (tutti OFF o in pausa)' };
  }
  const preferenza = getPreferenzaPerData(candidati, turno.data, preferences);
  candidati = candidati.filter(u => preferenza[u.id] !== 'ROSSO');
  if (candidati.length === 0) {
    return { success: false, motivo: 'Tutti i tecnici hanno preferito ROSSO' };
  }
  const punteggiVirtuali = candidati.map(u => {
    const pref = preferenza[u.id] || 'BIANCO';
    let bonusMalus = 0;
    if (pref === 'VERDE') bonusMalus = -2;
    else if (pref === 'GIALLO') bonusMalus = 2;
    return { user: u, puntiVirtuali: u.punti + bonusMalus, preferenza: pref };
  });
  punteggiVirtuali.sort((a, b) => a.puntiVirtuali - b.puntiVirtuali);
  const vincitore = punteggiVirtuali[0];
  let punti = 0;
  if (turno.tipoGiorno === 'FESTIVO') punti = config.puntiFestivo;
  else if (turno.tipoGiorno === 'DOMENICA') punti = config.puntiDomenica;
  else if (turno.tipoGiorno === 'SABATO') punti = config.puntiSabato;
  return {
    success: true, idTecnico: vincitore.user.id, tecnicoNome: vincitore.user.nome + ' ' + vincitore.user.cognome,
    punti: punti, puntiReali: vincitore.user.punti, punteggioVirtuale: vincitore.puntiVirtuali, preferenza: vincitore.preferenza
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
  try {
    const sheet = getSheetOrInit('Configurazione');
    const defaults = [
      ['Pausa_Minima_Giorni', 30, 'Giorni minimi tra due turni dello stesso tecnico'],
      ['Punti_Sabato', 1, 'Punti assegnati per sabato'],
      ['Punti_Domenica', 2, 'Punti assegnati per domenica'],
      ['Punti_Festivo', 3, 'Punti assegnati per festivo'],
      ['Giorno_Freeze', 25, 'Giorno del mese per congelare i turni del mese successivo'],
      ['Mesi_Futuri_Max', 2, 'Mesi futuri generati nel calendario'],
      ['Calendario_Start', '2026-01-01', 'Prima data da generare/leggere nel calendario'],
      ['Manager_Email', 'manager@azienda.com', 'Email manager iniziale'],
      ['Ultimo_Calcolo', '', 'Data ultimo calcolo automatico']
    ];
    const rows = sheet.getDataRange().getValues();
    const existing = {};
    for (let i = 1; i < rows.length; i++) existing[String(rows[i][0])] = i + 1;
    defaults.forEach(row => {
      if (!existing[row[0]]) sheet.appendRow(row);
    });
    const refreshedRows = sheet.getDataRange().getValues();
    const map = {};
    for (let i = 1; i < refreshedRows.length; i++) map[String(refreshedRows[i][0])] = refreshedRows[i][1];
    return {
      pausaMinima: parseInt(map.Pausa_Minima_Giorni, 10) || 30,
      puntiSabato: parseFloat(map.Punti_Sabato) || 1,
      puntiDomenica: parseFloat(map.Punti_Domenica) || 2,
      puntiFestivo: parseFloat(map.Punti_Festivo) || 3,
      giornoFreeze: parseInt(map.Giorno_Freeze, 10) || 25,
      mesiFuturiMax: parseInt(map.Mesi_Futuri_Max, 10) || 2,
      calendarioStart: String(map.Calendario_Start || '2026-01-01'),
      managerEmail: String(map.Manager_Email || 'manager@azienda.com'),
      ultimoCalcolo: map.Ultimo_Calcolo ? String(map.Ultimo_Calcolo) : ''
    };
  } catch (e) {
    return { pausaMinima: 30, puntiSabato: 1, puntiDomenica: 2, puntiFestivo: 3, giornoFreeze: 25, mesiFuturiMax: 2, calendarioStart: '2026-01-01', managerEmail: 'manager@azienda.com', ultimoCalcolo: '' };
  }
}

function Config_getConfigInternal(userId) {
  return { success: true, config: getConfigData() };
}

function Config_updateConfigInternal(data, userId) {
  try {
    const sheet = getSheetOrInit('Configurazione');
    getConfigData();
    const allowed = {
      pausaMinima: 'Pausa_Minima_Giorni',
      puntiSabato: 'Punti_Sabato',
      puntiDomenica: 'Punti_Domenica',
      puntiFestivo: 'Punti_Festivo',
      giornoFreeze: 'Giorno_Freeze',
      mesiFuturiMax: 'Mesi_Futuri_Max',
      calendarioStart: 'Calendario_Start',
      managerEmail: 'Manager_Email'
    };
    const rows = sheet.getDataRange().getValues();
    const rowByKey = {};
    for (let i = 1; i < rows.length; i++) rowByKey[String(rows[i][0])] = i + 1;
    Object.keys(allowed).forEach(frontKey => {
      if (data[frontKey] === undefined) return;
      const row = rowByKey[allowed[frontKey]];
      if (row) sheet.getRange(row, 2).setValue(data[frontKey]);
    });
    return { success: true, config: getConfigData() };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date2 - date1) / oneDay));
}

// ============================================================================
// CODE.GS - ROUTER PRINCIPALE
// ============================================================================

function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;
  try {
    if (action !== 'login' && !verifyToken(token)) {
      return jsonResponse({ success: false, error: 'Sessione scaduta. Effettua il login.' });
    }
    const userId = getUserIdFromToken(token);
    switch(action) {
      case 'login': return doLogin(e);
      case 'getUsers': return jsonResponse(Anagrafica_getUsersInternal());
      case 'getTurns': return jsonResponse(Calendario_getTurnsInternal());
      case 'getPreferences': return jsonResponse(Preferenze_getPreferencesInternal());
      case 'getHolidays': return jsonResponse(getHolidays());
      case 'getConfig': return jsonResponse(Config_getConfigInternal(userId));
      case 'getLog': return jsonResponse(Log_getLogInternal());
      case 'getStats': return jsonResponse(getStats(userId));
      default: return jsonResponse({ success: false, error: 'Azione non valida: ' + action });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;
  try {
    const data = JSON.parse(e.postData.contents);
    const userId = getUserIdFromToken(token);
    if (!verifyToken(token)) {
      return jsonResponse({ success: false, error: 'Sessione scaduta. Effettua il login.' });
    }
    switch(action) {
      case 'addUser': return jsonResponse(Anagrafica_addUserInternal(data, userId));
      case 'updateUser': return jsonResponse(Anagrafica_updateUserInternal(data, userId));
      case 'setUserStatus': return jsonResponse(Anagrafica_setUserStatusInternal(data.id, data.stato, userId, data.motivo));
      case 'addTurn': return jsonResponse(Calendario_addTurnInternal(data, userId));
      case 'deleteTurn': return jsonResponse(Calendario_deleteTurnInternal(data.data, userId));
      case 'setPreference': return jsonResponse(Preferenze_setPreferenceInternal(data, userId));
      case 'calculateTurni': return jsonResponse(Algoritmo_calculateTurniAutomaticiInternal(userId));
      case 'updatePoints': return jsonResponse(Algoritmo_updatePointsInternal(userId));
      case 'resetPoints': return jsonResponse(Anagrafica_resetPointsInternal(userId));
      case 'updateConfig': return jsonResponse(Config_updateConfigInternal(data, userId));
      case 'changePin': return jsonResponse(Auth_changePinInternal(data.userId, data.newPin, userId));
      case 'resetPin': return jsonResponse(Auth_resetPinInternal(data.userId, userId));
      case 'getUserList': return jsonResponse(Auth_getUserListInternal(userId));
      default: return jsonResponse({ success: false, error: 'Azione non valida: ' + action });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function doLogin(e) {
  const email = e.parameter.email;
  const pin = e.parameter.pin;
  const result = Auth_loginInternal(email, pin);
  if (result.success) {
    const token = Utilities.base64Encode(result.user.id + '|' + new Date().getTime());
    result.token = token;
  }
  return jsonResponse(result);
}

function verifyToken(token) {
  if (!token) return false;
  try {
    const decoded = Utilities.base64Decode(token);
    const decodedStr = Utilities.newBlob(decoded).getDataAsString();
    const parts = decodedStr.split('|');
    if (parts.length !== 2) return false;
    const timestamp = parseInt(parts[1]);
    const now = new Date().getTime();
    const hours24 = 24 * 60 * 60 * 1000;
    return (now - timestamp) < hours24;
  } catch (e) {
    return false;
  }
}

function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const decoded = Utilities.base64Decode(token);
    const decodedStr = Utilities.newBlob(decoded).getDataAsString();
    return decodedStr.split('|')[0];
  } catch (e) {
    return null;
  }
}

function getStats(userId) {
  try {
    const usersResult = Anagrafica_getUsersInternal();
    const turnsResult = Calendario_getTurnsInternal();
    const users = usersResult.success ? usersResult.users : [];
    const turns = turnsResult.success ? turnsResult.turns : [];
    const stats = {
      totaleUtenti: users.length,
      utentiAttivi: users.filter(u => u.stato === 'ON').length,
      turniAssegnati: turns.filter(t => t.statoTurno === 'ASSEGNATO').length,
      turniDaCoprire: turns.filter(t => !t.statoTurno || t.statoTurno === '').length
    };
    return { success: true, stats: stats };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getHolidays() {
  try {
    const today = new Date();
    const holidays = [];
    const startYear = today.getFullYear();
    const endYear = startYear + 1;
    const fixedHolidays = [
      { month: 0, day: 1, nome: 'Capodanno' },
      { month: 0, day: 6, nome: 'Epifania' },
      { month: 3, day: 25, nome: 'Festa della Liberazione' },
      { month: 4, day: 1, nome: 'Festa dei Lavoratori' },
      { month: 5, day: 2, nome: 'Festa della Repubblica' },
      { month: 7, day: 15, nome: 'Ferragosto' },
      { month: 10, day: 1, nome: 'Ognissanti' },
      { month: 11, day: 8, nome: 'Immacolata Concezione' },
      { month: 11, day: 25, nome: 'Natale' },
      { month: 11, day: 26, nome: 'Santo Stefano' }
    ];

    for (let year = startYear; year <= endYear; year++) {
      fixedHolidays.forEach(holiday => {
        holidays.push({
          data: formatDate(new Date(year, holiday.month, holiday.day)),
          nome: holiday.nome,
          tipo: 'Fissa',
          anno: year
        });
      });
    }

    return { success: true, holidays: holidays };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function initTutto() {
  initAuth();
  initAnagrafica();
  initCalendario();
  initPreferenze();
  initLog();
  SpreadsheetApp.getUi().alert('✅ Inizializzazione completata!\n\nTutti i fogli sono stati creati.');
}

function STEP2_inizializzaApi() {
  initTutto();
}
