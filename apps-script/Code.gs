/**
 * Reperibilità Smart - Area 4
 * Entry Point - Router API
 */

function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;

  try {
    if (action === 'login') {
      return jsonResponse({ success: false, error: 'Il login richiede una richiesta POST.' });
    }
    if (!verifyToken(token)) {
      return jsonResponse({ success: false, error: 'Sessione scaduta. Effettua il login.' });
    }

    const userId = getUserIdFromToken(token);

    switch(action) {
      case 'getUsers': return jsonResponse(Anagrafica_getUsers(userId));
      case 'getTurns': return jsonResponse(Calendario_getTurns());
      case 'getPreferences': return jsonResponse(Preferenze_getPreferences(userId));
      case 'getHolidays': return jsonResponse(getHolidays());
      case 'getConfig': return jsonResponse(Config_getConfig(userId));
      case 'getLog': return jsonResponse(Log_getLog(userId));
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
    const data = JSON.parse(e.postData.contents || '{}');
    if (action === 'login') {
      return doLogin({ parameter: JSON.parse(e.postData.contents || '{}') });
    }

    const userId = getUserIdFromToken(token);

    if (!verifyToken(token)) {
      return jsonResponse({ success: false, error: 'Sessione scaduta. Effettua il login.' });
    }

    switch(action) {
      case 'addUser': return jsonResponse(Anagrafica_addUser(data, userId));
      case 'updateUser': return jsonResponse(Anagrafica_updateUser(data, userId));
      case 'setUserStatus': return jsonResponse(Anagrafica_setUserStatus(data, userId));
      case 'addTurn': return jsonResponse(Calendario_addTurn(data, userId));
      case 'deleteTurn': return jsonResponse(Calendario_deleteTurn(data, userId));
      case 'setPreference': return jsonResponse(Preferenze_setPreference(data, userId));
      case 'setPreferencesBatch': return jsonResponse(Preferenze_setPreferencesBatch(data, userId));
      case 'clearPreferencesForUser': return jsonResponse(Preferenze_clearPreferencesForUser(data, userId));
      case 'calculateTurni': return jsonResponse(Algoritmo_calculateTurniAutomatici(userId));
      case 'updatePoints': return jsonResponse(Algoritmo_updatePoints(userId));
      case 'resetPoints': return jsonResponse(Anagrafica_resetPoints(userId));
      case 'updateConfig': return jsonResponse(Config_updateConfig(data, userId));
      case 'changePin': return jsonResponse(Auth_changePin(data, userId));
      case 'resetPin': return jsonResponse(Auth_resetPin(data, userId));
      case 'getUserList': return jsonResponse(Auth_getUserList(userId));
      default: return jsonResponse({ success: false, error: 'Azione non valida: ' + action });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function doLogin(e) {
  const email = e.parameter.email;
  const pin = e.parameter.pin;
  const result = Auth_login(email, pin);

  if (result.success) {
    result.token = createToken(result.user.id);
  }

  return jsonResponse(result);
}

function getTokenSecret() {
  const properties = PropertiesService.getScriptProperties();
  let secret = properties.getProperty('AUTH_TOKEN_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty('AUTH_TOKEN_SECRET', secret);
  }
  return secret;
}

function createToken(userId) {
  const payload = userId + '|' + new Date().getTime();
  const signature = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payload, getTokenSecret())
  );
  return Utilities.base64EncodeWebSafe(payload + '|' + signature);
}

function decodeToken(token) {
  if (!token) return null;
  const decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(token)).getDataAsString();
  const parts = decoded.split('|');
  if (parts.length !== 3) return null;
  return { userId: parts[0], timestamp: Number(parts[1]), signature: parts[2] };
}

function verifyToken(token) {
  if (!token) return false;

  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.userId || !Number.isFinite(decoded.timestamp)) return false;
    const payload = decoded.userId + '|' + decoded.timestamp;
    const expected = Utilities.base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(payload, getTokenSecret())
    );
    if (decoded.signature !== expected) return false;
    const now = new Date().getTime();
    const hours24 = 24 * 60 * 60 * 1000;
    const age = now - decoded.timestamp;
    return age >= 0 && age < hours24;
  } catch (e) {
    return false;
  }
}

function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const decoded = decodeToken(token);
    return decoded ? decoded.userId : null;
  } catch (e) {
    return null;
  }
}

function Anagrafica_getUsers(userId) {
  const result = Anagrafica_getUsersInternal();
  if (!result.success || Anagrafica_isManagerUser(userId)) return result;
  result.users = result.users.map(function(user) {
    return {
      id: user.id, nome: user.nome, cognome: user.cognome, email: '', stato: user.stato,
      punti: user.id === userId ? user.punti : 0,
      ultimoTurno: user.id === userId ? user.ultimoTurno : '',
      dataAssunzione: '', note: ''
    };
  });
  return result;
}
function Anagrafica_addUser(data, userId) { return Anagrafica_addUserInternal(data, userId); }
function Anagrafica_updateUser(data, userId) { return Anagrafica_updateUserInternal(data, userId); }
function Anagrafica_setUserStatus(data, userId) { return Anagrafica_setUserStatusInternal(data.id, data.stato, userId, data.motivo); }
function Anagrafica_resetPoints(userId) { return Anagrafica_resetPointsInternal(userId); }

function Calendario_getTurns() { return Calendario_getTurnsInternal(); }
function Calendario_addTurn(data, userId) { return Calendario_addTurnInternal(data, userId); }
function Calendario_deleteTurn(data, userId) { return Calendario_deleteTurnInternal(data.data, userId); }

function Preferenze_getPreferences(userId) {
  const result = Preferenze_getPreferencesInternal();
  if (!result.success || Anagrafica_isManagerUser(userId)) return result;
  result.preferences = result.preferences.filter(function(pref) { return pref.idTecnico === userId; });
  return result;
}
function Preferenze_setPreference(data, userId) { return Preferenze_setPreferenceInternal(data, userId); }
function Preferenze_setPreferencesBatch(data, userId) { return Preferenze_setPreferencesBatchInternal(data, userId); }
function Preferenze_clearPreferencesForUser(data, userId) { return Preferenze_clearPreferencesForUserInternal(data, userId); }

function Config_getConfig(userId) { return Config_getConfigInternal(userId); }
function Config_updateConfig(data, userId) { return Config_updateConfigInternal(data, userId); }

function Log_getLog(userId) {
  if (!Anagrafica_isManagerUser(userId)) {
    return { success: false, error: 'Accesso al log riservato ai manager' };
  }
  return Log_getLogInternal();
}
function Auth_login(email, pin) { return Auth_loginInternal(email, pin); }
function Auth_changePin(data, userId) { return Auth_changePinInternal(data.userId, data.newPin, userId); }
function Auth_resetPin(data, userId) { return Auth_resetPinInternal(data.userId, userId); }
function Auth_getUserList(userId) { return Auth_getUserListInternal(userId); }
function Algoritmo_calculateTurniAutomatici(userId) { return Algoritmo_calculateTurniAutomaticiInternal(userId); }
function Algoritmo_updatePoints(userId) { return Algoritmo_updatePointsInternal(userId); }

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
        const date = new Date(year, holiday.month, holiday.day);
        holidays.push({ data: formatDate(date), nome: holiday.nome, tipo: 'Fissa', anno: year });
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
  Config_initSheet();
  SpreadsheetApp.getUi().alert('✅ Inizializzazione completata!\n\nTutti i fogli sono stati creati.');
}

function STEP2_inizializzaApi() {
  initTutto();
}
