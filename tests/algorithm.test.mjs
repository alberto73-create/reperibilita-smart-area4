import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync('apps-script/modules/Algoritmo.gs', 'utf8')
const context = {
  console,
  parseLocalDateForCalendar(value) {
    const [year, month, day] = String(value).split('-').map(Number)
    return new Date(year, month - 1, day)
  },
}
vm.createContext(context)
vm.runInContext(source, context)

test('i punti reali considerano solo i turni precedenti dello stesso mese', () => {
  const turns = [
    { data: '2026-07-26', idTecnico: 'USR1', statoTurno: 'ASSEGNATO', puntiAssegnati: 9 },
    { data: '2026-08-02', idTecnico: 'USR1', statoTurno: 'ASSEGNATO', puntiAssegnati: 2 },
    { data: '2026-08-08', idTecnico: 'USR1', statoTurno: 'ASSEGNATO', puntiAssegnati: 1 },
    { data: '2026-08-16', idTecnico: 'USR1', statoTurno: 'ASSEGNATO', puntiAssegnati: 3 },
  ]
  const points = context.getSmartRealPointsForTurn('USR1', new Date(2026, 7, 15), turns)
  assert.equal(points, 3)
})

test('il calcolo automatico rifiuta utenti non manager', () => {
  context.Anagrafica_isManagerUser = () => false
  const result = context.Algoritmo_calculateTurniAutomaticiInternal('USR1')
  assert.equal(result.success, false)
  assert.match(result.error, /manager/)
})

test('il riallineamento punti rifiuta utenti non manager', () => {
  context.Anagrafica_isManagerUser = () => false
  const result = context.Algoritmo_updatePointsInternal('USR1')
  assert.equal(result.success, false)
  assert.match(result.error, /manager/)
})
