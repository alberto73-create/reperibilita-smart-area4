# 🚀 Guida Rapida al Setup - 10 Minuti

## Passo 1: Crea Google Sheet Automatico (2 min)

1. **Apri** https://sheets.google.com
2. Clicca su **+ Vuoto**
3. **Estensioni** → **Apps Script**
4. **Cancella tutto** il codice presente
5. **Copia e incolla** il file `apps-script/01_FORMATTA_FOGLIO.gs`
6. Clicca su **Salva** (💾)
7. Seleziona la funzione `formattaFoglioReperibilitaArea4` e clicca su **Esegui** (▶️)
8. **Autorizza** l'accesso (se richiesto)
9. **Rispondi OK** all'avviso di successo

✅ Il foglio è stato creato automaticamente con:
- Sheet "Utenti" con intestazioni
- Sheet "Turni" con intestazioni
- Dati di esempio
- Menu personalizzato

---

## Passo 2: Apps Script API (3 min)

1. Sempre in Apps Script, **cancella tutto** di nuovo
2. **Copia e incolla** il file `apps-script/Code.gs.COMPLETO.js`
3. Clicca su **Salva** (💾)
4. Dai il nome: `Reperibilità API`
5. Seleziona la funzione `STEP2_inizializzaApi` e clicca su **Esegui** (▶️)
6. Non eseguire `getSheet`: è una funzione interna
7. **Deploy** → **Nuova distribuzione**
8. Clicca su ⚙️ → **App Web**
9. Configura:
   - **Descrizione**: `v1`
   - **Esegui come**: **Me**
   - **Chi può accedere**: **Chiunque**
10. Clicca su **Deploy**
11. **Autorizza** (Avanzate → Apri → Consenti)
12. **Copia l'URL** dell'App Web

---

## Passo 3: Configura .env.local (1 min)

```bash
# Nella cartella del progetto
# Crea un file chiamato .env.local
```

Contenuto di `.env.local`:
```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/IL_TUO_ID_COPIATO/exec
```

---

## Passo 4: Avvia l'App (2 min)

```bash
npm install
npm run dev
```

Apri **http://localhost:5173**

---

## ✅ Fatto!

Ora puoi:
- ✅ Vedere gli utenti di esempio
- ✅ Aggiungere nuovi utenti
- ✅ Assegnare turni sul calendario
- ✅ Tutto si salva su Google Sheets

---

## 🌐 Metti Online (Vercel)

```bash
npm i -g vercel
vercel
```

Nel dashboard Vercel aggiungi:
- `APPS_SCRIPT_URL` = il tuo URL

---

## 🆘 Problemi?

| Errore | Soluzione |
|--------|-----------|
| "Google non ha verificato" | Normale, procedi con Avanzate |
| "Errore caricamento" | Controlla URL in .env.local |
| Sheet non creato | Esegui di nuovo SETUP-FOGLIO.gs |
