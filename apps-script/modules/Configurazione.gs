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
