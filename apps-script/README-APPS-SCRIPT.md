# 📋 Istruzioni per Google Apps Script

## ⚠️ IMPORTANTE: Google Apps Script non supporta file multipli nativamente

Devi **copiare tutto il codice in un singolo file** `Code.gs` nell'ordine corretto.

---

## 📝 Procedura

### 1. Apri Apps Script
- Nel tuo Google Sheet: **Estensioni** → **Apps Script**

### 2. Cancella tutto
- Seleziona tutto (Ctrl+A) ed elimina

### 3. Copia i file in QUESTO ORDINE:

1. **modules/Helpers.gs** (copa per PRIMO)
2. **modules/Auth.gs**
3. **modules/Anagrafica.gs**
4. **modules/Calendario.gs**
5. **modules/Preferenze.gs**
6. **modules/Log.gs**
7. **modules/Algoritmo.gs**
8. **modules/Configurazione.gs**
9. **Code.gs** (copia per ULTIMO)

### 4. Salva
- Clicca su 💾
- Nome progetto: `Reperibilità Smart API`

### 5. Esegui initTutto
- Seleziona `initTutto` dal menu dropdown in alto
- Clicca ▶️ Esegui
- Autorizza i permessi

---

## 🔗 Ordine dei file è CRITICO!

L'ordine è importante perché:
- **Helpers.gs** definisce funzioni usate da tutti
- Gli altri moduli definiscono funzioni con suffisso `Internal`
- **Code.gs** chiama le funzioni `*Internal` dai moduli

---

## ✅ Verifica

Dopo aver copiato tutto, il file `Code.gs` finale dovrebbe avere circa **1.500+ righe**.

Per verificare che funzioni:
1. Esegui `initTutto`
2. Dovresti vedere: "✅ Inizializzazione completata!"
3. Dovresti vedere nuovi fogli creati nel tuo Google Sheet

---

## 🚀 Deploy

1. **Deploy** → **Nuova distribuzione**
2. Tipo: **App Web**
3. Esegui come: **Me**
4. Chi può accedere: **Chiunque**
5. **Deploy** → Copia URL

---

## 📁 Alternativa: Script Automatico

Se preferisci, puoi usare questo approccio:

1. Crea un file locale `concat.sh` (Linux/Mac) o `concat.bat` (Windows)
2. Esegui per concatenare automaticamente

Il file completo si rigenera in modo deterministico con:

```bash
npm run build:apps-script
```

Prima di un deploy verifica che sia sincronizzato con `npm run check:apps-script`.
