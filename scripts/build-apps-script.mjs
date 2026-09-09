import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'

const sources = [
  'apps-script/modules/Helpers.gs',
  'apps-script/modules/Auth.gs',
  'apps-script/modules/Anagrafica.gs',
  'apps-script/modules/Calendario.gs',
  'apps-script/modules/Preferenze.gs',
  'apps-script/modules/Log.gs',
  'apps-script/modules/Algoritmo.gs',
  'apps-script/modules/Configurazione.gs',
  'apps-script/Code.gs',
]
const outputPath = 'apps-script/Code.gs.COMPLETO.js'
const banner = `/**
 * REPERIBILITÀ SMART - AREA 4
 * Codice completo per Google Apps Script.
 * Generato automaticamente: modifica i file modulari e usa npm run build:apps-script.
 */\n`

const sections = await Promise.all(sources.map(async path => {
  const content = (await readFile(path, 'utf8')).trim()
  return `\n// ============================================================================\n// ${path.toUpperCase()}\n// ============================================================================\n\n${content}\n`
}))
const expected = banner + sections.join('')

if (process.argv.includes('--check')) {
  const current = await readFile(outputPath, 'utf8').catch(() => '')
  if (current !== expected) {
    console.error(`${outputPath} non è sincronizzato. Esegui npm run build:apps-script.`)
    process.exitCode = 1
  }
} else {
  await writeFile(outputPath, expected)
  console.log(`Generato ${outputPath} da ${sources.length} file sorgente.`)
}
