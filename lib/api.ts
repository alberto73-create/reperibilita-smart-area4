const API_BASE = '/api';
const DEFAULT_API_TIMEOUT_MS = 25000;
const LONG_API_TIMEOUT_MS = 55000;

import type { User, Turn, Preference, Holiday, LogEntry, Stats } from '../src/types';

type PreferenceColor = 'VERDE' | 'BIANCO' | 'GIALLO' | 'ROSSO';
type ApiCallOptions = { forcePost?: boolean; timeoutMs?: number };

interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    ruolo: string;
    nome: string;
    isManager: boolean;
  };
  token?: string;
  error?: string;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout: il backend non ha risposto entro ${Math.round(timeoutMs / 1000)} secondi. Riprova tra poco.`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function parseJsonResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Risposta API non valida');
  }
}

async function callAPI(action: string, data?: any, options?: ApiCallOptions): Promise<any> {
  const params = new URLSearchParams({ action });
  const token = localStorage.getItem('auth_token');
  if (token) {
    params.set('token', token);
  }

  const url = `${API_BASE}?${params.toString()}`;
  const hasBody = data !== undefined || options?.forcePost === true;

  const requestOptions: RequestInit = {
    method: hasBody ? 'POST' : 'GET',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: hasBody ? JSON.stringify(data ?? {}) : undefined,
  };

  const response = await fetchWithTimeout(url, requestOptions, options?.timeoutMs);
  const result = await parseJsonResponse<any>(response);

  if (!response.ok) {
    throw new Error(result.error || `API error: ${response.statusText}`);
  }

  if (result?.success === false) {
    throw new Error(result.error || 'Operazione non riuscita');
  }

  return result;
}

// ==================== AUTH ====================

export async function login(email: string, pin: string): Promise<LoginResult> {
  const params = new URLSearchParams({ action: 'login', email, pin });
  const url = `${API_BASE}?${params.toString()}`;
  const response = await fetchWithTimeout(url, { method: 'GET', cache: 'no-store' });
  const result = await parseJsonResponse<LoginResult>(response);

  if (!response.ok) {
    return {
      success: false,
      error: result.error || `API error: ${response.statusText}`,
    };
  }

  return result;
}

// ==================== UTENTI ====================

export async function getUsers(): Promise<User[]> {
  const result = await callAPI('getUsers');
  return result.users || [];
}

export async function addUser(user: Omit<User, 'id' | 'punti' | 'ultimoTurno'>): Promise<User> {
  const result = await callAPI('addUser', user);
  if (!result.success) throw new Error(result.error);
  return result.user;
}

export async function updateUser(user: Partial<User> & { id: string }): Promise<User> {
  const result = await callAPI('updateUser', user);
  if (!result.success) throw new Error(result.error);
  return result.user;
}

export async function setUserStatus(id: string, stato: 'ON' | 'OFF', motivo?: string): Promise<void> {
  const result = await callAPI('setUserStatus', { id, stato, motivo });
  if (!result.success) throw new Error(result.error);
}

// ==================== TURNI ====================

export async function getTurns(): Promise<Turn[]> {
  const result = await callAPI('getTurns');
  return result.turns || [];
}

export async function addTurn(turn: {
  data: string;
  idTecnico: string;
  tecnicoNome: string;
  tipoGiorno: string;
  punti: number;
  note?: string;
}): Promise<void> {
  const result = await callAPI('addTurn', turn);
  if (!result.success) throw new Error(result.error);
}

export async function deleteTurn(data: string): Promise<void> {
  const result = await callAPI('deleteTurn', { data });
  if (!result.success) throw new Error(result.error);
}

// ==================== PREFERENZE ====================

export async function getPreferences(): Promise<Preference[]> {
  const result = await callAPI('getPreferences');
  return result.preferences || [];
}

export async function setPreference(preference: {
  idTecnico: string;
  nomeTecnico: string;
  data: string;
  preferenza: PreferenceColor;
}): Promise<void> {
  const result = await callAPI('setPreference', preference);
  if (!result.success) throw new Error(result.error);
}

export async function setPreferencesBatch(preferences: Array<{
  idTecnico: string;
  nomeTecnico: string;
  data: string;
  preferenza: PreferenceColor;
}>): Promise<void> {
  const result = await callAPI('setPreferencesBatch', { preferences }, { timeoutMs: LONG_API_TIMEOUT_MS });
  if (!result.success) throw new Error(result.error);
}

export async function clearPreferencesForUser(idTecnico: string): Promise<void> {
  const result = await callAPI('clearPreferencesForUser', { idTecnico }, { timeoutMs: LONG_API_TIMEOUT_MS });
  if (!result.success) throw new Error(result.error);
}

// ==================== FESTIVITÀ ====================

export async function getHolidays(): Promise<Holiday[]> {
  const result = await callAPI('getHolidays');
  return result.holidays || [];
}

// ==================== LOG ====================

export async function getLog(): Promise<LogEntry[]> {
  const result = await callAPI('getLog');
  return result.log || [];
}

// ==================== STATS ====================

export async function getStats(): Promise<Stats> {
  const result = await callAPI('getStats');
  return result.stats || {};
}

// ==================== MANAGER ====================

export async function calculateTurniAutomatici(): Promise<{ assegnazioni: number; anomalie: any[] }> {
  const result = await callAPI('calculateTurni', {}, { forcePost: true, timeoutMs: LONG_API_TIMEOUT_MS });
  if (!result.success) throw new Error(result.error);
  return { assegnazioni: result.assegnazioni, anomalie: result.anomalie || [] };
}

export async function updatePoints(): Promise<void> {
  const result = await callAPI('updatePoints', {}, { forcePost: true, timeoutMs: LONG_API_TIMEOUT_MS });
  if (!result.success) throw new Error(result.error);
}

export async function changePin(userId: string, newPin: string): Promise<void> {
  const result = await callAPI('changePin', { userId, newPin });
  if (!result.success) throw new Error(result.error);
}

export async function resetPin(userId: string): Promise<{ success: boolean; newPin: string }> {
  const result = await callAPI('resetPin', { userId });
  if (!result.success) throw new Error(result.error);
  return { success: true, newPin: result.newPin };
}

export async function generateModulo(mese: number, anno: number): Promise<{ foglio: string; url: string }> {
  const result = await callAPI('generateModulo', { mese, anno });
  if (!result.success) throw new Error(result.error);
  return { foglio: result.foglio, url: result.url };
}
