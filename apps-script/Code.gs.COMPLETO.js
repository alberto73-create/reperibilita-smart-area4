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

/**
 * Anagrafica.gs - Gestione Utenti
 * CRUD utenti, stati, punti
 */

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

    sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
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

function Anagrafica_isManagerUser(userId) {
  try {
    const sheet = getSheetOrInit('Auth');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId && rows[i][3] === 'MANAGER') return true;
    }
  } catch (e) {}
  return false;
}

function Anagrafica_getUsersInternal() {
  try {
    const sheet = initAnagrafica();
    const rows = getDataRows(sheet);

    const users = rows.map(r => ({
      id: r[0],
      nome: r[1],
      cognome: r[2],
      email: r[3],
      stato: r[4],
      punti: parseFloat(r[5]) || 0,
      ultimoTurno: r[6] ? formatDate(r[6]) : '',
      dataAssunzione: r[7] ? formatDate(r[7]) : '',
      note: r[8] || ''
    }));

    return { success: true, users: users };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Anagrafica_addUserInternal(data, userId) {
  try {
    if (!Anagrafica_isManagerUser(userId)) {
      return { success: false, error: 'Solo un manager può aggiungere utenti' };
    }

    const sheet = initAnagrafica();
    const id = data.id || 'USR' + Date.now();

    sheet.appendRow([
      id,
      data.nome,
      data.cognome,
      data.email,
      data.stato || 'ON',
      0,
      '',
      data.dataAssunzione || new Date(),
      data.note || ''
    ]);

    addToAuth(id, data.email, data.nome + ' ' + data.cognome);
    logAction('ANAGRAFICA', 'ADD_USER', id, userId, 'Utente aggiunto: ' + data.nome + ' ' + data.cognome);

    return { success: true, user: { id, ...data }, message: 'Utente aggiunto con successo' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Anagrafica_updateUserInternal(data, userId) {
  try {
    if (!Anagrafica_isManagerUser(userId)) {
      return { success: false, error: 'Solo un manager può modificare gli utenti' };
    }

    const sheet = initAnagrafica();
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        const row = i + 1;
        if (data.nome !== undefined) sheet.getRange(row, 2).setValue(data.nome);
        if (data.cognome !== undefined) sheet.getRange(row, 3).setValue(data.cognome);
        if (data.email !== undefined) sheet.getRange(row, 4).setValue(data.email);
        if (data.stato !== undefined) sheet.getRange(row, 5).setValue(data.stato);
        if (data.punti !== undefined) sheet.getRange(row, 6).setValue(parseFloat(data.punti) || 0);
        if (data.ultimoTurno !== undefined) sheet.getRange(row, 7).setValue(data.ultimoTurno);
        if (data.dataAssunzione !== undefined) sheet.getRange(row, 8).setValue(data.dataAssunzione);
        if (data.note !== undefined) sheet.getRange(row, 9).setValue(data.note);

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
    if (!Anagrafica_isManagerUser(userId)) {
      return { success: false, error: 'Solo un manager può cambiare lo stato utenti' };
    }

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

function Anagrafica_resetPointsInternal(userId) {
  try {
    if (!Anagrafica_isManagerUser(userId)) {
      return { success: false, error: 'Solo un manager può azzerare i punteggi' };
    }

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

// ============================================================================
// CALENDARIO.GS
// ============================================================================

/**
 * Calendario.gs - Gestione Turni e Date
 */

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
  }

  ensureCalendarioWindow(sheet);
  return sheet;
}

function Calendario_isManagerUser(userId) {
  try {
    const sheet = getSheetOrInit('Auth');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId && rows[i][3] === 'MANAGER') return true;
    }
  } catch (e) {}
  return false;
}

function Calendario_getTurnsInternal() {
  try {
    const sheet = initCalendario();
    const rows = getDataRows(sheet);
    const bounds = getCalendarioBounds();

    const turns = rows
      .map(r => ({
        data: r[0] ? formatDate(r[0]) : '',
        giorno: r[1],
        tipoGiorno: r[2],
        tecnicoAssegnato: r[3] || '',
        idTecnico: r[4] || '',
        statoTurno: r[5] || '',
        puntiAssegnati: parseFloat(r[6]) || 0,
        note: r[7] || ''
      }))
      .filter(t => {
        if (!t.data) return false;
        const d = parseLocalDateForCalendar(t.data);
        return d >= bounds.start && d <= bounds.end;
      });

    return { success: true, turns: turns };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Calendario_addTurnInternal(data, userId) {
  try {
    if (!Calendario_isManagerUser(userId)) {
      return { success: false, error: 'Solo un manager può forzare o modificare i turni' };
    }
    if (Calendario_isFrozenDate(data.data)) {
      return { success: false, error: 'Turno congelato dal Giorno_Freeze configurato nel foglio' };
    }

    const sheet = initCalendario();
    ensureCalendarDateExists(sheet, data.data);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (formatDate(rows[i][0]) === data.data) {
        const row = i + 1;
        const tipoGiorno = data.tipoGiorno || rows[i][2] || getTipoGiornoByDate(parseLocalDateForCalendar(data.data));
        const punti = data.punti !== undefined ? data.punti : getPuntiByTipoGiorno(tipoGiorno);

        sheet.getRange(row, 2).setValue(getNomeGiorno(parseLocalDateForCalendar(data.data).getDay()));
        sheet.getRange(row, 3).setValue(tipoGiorno);
        sheet.getRange(row, 4).setValue(data.tecnicoNome);
        sheet.getRange(row, 5).setValue(data.idTecnico);
        sheet.getRange(row, 6).setValue('ASSEGNATO');
        sheet.getRange(row, 7).setValue(punti || 0);
        sheet.getRange(row, 8).setValue(data.note || 'Forzatura manuale');

        Calendario_upsertStorico({ ...data, tipoGiorno: tipoGiorno, punti: punti });
        Algoritmo_updatePointsInternal(userId);
        logAction('CALENDARIO', 'UPSERT_TURN', data.idTecnico, userId, 'Turno impostato il ' + data.data);

        return { success: true, message: 'Turno impostato' };
      }
    }

    return { success: false, error: 'Data non trovata' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Calendario_deleteTurnInternal(data, userId) {
  try {
    if (!Calendario_isManagerUser(userId)) {
      return { success: false, error: 'Solo un manager può eliminare turni' };
    }
    if (Calendario_isFrozenDate(data)) {
      return { success: false, error: 'Turno congelato dal Giorno_Freeze configurato nel foglio' };
    }

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

        Calendario_removeFromStorico(data);
        Algoritmo_updatePointsInternal(userId);
        logAction('CALENDARIO', 'DELETE_TURN', '', userId, 'Turno eliminato del ' + data);
        return { success: true, message: 'Turno eliminato' };
      }
    }

    return { success: false, error: 'Turno non trovato' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getCalendarioBounds() {
  const config = getConfigData();
  const today = new Date();
  const start = parseLocalDateForCalendar(config.calendarioStart || '2026-01-01');
  const end = new Date(today.getFullYear(), today.getMonth() + (config.mesiFuturiMax || 2) + 1, 0);
  return { start: start, end: end };
}

function Calendario_isFrozenDate(dataStr) {
  const config = getConfigData();
  const today = new Date();
  const target = parseLocalDateForCalendar(dataStr);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  return today.getDate() >= (config.giornoFreeze || 25) && target >= nextMonthStart && target <= nextMonthEnd;
}

function ensureCalendarioWindow(sheet) {
  const bounds = getCalendarioBounds();
  const rows = sheet.getDataRange().getValues();
  const existing = {};

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) existing[formatDate(rows[i][0])] = true;
  }

  const newRows = [];
  const currentDate = new Date(bounds.start);

  while (currentDate <= bounds.end) {
    const dayOfWeek = currentDate.getDay();
    const relevant = dayOfWeek === 6 || dayOfWeek === 0 || isFestivo(currentDate);

    if (relevant) {
      const dataStr = formatDate(currentDate);
      if (!existing[dataStr]) {
        newRows.push([
          new Date(currentDate),
          getNomeGiorno(dayOfWeek),
          getTipoGiorno(dayOfWeek, isFestivo(currentDate)),
          '',
          '',
          '',
          '',
          ''
        ]);
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 8).setValues(newRows);
  }
}

function ensureCalendarDateExists(sheet, dataStr) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (formatDate(rows[i][0]) === dataStr) return;
  }

  const date = parseLocalDateForCalendar(dataStr);
  const dayOfWeek = date.getDay();
  const relevant = dayOfWeek === 6 || dayOfWeek === 0 || isFestivo(date);

  if (!relevant) {
    throw new Error('La data deve essere sabato, domenica o festivo');
  }

  sheet.appendRow([
    date,
    getNomeGiorno(dayOfWeek),
    getTipoGiorno(dayOfWeek, isFestivo(date)),
    '',
    '',
    '',
    '',
    ''
  ]);
}

function parseLocalDateForCalendar(dataStr) {
  if (dataStr instanceof Date) return dataStr;
  const parts = String(dataStr).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getTipoGiorno(dayOfWeek, isHoliday) {
  if (isHoliday) return 'FESTIVO';
  if (dayOfWeek === 6) return 'SABATO';
  if (dayOfWeek === 0) return 'DOMENICA';
  return 'FERIALE';
}

function getTipoGiornoByDate(date) {
  return getTipoGiorno(date.getDay(), isFestivo(date));
}

function getPuntiByTipoGiorno(tipoGiorno) {
  const config = getConfigData();
  if (tipoGiorno === 'FESTIVO') return config.puntiFestivo;
  if (tipoGiorno === 'DOMENICA') return config.puntiDomenica;
  if (tipoGiorno === 'SABATO') return config.puntiSabato;
  return 0;
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
    { m: 5, d: 2 }, { m: 7, d: 15 }, { m: 10, d: 1 }, { m: 11, d: 8 },
    { m: 11, d: 25 }, { m: 11, d: 26 }
  ];
  if (fisse.some(f => f.m === month && f.d === day)) return true;

  const pasqua = calculateEasterDate(date.getFullYear());
  const pasquetta = new Date(pasqua);
  pasquetta.setDate(pasquetta.getDate() + 1);

  return formatDate(date) === formatDate(pasqua) || formatDate(date) === formatDate(pasquetta);
}

function calculateEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function Calendario_upsertStorico(data) {
  try {
    const sheet = getSheetOrInit('Turni_Storico');
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 8).setValues([['ID_Turno', 'Data', 'ID_Tecnico', 'Nome_Tecnico', 'Tipo_Giorno', 'Punti', 'Data_Inserimento', 'Stato']]);
    }

    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (formatDate(rows[i][1]) === data.data) {
        const row = i + 1;
        sheet.getRange(row, 3, 1, 6).setValues([[
          data.idTecnico,
          data.tecnicoNome,
          data.tipoGiorno || '',
          data.punti || 0,
          new Date(),
          'COMPLETATO'
        ]]);
        return;
      }
    }

    sheet.appendRow([
      'TRN' + Date.now(),
      data.data,
      data.idTecnico,
      data.tecnicoNome,
      data.tipoGiorno || '',
      data.punti || 0,
      new Date(),
      'COMPLETATO'
    ]);
  } catch (e) {}
}

function Calendario_removeFromStorico(dataStr) {
  try {
    const sheet = getSheetOrInit('Turni_Storico');
    const rows = sheet.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      if (formatDate(rows[i][1]) === dataStr) {
        sheet.deleteRow(i + 1);
      }
    }
  } catch (e) {}
}

function Calendario_addToStorico(data) {
  Calendario_upsertStorico(data);
}

// ============================================================================
// PREFERENZE.GS
// ============================================================================

/**
 * Preferenze.gs - Gestione Preferenze Colori
 */

const SHEET_PREFERENZE = 'Preferenze_Colori';

/**
 * Inizializza il foglio Preferenze
 */
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

/**
 * Ottieni preferenze (INTERNAL)
 */
function Preferenze_getPreferencesInternal() {
  try {
    const sheet = initPreferenze();
    const rows = getDataRows(sheet);
    const preferences = rows.map(r => ({
      idTecnico: r[0],
      nomeTecnico: r[1],
      data: r[2] ? formatDate(r[2]) : '',
      preferenza: r[3],
      meseRiferimento: r[4],
      dataInserimento: r[5] ? formatDate(r[5]) : ''
    }));
    return { success: true, preferences: preferences };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Imposta preferenza (INTERNAL)
 */
function Preferenze_setPreferenceInternal(data, userId) {
  try {
    if (!data || data.idTecnico !== userId) {
      return { success: false, error: 'Puoi modificare solo le tue preferenze' };
    }

    const sheet = initPreferenze();
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.idTecnico && formatDate(rows[i][2]) === data.data) {
        sheet.getRange(i + 1, 4).setValue(data.preferenza);
        sheet.getRange(i + 1, 6).setValue(new Date());
        return { success: true, action: 'updated' };
      }
    }

    sheet.appendRow([
      data.idTecnico,
      data.nomeTecnico,
      data.data,
      data.preferenza,
      getMeseRiferimento(data.data),
      new Date()
    ]);
    return { success: true, action: 'created' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Imposta più preferenze con una sola chiamata API (INTERNAL)
 */
function Preferenze_setPreferencesBatchInternal(data, userId) {
  try {
    const preferences = data && Array.isArray(data.preferences) ? data.preferences : [];
    if (preferences.length === 0) {
      return { success: true, updated: 0, created: 0, message: 'Nessuna preferenza da salvare' };
    }

    const invalid = preferences.find(p => p.idTecnico !== userId || !p.data || !p.preferenza);
    if (invalid) {
      return { success: false, error: 'Payload preferenze non valido o non autorizzato' };
    }

    const sheet = initPreferenze();
    const rows = sheet.getDataRange().getValues();
    const rowByKey = {};

    for (let i = 1; i < rows.length; i++) {
      const key = rows[i][0] + '|' + formatDate(rows[i][2]);
      rowByKey[key] = i + 1;
    }

    let updated = 0;
    const newRows = [];
    const now = new Date();

    preferences.forEach(pref => {
      const key = pref.idTecnico + '|' + pref.data;
      const row = rowByKey[key];

      if (row) {
        sheet.getRange(row, 4, 1, 3).setValues([[pref.preferenza, getMeseRiferimento(pref.data), now]]);
        updated++;
      } else {
        newRows.push([
          pref.idTecnico,
          pref.nomeTecnico,
          pref.data,
          pref.preferenza,
          getMeseRiferimento(pref.data),
          now
        ]);
      }
    });

    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 6).setValues(newRows);
    }

    SpreadsheetApp.flush();
    return { success: true, updated: updated, created: newRows.length };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Cancella tutte le preferenze di un tecnico (INTERNAL)
 */
function Preferenze_clearPreferencesForUserInternal(data, userId) {
  try {
    const idTecnico = data && data.idTecnico ? data.idTecnico : userId;
    if (idTecnico !== userId) {
      return { success: false, error: 'Puoi cancellare solo le tue preferenze' };
    }

    const sheet = initPreferenze();
    const rows = sheet.getDataRange().getValues();
    let deleted = 0;

    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][0] === idTecnico) {
        sheet.deleteRow(i + 1);
        deleted++;
      }
    }

    SpreadsheetApp.flush();
    return { success: true, deleted: deleted };
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

/**
 * Log.gs - Registro Operazioni
 */

const SHEET_LOG = 'Log_IA';

/**
 * Inizializza il foglio Log
 */
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

/**
 * Ottieni log (INTERNAL)
 */
function Log_getLogInternal() {
  try {
    const sheet = initLog();
    const rows = getDataRows(sheet);
    const log = rows.map(r => ({
      timestamp: r[0] ? new Date(r[0]).toISOString() : '',
      azione: r[1],
      dataTurno: r[2] ? formatDate(r[2]) : '',
      idTecnico: r[3],
      nomeTecnico: r[4],
      punteggio: r[5],
      motivo: r[6],
      dettagli: r[7]
    }));
    log.reverse();
    return { success: true, log: log };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Logga azione IA
 */
function logIA(azione, dataTurno, idTecnico, nomeTecnico, punteggio, motivo, dettagli) {
  try {
    const sheet = initLog();
    sheet.appendRow([
      new Date(),
      azione,
      dataTurno,
      idTecnico,
      nomeTecnico,
      punteggio,
      motivo,
      dettagli
    ]);
  } catch (e) {}
}

/**
 * Logga azione generica
 */
function logAction(modulo, azione, targetId, actorId, dettagli) {
  try {
    const sheet = getSheetOrInit('Log_Azioni');
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'Modulo', 'Azione', 'Target_ID', 'Actor_ID', 'Dettagli']]);
    }
    sheet.appendRow([new Date(), modulo, azione, targetId, actorId, dettagli]);
  } catch (e) {}
}

// ============================================================================
// ALGORITMO.GS
// ============================================================================

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

    const users = usersResult.users.filter(u => isUserActiveForSmartAssignment(u));
    const allTurns = turnsResult.turns || [];
    const turns = allTurns
      .filter(t => !t.idTecnico && (t.tipoGiorno === 'SABATO' || t.tipoGiorno === 'DOMENICA' || t.tipoGiorno === 'FESTIVO'))
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));

    let assegnazioni = 0;
    let anomalie = [];

    for (const turno of turns) {
      if (Calendario_isFrozenDate(turno.data)) {
        anomalie.push({ data: turno.data, motivo: 'Turno congelato dal Giorno_Freeze' });
        continue;
      }

      const result = assegnaTurno(turno, users, prefResult.preferences || [], config, allTurns);

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
        allTurns.push({
          data: turno.data,
          idTecnico: result.idTecnico,
          statoTurno: 'ASSEGNATO',
          puntiAssegnati: result.punti
        });

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


function normalizeSmartValue(value) {
  return String(value || '').trim().toUpperCase();
}

function isUserActiveForSmartAssignment(user) {
  return normalizeSmartValue(user && user.stato) === 'ON';
}

function getPreferencePriority(preferenza) {
  const pref = normalizeSmartValue(preferenza) || 'BIANCO';
  if (pref === 'VERDE') return 0;
  if (pref === 'BIANCO') return 1;
  if (pref === 'GIALLO') return 2;
  return 3;
}

function assegnaTurno(turno, users, preferences, config, allTurns) {
  const turnoDate = parseLocalDateForCalendar(turno.data);

  let candidati = users.filter(u => {
    if (!isUserActiveForSmartAssignment(u)) return false;
    const turnsForUser = (allTurns || []).filter(t => t.idTecnico === u.id && t.statoTurno === 'ASSEGNATO' && t.data);
    for (const assignedTurn of turnsForUser) {
      const distanza = Math.abs(signedDaysBetween(parseLocalDateForCalendar(assignedTurn.data), turnoDate));
      if (distanza < config.pausaMinima) return false;
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
    const puntiReali = getSmartRealPointsForTurn(u.id, turnoDate, allTurns);
    let bonusMalus = 0;
    if (pref === 'VERDE') bonusMalus = -2;
    else if (pref === 'GIALLO') bonusMalus = 2;

    return {
      user: u,
      puntiReali: puntiReali,
      puntiVirtuali: puntiReali + bonusMalus,
      preferenza: pref
    };
  });

  punteggiVirtuali.sort((a, b) => {
    if (a.puntiVirtuali !== b.puntiVirtuali) return a.puntiVirtuali - b.puntiVirtuali;

    const prefDelta = getPreferencePriority(a.preferenza) - getPreferencePriority(b.preferenza);
    if (prefDelta !== 0) return prefDelta;

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
    puntiReali: vincitore.puntiReali,
    punteggioVirtuale: vincitore.puntiVirtuali,
    preferenza: vincitore.preferenza
  };
}


function getSmartRealPointsForTurn(idTecnico, turnoDate, allTurns) {
  const monthStart = new Date(turnoDate.getFullYear(), turnoDate.getMonth(), 1);
  return (allTurns || []).reduce((totale, assignedTurn) => {
    if (assignedTurn.idTecnico !== idTecnico || assignedTurn.statoTurno !== 'ASSEGNATO' || !assignedTurn.data) {
      return totale;
    }

    const assignedDate = parseLocalDateForCalendar(assignedTurn.data);
    if (assignedDate >= monthStart) return totale;

    return totale + (parseFloat(assignedTurn.puntiAssegnati) || 0);
  }, 0);
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
    result[u.id] = pref ? normalizeSmartValue(pref.preferenza) : 'BIANCO';
  });
  return result;
}

function signedDaysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date2 - date1) / oneDay);
}

function daysBetween(date1, date2) {
  return Math.abs(signedDaysBetween(date1, date2));
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
    giornoFreeze: 25,
    mesiFuturiMax: 2,
    calendarioStart: '2026-01-01',
    managerEmail: 'manager@azienda.com',
    ultimoCalcolo: ''
  };
}

/**
 * Configurazione.gs - criteri di scelta e finestra calendario.
 */

function Config_getConfigInternal(userId) {
  try {
    const sheet = Config_initSheet();
    const rows = getDataRows(sheet);
    const map = {};
    rows.forEach(r => map[String(r[0])] = r[1]);

    const config = {
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

    return { success: true, config: config };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Config_updateConfigInternal(data, userId) {
  try {
    if (userId && !Config_isManagerUser(userId)) {
      return { success: false, error: 'Solo un manager può modificare i criteri' };
    }

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

    const sheet = Config_initSheet();
    const rows = sheet.getDataRange().getValues();
    const rowByKey = {};
    for (let i = 1; i < rows.length; i++) rowByKey[String(rows[i][0])] = i + 1;

    Object.keys(allowed).forEach(frontKey => {
      if (data[frontKey] === undefined) return;
      const sheetKey = allowed[frontKey];
      const row = rowByKey[sheetKey];
      if (row) sheet.getRange(row, 2).setValue(data[frontKey]);
    });

    logAction('CONFIG', 'UPDATE_CONFIG', '', userId, 'Criteri manager aggiornati');
    return Config_getConfigInternal(userId);
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function Config_initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Configurazione');

  if (!sheet) {
    sheet = ss.insertSheet('Configurazione');
    sheet.getRange(1, 1, 1, 3).setValues([['Parametro', 'Valore', 'Descrizione']]);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#9c27b0').setFontColor('white');
  }

  const defaults = [
    ['Pausa_Minima_Giorni', 30, 'Giorni minimi tra due turni dello stesso tecnico'],
    ['Punti_Sabato', 1, 'Punti assegnati per sabato'],
    ['Punti_Domenica', 2, 'Punti assegnati per domenica'],
    ['Punti_Festivo', 3, 'Punti assegnati per festivo'],
    ['Giorno_Freeze', 25, 'Giorno del mese per congelare le modifiche ai turni del mese successivo'],
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

  return sheet;
}

function Config_isManagerUser(userId) {
  try {
    const sheet = getSheetOrInit('Auth');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId && rows[i][3] === 'MANAGER') return true;
    }
  } catch (e) {}
  return false;
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
      case 'getHealth': return jsonResponse(getHealth(userId));
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
      utentiAttivi: users.filter(u => String(u.stato || '').trim().toUpperCase() === 'ON').length,
      turniAssegnati: turns.filter(t => t.statoTurno === 'ASSEGNATO').length,
      turniDaCoprire: turns.filter(t => !t.statoTurno || t.statoTurno === '').length
    };
    return { success: true, stats: stats };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getHealth(userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requiredSheets = ['Auth', 'Anagrafica', 'Calendario', 'Preferenze_Colori', 'Configurazione', 'Log_IA'];
    const sheets = {};

    requiredSheets.forEach(name => {
      const sheet = ss.getSheetByName(name);
      sheets[name] = {
        exists: Boolean(sheet),
        rows: sheet ? Math.max(sheet.getLastRow() - 1, 0) : 0
      };
    });

    const usersResult = Anagrafica_getUsersInternal();
    const turnsResult = Calendario_getTurnsInternal();
    const configResult = Config_getConfigInternal(userId);
    const users = usersResult.success ? usersResult.users : [];
    const turns = turnsResult.success ? turnsResult.turns : [];
    const relevantTurns = turns.filter(t => t.tipoGiorno === 'SABATO' || t.tipoGiorno === 'DOMENICA' || t.tipoGiorno === 'FESTIVO');
    const turniDaCoprire = relevantTurns.filter(t => !t.idTecnico && !t.statoTurno).length;
    const turniAssegnati = relevantTurns.filter(t => t.statoTurno === 'ASSEGNATO' && t.idTecnico).length;
    const warnings = [];

    if (!usersResult.success) warnings.push('Anagrafica non leggibile: ' + usersResult.error);
    if (!turnsResult.success) warnings.push('Calendario non leggibile: ' + turnsResult.error);
    if (!configResult.success) warnings.push('Configurazione non leggibile: ' + configResult.error);
    if (usersResult.success && users.length === 0) warnings.push('Nessun utente trovato in Anagrafica.');
    if (turnsResult.success && relevantTurns.length === 0) warnings.push('Calendario operativo vuoto: non ci sono sabati, domeniche o festivi nella finestra configurata.');
    if (turnsResult.success && relevantTurns.length > 0 && turniDaCoprire === 0) warnings.push('Nessun turno scoperto da assegnare nella finestra calendario corrente.');

    return {
      success: true,
      health: {
        dbRaggiungibile: true,
        spreadsheetName: ss.getName(),
        checkedAt: new Date().toISOString(),
        sheets: sheets,
        counts: {
          utenti: users.length,
          utentiAttivi: users.filter(u => String(u.stato || '').trim().toUpperCase() === 'ON').length,
          turniTotali: relevantTurns.length,
          turniDaCoprire: turniDaCoprire,
          turniAssegnati: turniAssegnati
        },
        config: configResult.success ? configResult.config : null,
        warnings: warnings
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      health: {
        dbRaggiungibile: false,
        checkedAt: new Date().toISOString(),
        warnings: ['Backend raggiunto, ma foglio non accessibile: ' + error.toString()]
      }
    };
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

      const pasqua = calculateEasterDate(year);
      const pasquetta = new Date(pasqua);
      pasquetta.setDate(pasquetta.getDate() + 1);
      holidays.push({ data: formatDate(pasqua), nome: 'Pasqua', tipo: 'Mobile', anno: year });
      holidays.push({ data: formatDate(pasquetta), nome: 'Pasquetta', tipo: 'Mobile', anno: year });
    }

    holidays.sort((a, b) => a.data.localeCompare(b.data));
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
