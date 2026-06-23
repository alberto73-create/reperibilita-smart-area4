export interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  stato: 'ON' | 'OFF';
  punti: number;
  ultimoTurno: string;
  dataAssunzione: string;
  note: string;
  role?: 'MANAGER' | 'USER';
}

export interface Turn {
  data: string;
  giorno: string;
  tipoGiorno: 'SABATO' | 'DOMENICA' | 'FESTIVO' | 'FERIALE';
  tecnicoAssegnato: string;
  idTecnico: string;
  statoTurno: string;
  puntiAssegnati: number;
  note: string;
}

export interface Preference {
  idTecnico: string;
  nomeTecnico: string;
  data: string;
  preferenza: 'VERDE' | 'BIANCO' | 'GIALLO' | 'ROSSO';
  meseRiferimento: string;
  dataInserimento: string;
}

export interface Config {
  pausaMinima: number;
  puntiSabato: number;
  puntiDomenica: number;
  puntiFestivo: number;
  giornoFreeze: number;
  mesiFuturiMax: number;
  calendarioStart: string;
  managerEmail: string;
  ultimoCalcolo: string;
}

export interface Holiday {
  data: string;
  nome: string;
  tipo: 'Fissa' | 'Mobile';
  anno: number;
}

export interface LogEntry {
  timestamp: string;
  azione: string;
  dataTurno: string;
  idTecnico: string;
  nomeTecnico: string;
  punteggio: number;
  motivo: string;
  dettagli: string;
}

export interface Stats {
  totaleUtenti: number;
  utentiAttivi: number;
  turniAssegnati: number;
  turniDaCoprire: number;
}
