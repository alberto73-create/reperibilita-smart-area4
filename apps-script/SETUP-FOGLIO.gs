// Script per creare automaticamente il foglio Reperibilità Smart - Area 4
// Copia questo codice in: Estensioni → Apps Script nel tuo Google Sheet
// Esegui la funzione setupReperibilitaSmart()

const CONFIG = {
  sheetName: 'Reperibilità Smart - Area 4',
  calendarStart: '2026-01-01',
  minFutureMonths: 3,
  maxFutureMonths: 6,
  pausaMinimaGiorni: 30,
  freezeDay: 25,
  punti: {
    sabato: 1,
    domenica: 2,
    festivo: 3
  }
};

function setupReperibilitaSmart() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setName(CONFIG.sheetName);
  
  // Elimina foglio predefinito se esiste
  const defaultSheet = ss.getActiveSheet();
  if (defaultSheet.getName() === 'Foglio 1') {
    ss.deleteSheet(defaultSheet);
  }
  
  // Crea tutti i fogli
  creaFoglioAnagrafica(ss);
  creaFoglioCalendario(ss);
  creaFoglioPreferenzeColori(ss);
  creaFoglioConfigurazione(ss);
  creaFoglioFestivita(ss);
  creaFoglioLogIA(ss);
  creaFoglioTemplateModulo(ss);
  creaFoglioTurniStorico(ss);
  
  // Mostra menu personalizzato
  creaMenuPersonalizzato();
  
  // Mostra messaggio di successo
  SpreadsheetApp.getUi().alert(
    '✅ Reperibilità Smart - Area 4 Configurato!',
    'Tutti i fogli sono stati creati con successo!\n\n' +
    'Fogli creati:\n' +
    '  • 📋 Anagrafica\n' +
    '  • 📅 Calendario\n' +
    '  • 🎨 Preferenze_Colori\n' +
    '  • ⚙️ Configurazione\n' +
    '  • 🎉 Festività\n' +
    '  • 📝 Log_IA\n' +
    '  • 📄 Template_Modulo\n' +
    '  • 📜 Turni_Storico\n\n' +
    'Ora procedi con il deploy delle API (vedi README.md)',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function creaFoglioAnagrafica(ss) {
  let sheet = ss.getSheetByName('Anagrafica');
  if (!sheet) {
    sheet = ss.insertSheet('Anagrafica');
  }
  
  const headers = [
    'ID', 'Nome', 'Cognome', 'Email', 
    'Stato', 'Punti_Totali', 'Ultimo_Turno', 
    'Data_Assunzione', 'Note'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#4285f4');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
  sheet.setFrozenRows(1);
  
  // Dati di esempio
  const sampleData = [
    ['USR001', 'Mario', 'Rossi', 'mario.rossi@azienda.com', 'ON', 0, '', '', ''],
    ['USR002', 'Luca', 'Bianchi', 'luca.bianchi@azienda.com', 'ON', 0, '', '', ''],
    ['USR003', 'Anna', 'Verdi', 'anna.verdi@azienda.com', 'ON', 0, '', '', ''],
    ['USR004', 'Giulia', 'Neri', 'giulia.neri@azienda.com', 'ON', 0, '', '', ''],
  ];
  
  if (sheet.getLastRow() < 2) {
    sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
  }
  
  // Formatta colonne
  sheet.setColumnWidth(1, 80);   // ID
  sheet.setColumnWidth(2, 120);  // Nome
  sheet.setColumnWidth(3, 120);  // Cognome
  sheet.setColumnWidth(4, 200);  // Email
  sheet.setColumnWidth(5, 60);   // Stato
  sheet.setColumnWidth(6, 80);   // Punti
  sheet.setColumnWidth(7, 100);  // Ultimo turno
  sheet.setColumnWidth(8, 100);  // Data assunzione
  sheet.setColumnWidth(9, 200);  // Note
  
  // Data validation per Stato (ON/OFF)
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['ON', 'OFF'], true)
    .build();
  sheet.getRange('E2:E').setDataValidation(rule);
}

function creaFoglioCalendario(ss) {
  let sheet = ss.getSheetByName('Calendario');
  if (!sheet) {
    sheet = ss.insertSheet('Calendario');
  }
  
  const headers = [
    'Data', 'Giorno', 'Tipo_Giorno', 'Tecnico_Assegnato', 
    'ID_Tecnico', 'Stato_Turno', 'Punti_Assegnati', 'Note'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#0f9d58');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
  sheet.setFrozenRows(1);
  
  // Formatta colonne
  sheet.setColumnWidth(1, 100);  // Data
  sheet.setColumnWidth(2, 100);  // Giorno
  sheet.setColumnWidth(3, 100);  // Tipo giorno
  sheet.setColumnWidth(4, 150);  // Tecnico
  sheet.setColumnWidth(5, 80);   // ID Tecnico
  sheet.setColumnWidth(6, 100);  // Stato
  sheet.setColumnWidth(7, 80);   // Punti
  sheet.setColumnWidth(8, 200);  // Note
  
  // Genera date future
  generaDateFuture(sheet);
}

function creaFoglioPreferenzeColori(ss) {
  let sheet = ss.getSheetByName('Preferenze_Colori');
  if (!sheet) {
    sheet = ss.insertSheet('Preferenze_Colori');
  }
  
  const headers = [
    'ID_Tecnico', 'Nome_Tecnico', 'Data', 
    'Preferenza', 'Mese_Riferimento', 'Data_Inserimento'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#f4b400');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
  sheet.setFrozenRows(1);
  
  // Formatta colonne
  sheet.setColumnWidth(1, 80);   // ID
  sheet.setColumnWidth(2, 120);  // Nome
  sheet.setColumnWidth(3, 100);  // Data
  sheet.setColumnWidth(4, 100);  // Preferenza
  sheet.setColumnWidth(5, 120);  // Mese
  sheet.setColumnWidth(6, 120);  // Data inserimento
  
  // Data validation per Preferenza
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['VERDE', 'BIANCO', 'GIALLO', 'ROSSO'], true)
    .build();
  sheet.getRange('D2:D').setDataValidation(rule);
}

function creaFoglioConfigurazione(ss) {
  let sheet = ss.getSheetByName('Configurazione');
  if (!sheet) {
    sheet = ss.insertSheet('Configurazione');
  }
  
  const configData = [
    ['Parametro', 'Valore', 'Descrizione'],
    ['Pausa_Minima_Giorni', CONFIG.pausaMinimaGiorni, 'Giorni minimi tra due turni'],
    ['Punti_Sabato', CONFIG.punti.sabato, 'Punti per turno sabato'],
    ['Punti_Domenica', CONFIG.punti.domenica, 'Punti per turno domenica'],
    ['Punti_Festivo', CONFIG.punti.festivo, 'Punti per turno festivo'],
    ['Giorno_Freeze', CONFIG.freezeDay, 'Giorno del mese per freeze turni'],
    ['Mesi_Futuri_Min', CONFIG.minFutureMonths, 'Minimo mesi futuri generati'],
    ['Mesi_Futuri_Max', CONFIG.maxFutureMonths, 'Massimo mesi futuri generati'],
    ['Calendario_Start', CONFIG.calendarStart, 'Prima data da generare/leggere nel calendario'],
    ['Manager_Email', '', 'Email del manager'],
    ['Ultimo_Calcolo', '', 'Data ultimo calcolo automatico'],
  ];
  
  sheet.getRange(1, 1, configData.length, 3).setValues(configData);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  sheet.getRange(1, 1, 1, 3).setBackground('#9c27b0');
  sheet.getRange(1, 1, 1, 3).setFontColor('white');
  
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 300);
}

function creaFoglioFestivita(ss) {
  let sheet = ss.getSheetByName('Festività');
  if (!sheet) {
    sheet = ss.insertSheet('Festività');
  }
  
  const headers = ['Data', 'Nome', 'Tipo', 'Anno'];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#e91e63');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
  sheet.setFrozenRows(1);
  
  // Aggiungi festività per anno corrente e successivo
  const year = new Date().getFullYear();
  const festivita = getFestivitaItaliane(year);
  
  if (festivita.length > 0) {
    sheet.getRange(2, 1, festivita.length, headers.length).setValues(festivita);
  }
  
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 80);
}

function creaFoglioLogIA(ss) {
  let sheet = ss.getSheetByName('Log_IA');
  if (!sheet) {
    sheet = ss.insertSheet('Log_IA');
  }
  
  const headers = [
    'Timestamp', 'Azione', 'Data_Turno', 'ID_Tecnico', 
    'Nome_Tecnico', 'Punteggio', 'Motivo', 'Dettagli'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#607d8b');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
  sheet.setFrozenRows(1);
  
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 80);
  sheet.setColumnWidth(7, 200);
  sheet.setColumnWidth(8, 300);
}

function creaFoglioTemplateModulo(ss) {
  let sheet = ss.getSheetByName('Template_Modulo');
  if (!sheet) {
    sheet = ss.insertSheet('Template_Modulo');
  }
  
  // Crea template per modulo AREA 4
  const template = [
    ['AZIENDA XYZ - AREA 4', '', '', '', '', ''],
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
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Il Responsabile', '', '', 'Data Compilazione', '', ''],
    ['__________________', '', '', '__________________', '', ''],
  ];
  
  sheet.getRange(1, 1, template.length, template[0].length).setValues(template);
  sheet.getRange(1, 1, 1, 6).merge();
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(16);
  sheet.getRange(2, 1, 1, 6).merge();
  sheet.getRange(2, 1).setFontWeight('bold').setFontSize(14);
  sheet.getRange(6, 1, 1, 6).setFontWeight('bold').setBackground('#cccccc');
  
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 100);
}

function creaFoglioTurniStorico(ss) {
  let sheet = ss.getSheetByName('Turni_Storico');
  if (!sheet) {
    sheet = ss.insertSheet('Turni_Storico');
  }
  
  const headers = [
    'ID_Turno', 'Data', 'ID_Tecnico', 'Nome_Tecnico', 
    'Tipo_Giorno', 'Punti', 'Data_Inserimento', 'Stato'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#795548');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
  sheet.setFrozenRows(1);
  
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 80);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 100);
}

function generaDateFuture(sheet) {
  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth() + CONFIG.maxFutureMonths + 1, 0);
  
  let row = 2;
  let currentDate = parseConfigDate(CONFIG.calendarStart);
  
  while (currentDate <= endDate) {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayOfWeek = date.getDay();
      
      // Solo sabati (6) e domeniche (0)
      if (dayOfWeek === 6 || dayOfWeek === 0) {
        const isHoliday = isFestivo(date);
        const tipoGiorno = getTipoGiorno(dayOfWeek, isHoliday);
        
        sheet.getRange(row, 1).setValue(formatDate(date));
        sheet.getRange(row, 2).setValue(getNomeGiorno(dayOfWeek));
        sheet.getRange(row, 3).setValue(tipoGiorno);
        
        row++;
      }
    }
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
}

function parseConfigDate(value) {
  const parts = String(value).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
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
  // Controllo semplificato - le festività complete sono nel foglio Festività
  const month = date.getMonth();
  const day = date.getDate();
  
  // Festività fisse
  const fisse = [
    { m: 0, d: 1 },   // Capodanno
    { m: 0, d: 6 },   // Epifania
    { m: 3, d: 25 },  // Liberazione
    { m: 4, d: 1 },   // Lavoro
    { m: 5, d: 2 },   // Repubblica
    { m: 7, d: 15 },  // Ferragosto
    { m: 9, d: 1 },   // Ognissanti
    { m: 10, d: 8 },  // Immacolata
    { m: 11, d: 25 }, // Natale
    { m: 11, d: 26 }, // Santo Stefano
  ];
  
  return fisse.some(f => f.m === month && f.d === day);
}

function getFestivitaItaliane(year) {
  const easter = calculateEaster(year);
  const easterDate = new Date(year, easter.month, easter.day);
  const easterMonday = new Date(easterDate);
  easterMonday.setDate(easterMonday.getDate() + 1);
  
  const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  
  const festivita = [
    [new Date(year, 0, 1), 'Capodanno', 'Fissa'],
    [new Date(year, 0, 6), 'Epifania', 'Fissa'],
    [new Date(year, 3, 25), 'Festa della Liberazione', 'Fissa'],
    [new Date(year, 4, 1), 'Festa dei Lavoratori', 'Fissa'],
    [new Date(year, 5, 2), 'Festa della Repubblica', 'Fissa'],
    [new Date(year, 7, 15), 'Ferragosto', 'Fissa'],
    [new Date(year, 9, 1), 'Ognissanti', 'Fissa'],
    [new Date(year, 10, 8), 'Immacolata', 'Fissa'],
    [new Date(year, 11, 25), 'Natale', 'Fissa'],
    [new Date(year, 11, 26), 'Santo Stefano', 'Fissa'],
    [easterDate, 'Pasqua', 'Mobile'],
    [easterMonday, 'Pasquetta', 'Mobile'],
  ];
  
  return festivita.map(f => [
    formatDate(f[0]),
    f[1],
    f[2],
    year
  ]);
}

function calculateEaster(year) {
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
  return { month, day };
}

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function creaMenuPersonalizzato() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🤖 Reperibilità Smart')
    .addItem('📅 Genera Calendario', 'generaCalendario')
    .addItem('🎯 Calcola Turni', 'calcolaTurniAutomatici')
    .addItem('📄 Genera Modulo AREA 4', 'generaModuloArea4')
    .addItem('🔄 Aggiorna Punti', 'aggiornaPunti')
    .addSeparator()
    .addItem('ℹ️ Informazioni', 'mostraInfo');
}

function mostraInfo() {
  SpreadsheetApp.getUi().alert(
    '🤖 Reperibilità Smart - Area 4',
    'Sistema automatico di gestione turni\n\n' +
    'Funzioni disponibili:\n' +
    '• Genera Calendario: crea date future\n' +
    '• Calcola Turni: assegna turni automaticamente\n' +
    '• Genera Modulo: crea modulo AREA 4\n' +
    '• Aggiorna Punti: calcola punti tecnici\n\n' +
    'Ciclo mensile:\n' +
    '• Giorni 1-14: inserimento preferenze\n' +
    '• Giorno 15: calcolo automatico\n' +
    '• Giorno 25: freeze turni',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function onOpen() {
  creaMenuPersonalizzato();
}
