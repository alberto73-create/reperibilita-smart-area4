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
