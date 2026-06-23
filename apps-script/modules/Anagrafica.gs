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
