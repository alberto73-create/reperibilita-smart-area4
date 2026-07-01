/**
 * Reperibilità Smart - Area 4
 * Entry Point - Router API
 */

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
      case 'getUsers': return jsonResponse(Anagrafica_getUsers());
      case 'getTurns': return jsonResponse(Calendario_getTurns());
      case 'getPreferences': return jsonResponse(Preferenze_getPreferences());
      case 'getHolidays': return jsonResponse(getHolidays());
      case 'getConfig': return jsonResponse(Config_getConfig(userId));
      case 'getLog': return jsonResponse(Log_getLog());
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
    const data = JSON.parse(e.postData.contents || '{}');
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

function Anagrafica_getUsers() { return Anagrafica_getUsersInternal(); }
function Anagrafica_addUser(data, userId) { return Anagrafica_addUserInternal(data, userId); }
function Anagrafica_updateUser(data, userId) { return Anagrafica_updateUserInternal(data, userId); }
function Anagrafica_setUserStatus(data, userId) { return Anagrafica_setUserStatusInternal(data.id, data.stato, userId, data.motivo); }
function Anagrafica_resetPoints(userId) { return Anagrafica_resetPointsInternal(userId); }

function Calendario_getTurns() { return Calendario_getTurnsInternal(); }
function Calendario_addTurn(data, userId) { return Calendario_addTurnInternal(data, userId); }
function Calendario_deleteTurn(data, userId) { return Calendario_deleteTurnInternal(data.data, userId); }

function Preferenze_getPreferences() { return Preferenze_getPreferencesInternal(); }
function Preferenze_setPreference(data, userId) { return Preferenze_setPreferenceInternal(data, userId); }
function Preferenze_setPreferencesBatch(data, userId) { return Preferenze_setPreferencesBatchInternal(data, userId); }
function Preferenze_clearPreferencesForUser(data, userId) { return Preferenze_clearPreferencesForUserInternal(data, userId); }

function Config_getConfig(userId) { return Config_getConfigInternal(userId); }
function Config_updateConfig(data, userId) { return Config_updateConfigInternal(data, userId); }

function Log_getLog() { return Log_getLogInternal(); }
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
    }

    return { success: true, holidays: holidays };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
