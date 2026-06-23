# 🤖 Reperibilità Smart - Area 4 v2.0

Sistema **completo e professionale** per la gestione automatica delle reperibilità con:
- 🔐 **Login con PIN** a 4 cifre
- 👥 **Doppio ruolo**: USER e MANAGER
- 🧠 **Algoritmo intelligente** di assegnazione turni
- 📊 **Codice modulare** diviso per funzionalità

---

## 🏗️ Architettura

### Backend (Google Apps Script)

```
apps-script/
├── Code.gs              ← Router API principale
├── modules/
│   ├── Auth.gs          ← Login, PIN, ruoli
│   ├── Anagrafica.gs    ← Gestione utenti
│   ├── Calendario.gs    ← Turni e date
│   ├── Preferenze.gs    ← Preferenze colori
│   ├── Algoritmo.gs     ← Assegnazione automatica
│   ├── Log.gs           ← Registro operazioni
│   └── Helpers.gs       ← Utility comuni
```

### Frontend (React + TypeScript)

```
src/
├── App.tsx              ← Componente principale con login
├── App.css              ← Stili
└── types.ts             ← Tipi TypeScript
```

---

## 🔐 Sistema di Login

### Ruoli

| Ruolo | Email Default | PIN | Permessi |
|-------|--------------|-----|----------|
| **MANAGER** | manager@azienda.com | 0000 | Tutto |
| **USER** | mario.rossi@azienda.com | 1234 | Limitato |

### Permessi

| Funzione | USER | MANAGER |
|----------|------|---------|
| Vedere calendario | ✅ | ✅ |
| Impostare preferenze | ✅ | ✅ |
| Vedere utenti | ✅ | ✅ |
| Aggiungere utenti | ❌ | ✅ |
| Cambiare stato ON/OFF | ❌ | ✅ |
| Calcolo automatico | ❌ | ✅ |
| Gestire PIN | ❌ | ✅ |
| Log IA | ❌ | ✅ |

---

## 🎨 Preferenze Colori

Ogni utente può impostare preferenze per i turni:

| Colore | Significato | Effetto |
|--------|-------------|---------|
| 🟩 VERDE | Disponibile volentieri | -2 punti |
| ⬜ BIANCO | Neutro | 0 punti |
| 🟨 GIALLO | Preferirei evitare | +2 punti |
| 🟥 ROSSO | Impossibile | Escluso |

---

## 🧠 Algoritmo di Assegnazione

### Fasi

1. **Filtro esclusione**: OFF, ROSSI, pausa < 30 giorni
2. **Punteggio virtuale**: Punti reali + bonus/malus colore
3. **Scelta**: Vince punteggio più basso
4. **Spareggio**: Verde > Bianco > Giallo
5. **Anomalia**: Se nessuno disponibile → allerta manager

---

## 📊 Sistema Punti

| Tipo Turno | Punti |
|------------|-------|
| Sabato | 1 |
| Domenica | 1 |
| Festivo | 3 |

---

## 🔄 Ciclo Mensile

| Periodo | Azione |
|---------|--------|
| Giorni 1-14 | Inserimento preferenze |
| Giorno 15 | Calcolo automatico turni |
| Giorni 15-24 | Modifiche e scambi |
| Giorno 25 | 🔒 FREEZE |
| Fine mese | Aggiornamento punti |

---

## 🚀 Setup

### Passo 1: Google Sheet

1. Crea nuovo foglio Google
2. Estensioni → Apps Script
3. Copia il contenuto di `apps-script/01_FORMATTA_FOGLIO.gs` in `Code.gs`
4. Esegui `formattaFoglioReperibilitaArea4()` per creare e formattare i tab
5. Sostituisci il codice con `apps-script/Code.gs.COMPLETO.js`
6. Esegui `initTutto()` una volta sola

Per la procedura completa passo-passo usa `GUIDA-AVVIO-GOOGLE-SHEETS.md`.

Per la procedura completa passo-passo usa `GUIDA-AVVIO-GOOGLE-SHEETS.md`.

### Passo 2: Deploy API

1. Deploy → Nuova distribuzione → App Web
2. Esegui come: **Me**
3. Chi può accedere: **Chiunque**
4. Copia URL

### Passo 3: Vercel Proxy

1. `npm i -g vercel`
2. `vercel` (nella cartella progetto)
3. Imposta env var: `APPS_SCRIPT_URL`
4. `vercel --prod`

### Passo 4: Login

1. Apri l'app deployata
2. Login come manager: `manager@azienda.com` / `0000`
3. Cambia i PIN default!

---

## 🛠️ Comandi

```bash
npm install      # Installa dipendenze
npm run dev      # Sviluppo locale
npm run build    # Build produzione
npm run preview  # Preview build
```

---

## 📁 Struttura Completa

```
reperibilita-smart-area4/
├── apps-script/
│   ├── Code.gs              ← Router
│   └── modules/
│       ├── Auth.gs          ← Login
│       ├── Anagrafica.gs    ← Utenti
│       ├── Calendario.gs    ← Turni
│       ├── Preferenze.gs    ← Colori
│       ├── Algoritmo.gs     ← Auto-assign
│       ├── Log.gs           ← Log
│       └── Helpers.gs       ← Utility
├── src/
│   ├── App.tsx              ← UI con login
│   ├── App.css              ← Stili
│   └── types.ts             ← Tipi
├── lib/
│   └── api.ts               ← Client API
├── api/
│   └── [[...path]].ts       ← Vercel proxy
├── .env.local               ← Config
└── README.md                ← Questo file
```

---

## 🔒 Sicurezza

- ✅ PIN a 4 cifre
- ✅ Sessioni con token (24 ore)
- ✅ Solo manager può modificare PIN
- ✅ Log di tutte le operazioni
- ✅ Nessun dato sensibile esposto

---

## 💰 Costi

**100% GRATUITO**

| Servizio | Piano | Costo |
|----------|-------|-------|
| Vercel | Hobby | €0 |
| Google Sheets | Personale | €0 |
| Google Apps Script | Standard | €0 |

---

## 📝 Note Importanti

1. **Cambia i PIN default** subito dopo il primo accesso!
2. Il manager può resettare i PIN degli utenti
3. Le preferenze si possono cambiare fino al giorno 14
4. Il giorno 25 i turni sono congelati
5. Il log IA mostra tutte le decisioni automatiche

---

**Creato con ❤️ per gestire le reperibilità in modo smart ed equo**
