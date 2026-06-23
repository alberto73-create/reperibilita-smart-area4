/**
 * Helpers.gs - Funzioni Utility Comuni
 * 
 * QUESTO FILE DEVE ESSERE CARICATO PER PRIMO
 * Le funzioni qui definite sono usate da tutti gli altri moduli
 */

/**
 * Ottieni sheet (lancia errore se non esiste)
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

/**
 * Ottieni o crea sheet
 */
function getSheetOrInit(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Ottieni righe dati (salta header)
 */
function getDataRows(sheet) {
  const rows = sheet.getDataRange().getValues();
  return rows.slice(1);
}

/**
 * Formatta data come YYYY-MM-DD
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/**
 * Crea risposta JSON
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
