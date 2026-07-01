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
