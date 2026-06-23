import type { Turn } from './types'

const pad2 = (value: number) => String(value).padStart(2, '0')
const formatLocalDate = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

export function buildMonthCsv(currentMonth: Date, turns: Turn[]) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const lines: string[] = []
  lines.push(['AREA 4', '', '', 'MODULO RACCOLTA DATI TURNI/REPERIBILITÀ'].map(csvCell).join(';'))
  lines.push(['Data:', new Date().toLocaleDateString('it-IT')].map(csvCell).join(';'))
  lines.push(['Tipo di servizio:', 'Reperibilità Sabato-Domenica-Festivi sistemi TVM1/TVM2 NTV'].map(csvCell).join(';'))
  lines.push(['Data', 'Ora inizio', 'Ora fine', 'Nominativo 1° reperibile', 'Nominativo 2° reperibile'].map(csvCell).join(';'))

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day)
    const dateStr = formatLocalDate(date)
    const displayDate = `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)} ${date.toLocaleDateString('en-US', { weekday: 'short' })}`
    const turn = turns.find(t => t.data === dateStr && t.statoTurno === 'ASSEGNATO' && t.tecnicoAssegnato)
    lines.push([displayDate, '08:00', '20:00', turn?.tecnicoAssegnato || '', ''].map(csvCell).join(';'))
  }

  lines.push(['NOTE:', ''].map(csvCell).join(';'))
  lines.push(['Responsabile di servizio:', 'Marco Lucchesi'].map(csvCell).join(';'))
  lines.push(['Responsabile Field Operation:', 'Luigi Rossi'].map(csvCell).join(';'))
  return '\ufeff' + lines.join('\r\n')
}
