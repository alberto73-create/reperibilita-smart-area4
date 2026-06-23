# Guida avvio con Google Sheets come database

Questa guida serve per partire da zero e collegare l'app **Reperibilità Smart Area 4** a un Google Sheet usato come database tramite Google Apps Script.

## 0. Cosa posso e non posso fare io

Io **non ho accesso diretto al tuo Google Sheet** da questa chat e non posso aprire o modificare il tuo account Google, a meno che tu non abbia già configurato credenziali o strumenti specifici nell'ambiente di lavoro. In questo progetto non risultano credenziali Google utilizzabili automaticamente.

Quello che puoi fare tu è seguire i passaggi qui sotto: sono pensati per essere copiati e incollati senza dover scrivere codice a mano.

---

## 1. Crea il Google Sheet

1. Vai su <https://sheets.google.com>.
2. Crea un foglio nuovo vuoto.
3. Rinominalo, per esempio: `Reperibilita Smart Area 4`.
4. Apri **Estensioni → Apps Script**.

---

## 2. Prima formatta il foglio

Nel progetto Apps Script:

1. Cancella tutto il codice già presente in `Code.gs`.
2. Copia tutto il contenuto del file del repository:

```text
apps-script/01_FORMATTA_FOGLIO.gs
```

3. Incollalo in `Code.gs` dentro Apps Script.
4. Clicca **Salva**.
5. Come nome progetto puoi usare: `01 - Formatta foglio reperibilità`.
6. Esegui la funzione `formattaFoglioReperibilitaArea4`.

Il Google Sheet verrà rinominato automaticamente in:

```text
Reperibilità Smart - Area 4
```

---

## 3. Poi incolla lo script completo Apps Script

Nel progetto Apps Script:

1. Cancella tutto il codice già presente in `Code.gs`.
2. Copia tutto il contenuto del file del repository:

```text
apps-script/Code.gs.COMPLETO.js
```

3. Incollalo in `Code.gs` dentro Apps Script.
4. Clicca **Salva**.
5. Dai al progetto un nome, per esempio: `Reperibilita Smart API`.

> Nota: il file completo contiene già helper, autenticazione, anagrafica, calendario, preferenze, log, algoritmo e router API. È il metodo più semplice per evitare errori di ordine fra moduli.

---

## 4. Inizializza i fogli

1. Nel menu in alto di Apps Script seleziona la funzione `initTutto`.
2. Clicca **Esegui**.
3. Autorizza i permessi richiesti.
4. Se Google mostra “app non verificata”, clicca **Avanzate → Vai al progetto → Consenti**.
5. Torna nel Google Sheet e verifica che siano stati creati questi fogli:
   - `Auth`
   - `Anagrafica`
   - `Calendario`
   - `Preferenze_Colori`
   - `Log_IA`

Utenti iniziali creati dallo script:

| Ruolo | Email | PIN |
| --- | --- | --- |
| Manager | `manager@azienda.com` | `0000` |
| Utente | `mario.rossi@azienda.com` | `1234` |
| Utente | `luca.bianchi@azienda.com` | `1234` |
| Utente | `anna.verdi@azienda.com` | `1234` |
| Utente | `giulia.neri@azienda.com` | `1234` |

Cambia i PIN appena hai verificato che tutto funziona.

---

## 5. Pubblica Apps Script come API web

1. In Apps Script clicca **Deploy → Nuova distribuzione**.
2. Clicca sull'icona ingranaggio e scegli **App Web**.
3. Configura così:

| Campo | Valore |
| --- | --- |
| Descrizione | `v1` |
| Esegui come | `Me` / `Io` |
| Chi può accedere | `Chiunque` |

4. Clicca **Deploy**.
5. Autorizza se richiesto.
6. Copia l'URL finale della Web App. Deve assomigliare a:

```text
https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec
```

Questo URL è il valore da usare come `APPS_SCRIPT_URL`.

---

## 6. Configura l'app in locale

Nel repository crea o aggiorna il file `.env.local` nella root del progetto:

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec
```

Sostituisci `XXXXXXXXXXXXXXXXXXXXXXXX` con il tuo URL reale copiato da Apps Script.

Poi avvia:

```bash
npm install
npm run dev
```

Apri:

```text
http://localhost:5173
```

---

## 7. Login di prova

Prova prima come manager:

```text
Email: manager@azienda.com
PIN: 0000
```

Se entra, il collegamento app → proxy → Apps Script → Google Sheet sta funzionando.

---

## 8. Configura Vercel in produzione

Nel dashboard Vercel del progetto aggiungi questa variabile d'ambiente:

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec
```

Poi fai un nuovo deploy.

Se usi CLI:

```bash
vercel
vercel --prod
```

---

## 9. Test rapido dell'API senza frontend

Puoi provare l'endpoint Apps Script direttamente nel browser:

```text
https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec?action=login&email=manager@azienda.com&pin=0000
```

Se funziona, riceverai un JSON simile a:

```json
{
  "success": true,
  "user": {
    "id": "MGR001",
    "email": "manager@azienda.com",
    "ruolo": "MANAGER",
    "nome": "Manager",
    "isManager": true
  },
  "token": "..."
}
```

Poi puoi testare un endpoint protetto usando il token ricevuto:

```text
https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec?action=getUsers&token=INCOLLA_TOKEN_QUI
```

---

## 10. Problemi comuni

| Problema | Causa probabile | Soluzione |
| --- | --- | --- |
| `Sessione scaduta. Effettua il login.` | Token assente o scaduto | Rifai login e controlla che il deploy Vercel abbia `APPS_SCRIPT_URL` corretto |
| `Azione non valida` | URL o parametro `action` errato | Controlla che l'URL finisca con `/exec` e che ci sia `?action=...` |
| Login fallito | Dati non inizializzati o PIN cambiato | Esegui `initTutto` e prova `manager@azienda.com` / `0000` |
| Schermata errore nel frontend | Apps Script non raggiungibile | Testa prima l'URL diretto nel browser |
| Modifiche Apps Script non visibili | Deploy non aggiornato | In Apps Script crea una nuova distribuzione o modifica quella esistente con nuova versione |
| `Foglio non trovato: undefined` | Hai eseguito una funzione sbagliata, di solito `getSheet`, invece della funzione di setup | Seleziona ed esegui `formattaFoglioReperibilitaArea4` per formattare il foglio, oppure `initTutto` dopo aver incollato lo script completo |

---

## 11. File utili nel repository

| File | Quando usarlo |
| --- | --- |
| `apps-script/01_FORMATTA_FOGLIO.gs` | Primo script da incollare per creare e formattare il Google Sheet |
| `apps-script/Code.gs.COMPLETO.js` | Copia/incolla unico consigliato dentro Apps Script |
| `apps-script/modules/*.gs` + `apps-script/Code.gs` | Variante modulare se vuoi gestire i file separati manualmente |
| `SETUP-RAPIDO.md` | Guida sintetica |
| `README.md` | Descrizione generale del progetto |
