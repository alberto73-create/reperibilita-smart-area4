import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const context = {}
vm.createContext(context)
vm.runInContext(readFileSync('apps-script/Code.gs', 'utf8'), context)

test('un tecnico riceve solo le proprie preferenze', () => {
  context.Anagrafica_isManagerUser = () => false
  context.Preferenze_getPreferencesInternal = () => ({
    success: true,
    preferences: [{ idTecnico: 'USR1' }, { idTecnico: 'USR2' }],
  })
  const result = context.Preferenze_getPreferences('USR1')
  assert.deepEqual(result.preferences.map(pref => pref.idTecnico), ['USR1'])
})

test('i dati personali e i punteggi altrui sono nascosti ai tecnici', () => {
  context.Anagrafica_isManagerUser = () => false
  context.Anagrafica_getUsersInternal = () => ({
    success: true,
    users: [
      { id: 'USR1', nome: 'Ada', cognome: 'Uno', email: 'ada@example.test', stato: 'ON', punti: 2, ultimoTurno: '2026-08-01', dataAssunzione: '2020-01-01', note: 'x' },
      { id: 'USR2', nome: 'Berto', cognome: 'Due', email: 'berto@example.test', stato: 'ON', punti: 9, ultimoTurno: '2026-08-02', dataAssunzione: '2020-01-02', note: 'y' },
    ],
  })
  const result = context.Anagrafica_getUsers('USR1')
  assert.equal(result.users[0].punti, 2)
  assert.equal(result.users[1].punti, 0)
  assert.equal(result.users[1].email, '')
  assert.equal(result.users[1].note, '')
})

test('il log operativo è riservato ai manager', () => {
  context.Anagrafica_isManagerUser = () => false
  assert.equal(context.Log_getLog('USR1').success, false)
})
