/**
 * STEP 1 - FORMATTA IL GOOGLE SHEET
 *
 * Nome consigliato del file Google Sheet: Reperibilità Smart - Area 4
 * Nome consigliato del progetto Apps Script: 01 - Formatta foglio reperibilità
 * Funzione da eseguire: formattaFoglioReperibilitaArea4
 *
 * Uso:
 * 1. Crea un Google Sheet vuoto.
 * 2. Apri Estensioni → Apps Script.
 * 3. Incolla SOLO questo file in Code.gs.
 * 4. Salva ed esegui formattaFoglioReperibilitaArea4.
 * 5. Quando ha finito, sostituisci questo script con Code.gs.COMPLETO.js e fai il deploy API.
 */

const SETUP_AREA4 = {
  spreadsheetName: 'Reperibilità Smart - Area 4',
  calendarStart: '2026-01-01',
  monthsAhead: 6,
  defaultManagerEmail: 'manager@azienda.com',
};

function formattaFoglioReperibilitaArea4() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename(SETUP_AREA4.spreadsheetName);

  removeEmptyDefaultSheets_(ss);
  createAuthSheet_(ss);
  createAnagraficaSheet_(ss);
  createCalendarioSheet_(ss);
  createPreferenzeSheet_(ss);
  createConfigurazioneSheet_(ss);
  createFestivitaSheet_(ss);
  createLogIaSheet_(ss);
  createLogAzioniSheet_(ss);
  createAuthLogSheet_(ss);
  createTurniStoricoSheet_(ss);
  createTemplateModuloSheet_(ss);
  removeEmptyDefaultSheets_(ss);

  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    '✅ Foglio pronto',
    'Il file è stato rinominato in "' + SETUP_AREA4.spreadsheetName + '" e tutti i tab necessari sono stati creati.\n\n' +
      'Ora puoi sostituire questo script con apps-script/Code.gs.COMPLETO.js e pubblicare la Web App.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function removeEmptyDefaultSheets_(ss) {
  ss.getSheets().forEach(sheet => {
    const name = sheet.getName();
    const isDefaultName = name === 'Foglio 1' || name === 'Sheet1';
    const isEmpty = sheet.getLastRow() === 0 || (sheet.getLastRow() === 1 && sheet.getLastColumn() === 1 && sheet.getRange(1, 1).getValue() === '');
    if (isDefaultName && isEmpty && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet);
    }
  });
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function resetSheet_(sheet) {
  sheet.clear();
  sheet.clearFormats();
  sheet.clearConditionalFormatRules();
  sheet.setFrozenRows(0);
  sheet.setFrozenColumns(0);
}

function styleHeader_(sheet, columns, background) {
  sheet.getRange(1, 1, 1, columns)
    .setFontWeight('bold')
    .setBackground(background)
    .setFontColor('white')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function createAuthSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Auth');
  resetSheet_(sheet);

  const values = [
    ['ID', 'Email', 'PIN', 'Ruolo', 'Nome'],
    ['USR001', 'mario.rossi@azienda.com', '1234', 'USER', 'Mario Rossi'],
    ['USR002', 'luca.bianchi@azienda.com', '1234', 'USER', 'Luca Bianchi'],
    ['USR003', 'anna.verdi@azienda.com', '1234', 'USER', 'Anna Verdi'],
    ['USR004', 'giulia.neri@azienda.com', '1234', 'USER', 'Giulia Neri'],
    ['MGR001', SETUP_AREA4.defaultManagerEmail, '0000', 'MANAGER', 'Manager'],
  ];

  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  styleHeader_(sheet, values[0].length, '#4285f4');
  sheet.setColumnWidths(1, 1, 90);
  sheet.setColumnWidths(2, 1, 230);
  sheet.setColumnWidths(3, 1, 80);
  sheet.setColumnWidths(4, 1, 110);
  sheet.setColumnWidths(5, 1, 180);
  sheet.getRange('C2:C').setNumberFormat('@');
}

function createAnagraficaSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Anagrafica');
  resetSheet_(sheet);

  const values = [
    ['ID', 'Nome', 'Cognome', 'Email', 'Stato', 'Punti_Totali', 'Ultimo_Turno', 'Data_Assunzione', 'Note'],
    ['USR001', 'Mario', 'Rossi', 'mario.rossi@azienda.com', 'ON', 0, '', '', ''],
    ['USR002', 'Luca', 'Bianchi', 'luca.bianchi@azienda.com', 'ON', 0, '', '', ''],
    ['USR003', 'Anna', 'Verdi', 'anna.verdi@azienda.com', 'ON', 0, '', '', ''],
    ['USR004', 'Giulia', 'Neri', 'giulia.neri@azienda.com', 'ON', 0, '', '', ''],
  ];

  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  styleHeader_(sheet, values[0].length, '#0b57d0');
  sheet.setColumnWidths(1, 1, 90);
  sheet.setColumnWidths(2, 2, 130);
  sheet.setColumnWidths(4, 1, 230);
  sheet.setColumnWidths(5, 1, 80);
  sheet.setColumnWidths(6, 1, 110);
  sheet.setColumnWidths(7, 2, 130);
  sheet.setColumnWidths(9, 1, 240);

  const statusRule = SpreadsheetApp.newDataValidation().requireValueInList(['ON', 'OFF'], true).build();
  sheet.getRange('E2:E').setDataValidation(statusRule);
}

function createCalendarioSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Calendario');
  resetSheet_(sheet);

  const headers = ['Data', 'Giorno', 'Tipo_Giorno', 'Tecnico_Assegnato', 'ID_Tecnico', 'Stato_Turno', 'Punti_Assegnati', 'Note'];
  const rows = [headers].concat(buildWeekendRows_());

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  styleHeader_(sheet, headers.length, '#0f9d58');
  sheet.setColumnWidths(1, 3, 120);
  sheet.setColumnWidths(4, 1, 190);
  sheet.setColumnWidths(5, 3, 120);
  sheet.setColumnWidths(8, 1, 260);
  sheet.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
}

function createPreferenzeSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Preferenze_Colori');
  resetSheet_(sheet);

  const headers = ['ID_Tecnico', 'Nome_Tecnico', 'Data', 'Preferenza', 'Mese_Riferimento', 'Data_Inserimento'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  styleHeader_(sheet, headers.length, '#f4b400');
  sheet.setColumnWidths(1, 2, 140);
  sheet.setColumnWidths(3, 1, 120);
  sheet.setColumnWidths(4, 1, 120);
  sheet.setColumnWidths(5, 2, 160);

  const prefRule = SpreadsheetApp.newDataValidation().requireValueInList(['VERDE', 'BIANCO', 'GIALLO', 'ROSSO'], true).build();
  sheet.getRange('D2:D').setDataValidation(prefRule);
}

function createConfigurazioneSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Configurazione');
  resetSheet_(sheet);

  const values = [
    ['Parametro', 'Valore', 'Descrizione'],
    ['Pausa_Minima_Giorni', 30, 'Giorni minimi tra due turni dello stesso tecnico'],
    ['Punti_Sabato', 1, 'Punti assegnati per sabato'],
    ['Punti_Domenica', 2, 'Punti assegnati per domenica'],
    ['Punti_Festivo', 3, 'Punti assegnati per festivo'],
    ['Giorno_Freeze', 25, 'Giorno del mese per bloccare i turni'],
    ['Mesi_Futuri_Max', SETUP_AREA4.monthsAhead, 'Mesi futuri generati nel calendario'],
    ['Calendario_Start', SETUP_AREA4.calendarStart, 'Prima data da generare/leggere nel calendario'],
    ['Manager_Email', SETUP_AREA4.defaultManagerEmail, 'Email manager iniziale'],
    ['Ultimo_Calcolo', '', 'Data ultimo calcolo automatico'],
  ];

  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  styleHeader_(sheet, values[0].length, '#9c27b0');
  sheet.setColumnWidths(1, 1, 220);
  sheet.setColumnWidths(2, 1, 180);
  sheet.setColumnWidths(3, 1, 420);
}

function createFestivitaSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Festività');
  resetSheet_(sheet);

  const headers = ['Data', 'Nome', 'Tipo', 'Anno'];
  const year = new Date().getFullYear();
  const rows = [headers].concat(buildItalianHolidays_(year), buildItalianHolidays_(year + 1));

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  styleHeader_(sheet, headers.length, '#e91e63');
  sheet.setColumnWidths(1, 1, 120);
  sheet.setColumnWidths(2, 1, 230);
  sheet.setColumnWidths(3, 1, 100);
  sheet.setColumnWidths(4, 1, 90);
  sheet.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
}

function createLogIaSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Log_IA');
  resetSheet_(sheet);
  const headers = ['Timestamp', 'Azione', 'Data_Turno', 'ID_Tecnico', 'Nome_Tecnico', 'Punteggio', 'Motivo', 'Dettagli'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  styleHeader_(sheet, headers.length, '#607d8b');
  sheet.setColumnWidths(1, 1, 170);
  sheet.setColumnWidths(2, 7, 150);
}

function createLogAzioniSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Log_Azioni');
  resetSheet_(sheet);
  const headers = ['Timestamp', 'Modulo', 'Azione', 'Target_ID', 'Actor_ID', 'Dettagli'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  styleHeader_(sheet, headers.length, '#5f6368');
  sheet.setColumnWidths(1, 1, 170);
  sheet.setColumnWidths(2, 5, 150);
}

function createAuthLogSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Auth_Log');
  resetSheet_(sheet);
  const headers = ['Timestamp', 'Azione', 'Target_User_ID', 'Actor_User_ID', 'Dettagli'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  styleHeader_(sheet, headers.length, '#3c4043');
  sheet.setColumnWidths(1, 1, 170);
  sheet.setColumnWidths(2, 4, 160);
}

function createTurniStoricoSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Turni_Storico');
  resetSheet_(sheet);
  const headers = ['ID_Turno', 'Data', 'ID_Tecnico', 'Nome_Tecnico', 'Tipo_Giorno', 'Punti', 'Data_Inserimento', 'Stato'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  styleHeader_(sheet, headers.length, '#795548');
  sheet.setColumnWidths(1, 8, 140);
}

function createTemplateModuloSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, 'Template_Modulo');
  resetSheet_(sheet);

  const values = [
    ['AREA 4', '', '', '', '', ''],
    ['MODULO REPERIBILITÀ', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Mese/Anno:', '', '', 'Periodo:', '', ''],
    ['', '', '', '', '', ''],
    ['Data', 'Giorno', 'Tipo', 'Tecnico', 'Orario', 'Firma'],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Il Responsabile', '', '', 'Data Compilazione', '', ''],
    ['__________________', '', '', '__________________', '', ''],
  ];

  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  sheet.getRange('A1:F1').merge().setFontWeight('bold').setFontSize(16).setHorizontalAlignment('center');
  sheet.getRange('A2:F2').merge().setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
  sheet.getRange('A6:F6').setFontWeight('bold').setBackground('#cccccc');
  sheet.setColumnWidths(1, 6, 130);
}

function buildWeekendRows_() {
  const rows = [];
  const start = parseSetupDate_(SETUP_AREA4.calendarStart);
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth() + SETUP_AREA4.monthsAhead + 1, 0);
  const date = new Date(start);

  while (date <= end) {
    const day = date.getDay();
    if (day === 0 || day === 6 || isFixedHoliday_(date)) {
      rows.push([
        formatDate_(date),
        getItalianDayName_(day),
        getDayType_(date),
        '',
        '',
        '',
        '',
        '',
      ]);
    }
    date.setDate(date.getDate() + 1);
  }

  return rows;
}

function parseSetupDate_(value) {
  const parts = String(value).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getDayType_(date) {
  if (isFixedHoliday_(date)) return 'FESTIVO';
  if (date.getDay() === 6) return 'SABATO';
  if (date.getDay() === 0) return 'DOMENICA';
  return 'FERIALE';
}

function getItalianDayName_(day) {
  return ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][day];
}

function isFixedHoliday_(date) {
  const month = date.getMonth();
  const day = date.getDate();
  return [
    [0, 1], [0, 6], [3, 25], [4, 1], [5, 2],
    [7, 15], [10, 1], [11, 8], [11, 25], [11, 26],
  ].some(([holidayMonth, holidayDay]) => holidayMonth === month && holidayDay === day);
}

function buildItalianHolidays_(year) {
  const easter = calculateEaster_(year);
  const easterDate = new Date(year, easter.month, easter.day);
  const easterMonday = new Date(easterDate);
  easterMonday.setDate(easterMonday.getDate() + 1);

  return [
    [formatDate_(new Date(year, 0, 1)), 'Capodanno', 'Fissa', year],
    [formatDate_(new Date(year, 0, 6)), 'Epifania', 'Fissa', year],
    [formatDate_(easterDate), 'Pasqua', 'Mobile', year],
    [formatDate_(easterMonday), 'Pasquetta', 'Mobile', year],
    [formatDate_(new Date(year, 3, 25)), 'Festa della Liberazione', 'Fissa', year],
    [formatDate_(new Date(year, 4, 1)), 'Festa dei Lavoratori', 'Fissa', year],
    [formatDate_(new Date(year, 5, 2)), 'Festa della Repubblica', 'Fissa', year],
    [formatDate_(new Date(year, 7, 15)), 'Ferragosto', 'Fissa', year],
    [formatDate_(new Date(year, 10, 1)), 'Ognissanti', 'Fissa', year],
    [formatDate_(new Date(year, 11, 8)), 'Immacolata Concezione', 'Fissa', year],
    [formatDate_(new Date(year, 11, 25)), 'Natale', 'Fissa', year],
    [formatDate_(new Date(year, 11, 26)), 'Santo Stefano', 'Fissa', year],
  ];
}

function calculateEaster_(year) {
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
  return {
    month: Math.floor((h + l - 7 * m + 114) / 31) - 1,
    day: ((h + l - 7 * m + 114) % 31) + 1,
  };
}

function formatDate_(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}
