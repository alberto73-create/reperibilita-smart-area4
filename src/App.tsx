import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import './prefs-bulk.css'
import type { User, Turn, Preference, Holiday, LogEntry, Stats } from './types'
import {
  login as apiLogin,
  getUsers, getTurns, getPreferences, getLog, getStats, getHolidays,
  addUser, updateUser, setUserStatus, addTurn, deleteTurn, setPreference, setPreferencesBatch, clearPreferencesForUser,
  calculateTurniAutomatici, updatePoints, changePin, resetPin
} from '../lib/api'

type PreferenceColor = 'VERDE' | 'BIANCO' | 'GIALLO' | 'ROSSO'
type PendingPreferences = Record<string, PreferenceColor>
type ActiveTab = 'calendar' | 'users' | 'turns' | 'preferences' | 'manager' | 'log'

type CurrentUser = {
  id: string
  email: string
  ruolo: string
  nome: string
  isManager: boolean
}

type CachedAppData = {
  users: User[]
  turns: Turn[]
  preferences: Preference[]
  holidays: Holiday[]
  stats: Stats | null
  savedAt: string
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const formatLocalDate = (date: Date) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const monthDiffFromToday = (date: Date) => {
  const today = new Date()
  return (date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth()
}

const addMonths = (base: Date, months: number) => {
  return new Date(base.getFullYear(), base.getMonth() + months, 1)
}

const getDefaultMonthForUser = (user?: CurrentUser | null) => {
  const today = new Date()
  if (user?.isManager) return new Date(today.getFullYear(), today.getMonth(), 1)
  return addMonths(today, today.getDate() <= 15 ? 1 : 2)
}

const cacheKeyForUser = (userId: string) => `reperibilita_cache_${userId}`
const draftKeyForUser = (userId: string) => `reperibilita_preference_drafts_${userId}`

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar')
  const [users, setUsers] = useState<User[]>([])
  const [turns, setTurns] = useState<Turn[]>([])
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastCacheAt, setLastCacheAt] = useState<string>('')

  const [currentMonth, setCurrentMonth] = useState(getDefaultMonthForUser(null))

  const [showUserModal, setShowUserModal] = useState(false)
  const [showTurnModal, setShowTurnModal] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [showPreferenceModal, setShowPreferenceModal] = useState(false)

  const [newUser, setNewUser] = useState({ nome: '', cognome: '', email: '' })
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [bulkTurnDates, setBulkTurnDates] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [turnNotes, setTurnNotes] = useState('')
  const [selectedPreference, setSelectedPreference] = useState<PreferenceColor>('BIANCO')
  const [pendingPreferences, setPendingPreferences] = useState<PendingPreferences>({})
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [pinToChange, setPinToChange] = useState({ userId: '', newPin: '' })

  const activeUsers = useMemo(() => users.filter(u => u.stato === 'ON'), [users])
  const assignedTurns = useMemo(
    () => turns
      .filter(t => t.statoTurno === 'ASSEGNATO')
      .sort((a, b) => parseLocalDate(a.data).getTime() - parseLocalDate(b.data).getTime()),
    [turns]
  )

  const selectedTurnDatesSet = useMemo(() => new Set(bulkTurnDates), [bulkTurnDates])
  const allAssignedTurnsSelected = assignedTurns.length > 0 && assignedTurns.every(turn => selectedTurnDatesSet.has(turn.data))
  const selectedAssignedTurnCount = assignedTurns.filter(turn => selectedTurnDatesSet.has(turn.data)).length
  const turnBalance = useMemo(() => {
    const byUser = new Map<string, { nome: string; turni: number; punti: number }>()

    users.forEach(user => {
      byUser.set(user.id, {
        nome: `${user.nome} ${user.cognome}`,
        turni: 0,
        punti: 0
      })
    })

    assignedTurns.forEach(turn => {
      if (!turn.idTecnico) return
      const current = byUser.get(turn.idTecnico) || {
        nome: turn.tecnicoAssegnato || turn.idTecnico,
        turni: 0,
        punti: 0
      }
      current.turni += 1
      current.punti += Number(turn.puntiAssegnati) || 0
      byUser.set(turn.idTecnico, current)
    })

    return Array.from(byUser.entries())
      .map(([id, value]) => ({ id, ...value }))
      .filter(item => item.turni > 0 || users.some(user => user.id === item.id && user.stato === 'ON'))
      .sort((a, b) => b.punti - a.punti || b.turni - a.turni || a.nome.localeCompare(b.nome))
  }, [assignedTurns, users])

  const balancePoints = turnBalance.map(item => item.punti)
  const balanceGap = balancePoints.length > 1 ? Math.max(...balancePoints) - Math.min(...balancePoints) : 0

  const persistPendingPreferences = (userId: string, next: PendingPreferences) => {
    setPendingPreferences(next)
    localStorage.setItem(draftKeyForUser(userId), JSON.stringify(next))
  }

  const hydrateCachedData = useCallback((userId: string) => {
    const cachedRaw = localStorage.getItem(cacheKeyForUser(userId))
    if (!cachedRaw) return false

    try {
      const cached = JSON.parse(cachedRaw) as CachedAppData
      setUsers(cached.users || [])
      setTurns(cached.turns || [])
      setPreferences(cached.preferences || [])
      setHolidays(cached.holidays || [])
      setStats(cached.stats || null)
      setLastCacheAt(cached.savedAt || '')
      setError(null)
      setLoading(false)
      return true
    } catch {
      localStorage.removeItem(cacheKeyForUser(userId))
      return false
    }
  }, [])

  const hydrateDraftPreferences = (userId: string) => {
    const draftRaw = localStorage.getItem(draftKeyForUser(userId))
    if (!draftRaw) {
      setPendingPreferences({})
      return
    }

    try {
      setPendingPreferences(JSON.parse(draftRaw))
    } catch {
      localStorage.removeItem(draftKeyForUser(userId))
      setPendingPreferences({})
    }
  }

  const loadData = useCallback(async (userIdForCache?: string) => {
    const cacheUserId = userIdForCache || currentUser?.id
    try {
      setLoading(true)
      const [usersData, turnsData, preferencesData, holidaysData, statsData] = await Promise.all([
        getUsers(),
        getTurns(),
        getPreferences(),
        getHolidays(),
        getStats()
      ])

      setUsers(usersData)
      setTurns(turnsData)
      setPreferences(preferencesData)
      setHolidays(holidaysData)
      setStats(statsData)
      setError(null)

      if (cacheUserId) {
        const savedAt = new Date().toISOString()
        const cacheData: CachedAppData = {
          users: usersData,
          turns: turnsData,
          preferences: preferencesData,
          holidays: holidaysData,
          stats: statsData,
          savedAt
        }
        localStorage.setItem(cacheKeyForUser(cacheUserId), JSON.stringify(cacheData))
        setLastCacheAt(savedAt)
      }
    } catch (err) {
      if (cacheUserId && hydrateCachedData(cacheUserId)) {
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento')
      }
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id, hydrateCachedData])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError('')

    try {
      const result = await apiLogin(loginEmail, loginPin)

      if (result.success && result.user) {
        const user = result.user as CurrentUser
        setIsAuthenticated(true)
        setCurrentUser(user)
        setCurrentMonth(getDefaultMonthForUser(user))
        localStorage.setItem('auth_token', result.token || '')
        localStorage.setItem('current_user', JSON.stringify(user))
        hydrateCachedData(user.id)
        hydrateDraftPreferences(user.id)
        loadData(user.id)
      } else {
        setLoginError(result.error || 'Login fallito')
      }
    } catch {
      setLoginError('Errore di connessione')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    setPendingPreferences({})
    localStorage.removeItem('auth_token')
    localStorage.removeItem('current_user')
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('current_user')

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser) as CurrentUser
      setCurrentUser(parsedUser)
      setIsAuthenticated(true)
      setCurrentMonth(getDefaultMonthForUser(parsedUser))
      hydrateCachedData(parsedUser.id)
      hydrateDraftPreferences(parsedUser.id)
      loadData(parsedUser.id)
    } else {
      setLoading(false)
    }
  }, [hydrateCachedData, loadData])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    let startingDay = firstDay.getDay()
    startingDay = startingDay === 0 ? 6 : startingDay - 1

    const monthDays: (Date | null)[] = []
    for (let i = 0; i < startingDay; i++) monthDays.push(null)
    for (let day = 1; day <= lastDay.getDate(); day++) {
      monthDays.push(new Date(year, month, day))
    }
    return monthDays
  }

  const isAssignedTurn = (turn: Turn | undefined) => {
    return Boolean(turn && turn.statoTurno === 'ASSEGNATO' && turn.tecnicoAssegnato)
  }

  const getTurnForDate = (date: Date) => {
    const dateStr = formatLocalDate(date)
    return turns.find(t => t.data === dateStr && isAssignedTurn(t))
  }

  const isHoliday = (date: Date): string | null => {
    const dateStr = formatLocalDate(date)
    const holiday = holidays.find(h => h.data === dateStr)
    return holiday ? holiday.nome : null
  }

  const isPreferenceDay = (date: Date) => {
    return date.getDay() === 0 || date.getDay() === 6 || Boolean(isHoliday(date))
  }

  const getPreferencePolicy = (date: Date) => {
    if (currentUser?.isManager) {
      return { visible: true, editable: true, reason: 'Manager: modifica sempre consentita' }
    }

    const diff = monthDiffFromToday(date)
    const today = new Date()

    if (diff < 1 || diff > 2) {
      return {
        visible: false,
        editable: false,
        reason: 'Gli utenti possono gestire solo i prossimi 2 mesi.'
      }
    }

    if (diff === 1 && today.getDate() > 15) {
      return {
        visible: true,
        editable: false,
        reason: 'Mese congelato: le preferenze si chiudono il 15 del mese precedente.'
      }
    }

    return { visible: true, editable: true, reason: 'Preferenza modificabile.' }
  }

  const getPreferenceForDate = (date: Date | null): string | null => {
    if (!date) return null
    const dateStr = formatLocalDate(date)

    if (Object.prototype.hasOwnProperty.call(pendingPreferences, dateStr)) {
      return pendingPreferences[dateStr]
    }

    const pref = preferences.find(p => p.idTecnico === currentUser?.id && p.data === dateStr)
    return pref ? pref.preferenza : null
  }

  const getTipoGiornoForDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr)
    if (isHoliday(date)) return 'FESTIVO'
    if (date.getDay() === 0) return 'DOMENICA'
    if (date.getDay() === 6) return 'SABATO'
    return 'FERIALE'
  }

  const getPointsForDate = (dateStr: string) => {
    const tipo = getTipoGiornoForDate(dateStr)
    if (tipo === 'FESTIVO') return 3
    if (tipo === 'DOMENICA') return 2
    return 1
  }

  const canNavigateMonth = (delta: number) => {
    if (currentUser?.isManager) return true
    const nextMonth = addMonths(currentMonth, delta)
    const diff = monthDiffFromToday(nextMonth)
    return diff >= 0 && diff <= 2
  }

  const navigateMonth = (delta: number) => {
    if (!canNavigateMonth(delta)) return
    setCurrentMonth(addMonths(currentMonth, delta))
  }

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentUser?.isManager) return
    try {
      await addUser({ ...newUser, stato: 'ON', dataAssunzione: '', note: '' })
      setNewUser({ nome: '', cognome: '', email: '' })
      setShowUserModal(false)
      loadData()
    } catch (err) {
      alert('Errore nell\'aggiunta utente: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    if (!currentUser?.isManager) return
    if (!confirm(`Cambiare stato a ${user.nome} da ${user.stato} a ${user.stato === 'ON' ? 'OFF' : 'ON'}?`)) return
    try {
      await setUserStatus(user.id, user.stato === 'ON' ? 'OFF' : 'ON', 'Cambio manuale')
      loadData()
    } catch (err) {
      alert('Errore: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    }
  }

  const handleManualUserPoints = async (user: User) => {
    if (!currentUser?.isManager) return
    const value = prompt(`Imposta punteggio totale per ${user.nome} ${user.cognome}`, String(user.punti ?? 0))
    if (value === null) return

    const points = Number(value.replace(',', '.'))
    if (!Number.isFinite(points) || points < 0) {
      alert('Inserisci un punteggio valido.')
      return
    }

    try {
      await updateUser({ id: user.id, punti: points })
      await loadData()
      alert('Punteggio aggiornato.')
    } catch (err) {
      alert('Errore aggiornamento punti: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    }
  }

  const handleOpenTurnModal = (date: Date) => {
    if (!currentUser?.isManager) return
    const firstUser = activeUsers[0] || users[0]
    setSelectedDate(formatLocalDate(date))
    setBulkTurnDates([])
    setSelectedUser(firstUser?.id || '')
    setTurnNotes('Forzatura manuale manager')
    setShowTurnModal(true)
  }

  const handleOpenBulkTurnModal = () => {
    if (!currentUser?.isManager || bulkTurnDates.length === 0) return
    const firstUser = activeUsers[0] || users[0]
    setSelectedDate(bulkTurnDates[0] || '')
    setSelectedUser(firstUser?.id || '')
    setTurnNotes('Forzatura multipla manager')
    setShowTurnModal(true)
  }

  const handleAddTurn = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentUser?.isManager) return

    try {
      const user = users.find(u => u.id === selectedUser)
      if (!user) {
        alert('Seleziona un utente.')
        return
      }

      const datesToForce = bulkTurnDates.length > 0 ? bulkTurnDates : [selectedDate]

      for (const data of datesToForce) {
        const tipoGiorno = getTipoGiornoForDate(data)
        const punti = getPointsForDate(data)

        await addTurn({
          data,
          idTecnico: user.id,
          tecnicoNome: `${user.nome} ${user.cognome}`,
          tipoGiorno,
          punti,
          note: turnNotes || (datesToForce.length > 1 ? 'Forzatura multipla manager' : 'Forzatura manuale manager')
        })
      }

      setShowTurnModal(false)
      setSelectedDate('')
      setBulkTurnDates([])
      setSelectedUser('')
      setTurnNotes('')
      await loadData()
      alert(datesToForce.length > 1 ? `${datesToForce.length} turni forzati manualmente.` : 'Turno forzato manualmente.')
    } catch (err) {
      alert('Errore forzatura turno: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    }
  }

  const handleDeleteTurn = async (data: string) => {
    if (!currentUser?.isManager) return
    if (!confirm('Eliminare questo turno?')) return
    try {
      await deleteTurn(data)
      await loadData()
    } catch (err) {
      alert('Errore: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    }
  }

  const handleToggleTurnSelection = (data: string) => {
    setBulkTurnDates(prev => prev.includes(data) ? prev.filter(item => item !== data) : [...prev, data])
  }

  const handleToggleAllTurns = () => {
    setBulkTurnDates(allAssignedTurnsSelected ? [] : assignedTurns.map(turn => turn.data))
  }

  const handleDeleteSelectedTurns = async () => {
    if (!currentUser?.isManager || bulkTurnDates.length === 0) return
    if (!confirm(`Eliminare ${bulkTurnDates.length} turni selezionati?`)) return

    try {
      for (const data of bulkTurnDates) {
        await deleteTurn(data)
      }
      setBulkTurnDates([])
      await loadData()
      alert('Turni selezionati eliminati.')
    } catch (err) {
      alert('Errore eliminazione multipla: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    }
  }

  const handleOpenPreferenceModal = (date: Date) => {
    const policy = getPreferencePolicy(date)

    if (!isPreferenceDay(date)) {
      alert('Le preferenze si impostano solo su sabati, domeniche e festivi.')
      return
    }

    if (!policy.editable) {
      alert(policy.reason)
      return
    }

    const dateStr = formatLocalDate(date)
    const existingPref = getPreferenceForDate(date)
    setSelectedDate(dateStr)
    setSelectedPreference((existingPref as PreferenceColor) || 'BIANCO')
    setShowPreferenceModal(true)
  }

  const handleSetPreference = async () => {
    if (!selectedDate || !currentUser?.id) return

    const policy = getPreferencePolicy(parseLocalDate(selectedDate))
    if (!policy.editable) {
      alert(policy.reason)
      return
    }

    const next = {
      ...pendingPreferences,
      [selectedDate]: selectedPreference
    }
    persistPendingPreferences(currentUser.id, next)
    setShowPreferenceModal(false)
  }

  const handleSaveAllPreferences = async () => {
    if (!currentUser?.id) return
    const entries = Object.entries(pendingPreferences)
    if (entries.length === 0) {
      alert('Non ci sono modifiche da salvare.')
      return
    }

    const blocked = entries.filter(([data]) => !getPreferencePolicy(parseLocalDate(data)).editable)
    if (blocked.length > 0) {
      alert('Ci sono modifiche fuori finestra o bloccate. Annullale e reinserisci solo preferenze valide.')
      return
    }

    if (!confirm(`Vuoi salvare ${entries.length} preferenze in un unico passaggio?`)) return

    const payload = entries.map(([data, preferenza]) => ({
      idTecnico: currentUser.id,
      nomeTecnico: currentUser.nome,
      data,
      preferenza
    }))

    setSavingPreferences(true)
    try {
      try {
        await setPreferencesBatch(payload)
      } catch {
        for (const preference of payload) {
          await setPreference(preference)
        }
      }

      localStorage.removeItem(draftKeyForUser(currentUser.id))
      setPendingPreferences({})
      await loadData(currentUser.id)
      alert('Preferenze salvate.')
    } catch (err) {
      alert('Errore nel salvataggio preferenze: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    } finally {
      setSavingPreferences(false)
    }
  }

  const handleDiscardLocalPreferences = () => {
    if (!currentUser?.id) return
    if (!confirm('Vuoi annullare le modifiche locali non ancora salvate?')) return
    localStorage.removeItem(draftKeyForUser(currentUser.id))
    setPendingPreferences({})
  }

  const handleClearAllPreferences = async () => {
    if (!currentUser?.id) return
    if (!confirm('Vuoi cancellare tutte le tue preferenze salvate? Operazione non reversibile.')) return

    setSavingPreferences(true)
    try {
      await clearPreferencesForUser(currentUser.id)
      localStorage.removeItem(draftKeyForUser(currentUser.id))
      setPendingPreferences({})
      await loadData(currentUser.id)
      alert('Tutte le preferenze sono state cancellate.')
    } catch (err) {
      alert('Errore nella cancellazione preferenze: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    } finally {
      setSavingPreferences(false)
    }
  }

  const handleCalculateTurns = async () => {
    if (!confirm('Avviare calcolo automatico per i mesi generati?')) return
    try {
      const result = await calculateTurniAutomatici()
      alert(`Calcolo completato!\nAssegnazioni: ${result.assegnazioni}\nAnomalie: ${result.anomalie.length}`)
      loadData()
    } catch (err) {
      alert('Errore: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    }
  }

  const handleUpdatePoints = async () => {
    if (!confirm('Ricalcolare i punti dai turni assegnati?')) return
    try {
      await updatePoints()
      alert('Punti aggiornati!')
      loadData()
    } catch (err) {
      alert('Errore: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    }
  }

  const handleChangePin = async () => {
    if (!pinToChange.userId || !pinToChange.newPin) return
    if (!/^\d{4}$/.test(pinToChange.newPin)) {
      alert('Il PIN deve essere di 4 cifre')
      return
    }
    try {
      await changePin(pinToChange.userId, pinToChange.newPin)
      alert('PIN aggiornato!')
      setShowPinModal(false)
      setPinToChange({ userId: '', newPin: '' })
    } catch (err) {
      alert('Errore: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    }
  }

  const handleResetPin = async (userId: string) => {
    if (!userId) {
      alert('Seleziona un utente.')
      return
    }
    if (!confirm('Resettare il PIN di questo utente?')) return
    try {
      const result = await resetPin(userId)
      alert(`PIN resettato a: ${result.newPin}`)
    } catch (err) {
      alert('Errore: ' + (err instanceof Error ? err.message : 'errore sconosciuto'))
    }
  }

  const days = getDaysInMonth(currentMonth)
  const monthName = currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const pendingPreferenceCount = Object.keys(pendingPreferences).length
  const monthDiff = monthDiffFromToday(currentMonth)

  const preferenceDays = days
    .filter((day): day is Date => Boolean(day))
    .filter(day => isPreferenceDay(day))
    .filter(day => currentUser?.isManager || getPreferencePolicy(day).visible)

  const BulkActions = () => (
    <div className="calendar-bulk-actions">
      <div className="bulk-info">
        {pendingPreferenceCount > 0 ? `${pendingPreferenceCount} modifiche locali da salvare` : 'Nessuna modifica locale in sospeso'}
      </div>
      <div className="bulk-buttons">
        {pendingPreferenceCount > 0 && (
          <button className="secondary-action" disabled={savingPreferences} onClick={handleDiscardLocalPreferences}>↩️ Annulla modifiche</button>
        )}
        <button className="danger-action" disabled={savingPreferences} onClick={handleClearAllPreferences}>🗑️ Cancella tutte le preferenze</button>
        <button className="success-action" disabled={savingPreferences || pendingPreferenceCount === 0} onClick={handleSaveAllPreferences}>✅ Salva tutte le preferenze</button>
      </div>
    </div>
  )

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-box">
            <h1>📅 Reperibilità Smart</h1>
            <h2>Area 4</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email Aziendale</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="nome@azienda.com" required />
              </div>
              <div className="form-group">
                <label>PIN (4 cifre)</label>
                <input type="password" maxLength={4} value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="****" required />
              </div>
              {loginError && <p className="error-text">{loginError}</p>}
              <button type="submit" className="login-btn" disabled={isLoading}>{isLoading ? 'Accesso...' : 'Accedi'}</button>
            </form>
            <div className="login-hints">
              <p><strong>Manager:</strong> manager@azienda.com / PIN: 0000</p>
              <p><strong>Utente:</strong> mario.rossi@azienda.com / PIN: 1234</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading && users.length === 0 && turns.length === 0) {
    return <div className="app"><div className="loading">Caricamento...</div></div>
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Errore</h2>
          <p>{error}</p>
          <button onClick={() => loadData()}>Riprova</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>📅 Reperibilità Smart - Area 4</h1>
          <div className="header-actions">
            <span className="user-info">👤 {currentUser?.nome} ({currentUser?.isManager ? 'Manager' : 'Utente'})</span>
            <button onClick={handleLogout} className="logout-btn">Esci</button>
          </div>
        </div>
        <nav className="nav">
          <button className={activeTab === 'calendar' ? 'active' : ''} onClick={() => setActiveTab('calendar')}>📅 Calendario</button>
          <button className={activeTab === 'preferences' ? 'active' : ''} onClick={() => setActiveTab('preferences')}>🎨 Preferenze</button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>👥 Utenti</button>
          <button className={activeTab === 'turns' ? 'active' : ''} onClick={() => setActiveTab('turns')}>📋 Turni</button>
          {currentUser?.isManager && (
            <>
              <button className={activeTab === 'manager' ? 'active' : ''} onClick={() => setActiveTab('manager')}>⚙️ Manager</button>
              <button className={activeTab === 'log' ? 'active' : ''} onClick={() => setActiveTab('log')}>📝 Log IA</button>
            </>
          )}
        </nav>
      </header>

      <main className="main">
        {activeTab === 'calendar' && (
          <div className="calendar-view">
            {!currentUser?.isManager && (
              <p className="window-note">
                Utente base: calendario limitato a mese corrente + 2 mesi. Le preferenze del mese successivo si congelano dopo il giorno 15.
              </p>
            )}
            <div className="calendar-header">
              <button onClick={() => navigateMonth(-1)} disabled={!canNavigateMonth(-1)}>←</button>
              <h2>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h2>
              <button onClick={() => navigateMonth(1)} disabled={!canNavigateMonth(1)}>→</button>
            </div>
            <div className="calendar-legend">
              <span className="legend-item"><span className="legend-color verde"></span> Verde</span>
              <span className="legend-item"><span className="legend-color bianco"></span> Bianco</span>
              <span className="legend-item"><span className="legend-color giallo"></span> Giallo</span>
              <span className="legend-item"><span className="legend-color rosso"></span> Rosso</span>
            </div>
            {lastCacheAt && <p className="cache-note">Cache locale attiva · ultimo aggiornamento {new Date(lastCacheAt).toLocaleString('it-IT')}</p>}
            {!currentUser?.isManager && monthDiff === 1 && new Date().getDate() > 15 && (
              <p className="lock-note">🔒 Questo mese è congelato per gli utenti base. Il manager può ancora forzare i turni.</p>
            )}
            <div className="calendar-grid">
              <div className="calendar-weekdays">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => <div key={day} className="weekday">{day}</div>)}
              </div>
              <div className="calendar-days">
                {days.map((day, index) => {
                  if (!day) return <div key={index} className="calendar-day empty"></div>
                  const turn = getTurnForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const holidayName = isHoliday(day)
                  const pref = getPreferenceForDate(day)
                  const dateStr = formatLocalDate(day)
                  const hasPending = Object.prototype.hasOwnProperty.call(pendingPreferences, dateStr)
                  const isRelevantDay = isPreferenceDay(day)
                  const policy = getPreferencePolicy(day)
                  const canEditPreference = isRelevantDay && policy.editable && !turn
                  const locked = isRelevantDay && policy.visible && !policy.editable && !currentUser?.isManager

                  return (
                    <div
                      key={index}
                      className={`calendar-day ${isToday ? 'today' : ''} ${turn ? 'has-turn' : ''} ${holidayName ? 'holiday' : ''} ${pref ? `pref-${pref.toLowerCase()}` : ''} ${hasPending ? 'pending-pref' : ''} ${locked ? 'locked-day' : ''}`}
                      onDoubleClick={() => {
                        if (currentUser?.isManager && isRelevantDay) handleOpenTurnModal(day)
                        else if (canEditPreference) handleOpenPreferenceModal(day)
                      }}
                    >
                      <div className="day-header">
                        <span className="day-number">{day.getDate()}</span>
                        <div className="day-badges">
                          {locked && <span className="lock-badge" title={policy.reason}>🔒</span>}
                          {hasPending && <span className="pending-badge" title="Modifica non ancora salvata">●</span>}
                          {holidayName && <span className="holiday-badge" title={holidayName}>🎉</span>}
                        </div>
                      </div>
                      {turn && <div className="turn-badge">{turn.tecnicoAssegnato}</div>}
                      {currentUser?.isManager && isRelevantDay ? (
                        <button className="force-turn-btn" onClick={(e) => { e.stopPropagation(); handleOpenTurnModal(day) }}>{turn ? '✎' : '↯'}</button>
                      ) : canEditPreference ? (
                        <button className="add-preference-btn" onClick={(e) => { e.stopPropagation(); handleOpenPreferenceModal(day) }}>+</button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
            <BulkActions />
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="preferences-view">
            <h2>🎨 Le Tue Preferenze</h2>
            <p className="info-text">
              Gli utenti base compilano solo i prossimi 2 mesi. Dopo il 15 si blocca il mese successivo e resta modificabile quello dopo.
            </p>
            <div className="calendar-header mini-month-header">
              <button onClick={() => navigateMonth(-1)} disabled={!canNavigateMonth(-1)}>←</button>
              <h2>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h2>
              <button onClick={() => navigateMonth(1)} disabled={!canNavigateMonth(1)}>→</button>
            </div>
            {preferenceDays.length === 0 ? (
              <p className="empty-state">Nessuna preferenza disponibile in questo mese.</p>
            ) : (
              <div className="preferences-grid">
                {preferenceDays.map(day => {
                  const pref = getPreferenceForDate(day)
                  const dateStr = formatLocalDate(day)
                  const hasPending = Object.prototype.hasOwnProperty.call(pendingPreferences, dateStr)
                  const policy = getPreferencePolicy(day)
                  return (
                    <div key={dateStr} className={`preference-card ${pref ? pref.toLowerCase() : ''} ${hasPending ? 'pending-pref' : ''} ${!policy.editable ? 'locked-card' : ''}`}>
                      <div className="preference-date">{day.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                      <div className="preference-value">{pref || 'Non impostata'}{hasPending ? ' · da salvare' : ''}</div>
                      {!policy.editable && <div className="preference-lock">🔒 {policy.reason}</div>}
                      <button disabled={!policy.editable} onClick={() => handleOpenPreferenceModal(day)}>{policy.editable ? 'Modifica' : 'Bloccata'}</button>
                    </div>
                  )
                })}
              </div>
            )}
            <BulkActions />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-view">
            <div className="view-header">
              <h2>👥 Utenti</h2>
              {currentUser?.isManager && <button className="add-btn" onClick={() => setShowUserModal(true)}>+ Nuovo</button>}
            </div>
            <table className="users-table">
              <thead>
                <tr><th>Nome</th><th>Email</th><th>Stato</th><th>Punti</th><th>Ultimo Turno</th>{currentUser?.isManager && <th>Azioni</th>}</tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.nome} {user.cognome}</td>
                    <td>{user.email}</td>
                    <td><span className={`status ${user.stato.toLowerCase()}`}>{user.stato}</span></td>
                    <td>{user.punti}</td>
                    <td>{user.ultimoTurno ? parseLocalDate(user.ultimoTurno).toLocaleDateString('it-IT') : '-'}</td>
                    {currentUser?.isManager && (
                      <td>
                        <button className="toggle-btn" onClick={() => handleToggleUserStatus(user)}>{user.stato === 'ON' ? '⏸️' : '▶️'}</button>
                        <button className="pin-btn" onClick={() => { setPinToChange({ userId: user.id, newPin: '' }); setShowPinModal(true); }}>🔑</button>
                        <button className="pin-btn" onClick={() => handleManualUserPoints(user)}>✏️ Punti</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'turns' && (
          <div className="turns-view">
            <div className="view-header">
              <h2>📋 Turni</h2>
            </div>
            <div className="turn-balance-panel">
              <div>
                <strong>Bilanciamento turni</strong>
                <p>Scarto punti tra tecnico più carico e meno carico: <strong>{balanceGap}</strong>.</p>
              </div>
              <div className="turn-balance-list">
                {turnBalance.map(item => (
                  <span key={item.id} className="turn-balance-chip">
                    {item.nome}: {item.turni} turni · {item.punti} pt
                  </span>
                ))}
              </div>
            </div>
            {currentUser?.isManager && (
              <div className="turns-bulk-actions">
                <span>{selectedAssignedTurnCount} turni assegnati selezionati</span>
                <button className="secondary-action" onClick={handleToggleAllTurns}>
                  {allAssignedTurnsSelected ? 'Deseleziona tutto' : 'Seleziona tutto'}
                </button>
                <button className="success-action" disabled={selectedAssignedTurnCount === 0} onClick={handleOpenBulkTurnModal}>↯ Forza selezionati</button>
                <button className="danger-action" disabled={selectedAssignedTurnCount === 0} onClick={handleDeleteSelectedTurns}>Elimina selezionati</button>
              </div>
            )}
            <table className="turns-table">
              <thead>
                <tr>
                  {currentUser?.isManager && (
                    <th>
                      <input
                        type="checkbox"
                        checked={allAssignedTurnsSelected}
                        onChange={handleToggleAllTurns}
                        aria-label="Seleziona tutti i turni"
                      />
                    </th>
                  )}
                  <th>Data</th><th>Giorno</th><th>Tipo</th><th>Tecnico</th><th>Punti</th>{currentUser?.isManager && <th>Azioni</th>}
                </tr>
              </thead>
              <tbody>
                {assignedTurns.map(turn => (
                  <tr key={turn.data}>
                    {currentUser?.isManager && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedTurnDatesSet.has(turn.data)}
                          onChange={() => handleToggleTurnSelection(turn.data)}
                          aria-label={`Seleziona turno del ${turn.data}`}
                        />
                      </td>
                    )}
                    <td>{parseLocalDate(turn.data).toLocaleDateString('it-IT')}</td>
                    <td>{turn.giorno}</td>
                    <td><span className={`turn-type ${turn.tipoGiorno.toLowerCase()}`}>{turn.tipoGiorno}</span></td>
                    <td>{turn.tecnicoAssegnato}</td>
                    <td>{turn.puntiAssegnati}</td>
                    {currentUser?.isManager && (
                      <td>
                        <button className="toggle-btn" onClick={() => handleOpenTurnModal(parseLocalDate(turn.data))}>Forza</button>
                        <button className="delete-btn" onClick={() => handleDeleteTurn(turn.data)}>Elimina</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'manager' && currentUser?.isManager && (
          <div className="manager-view">
            <h2>⚙️ Pannello Manager</h2>
            <div className="manager-cards">
              <div className="manager-card">
                <h3>🎯 Calcolo Automatico</h3>
                <p>Assegna automaticamente i turni generati nel calendario operativo.</p>
                <button className="primary-btn" onClick={handleCalculateTurns}>Avvia Calcolo</button>
              </div>
              <div className="manager-card">
                <h3>📊 Aggiorna Punti</h3>
                <p>Ricalcola i punti dai turni assegnati e dallo storico.</p>
                <button className="primary-btn" onClick={handleUpdatePoints}>Aggiorna</button>
              </div>
              <div className="manager-card">
                <h3>↯ Forzatura Manuale</h3>
                <p>Dal calendario premi ↯ o ✎ su sabati, domeniche e festivi per scegliere il tecnico.</p>
                <button className="primary-btn" onClick={() => setActiveTab('calendar')}>Apri Calendario</button>
              </div>
              <div className="manager-card">
                <h3>✏️ Punteggi Utenti</h3>
                <p>Dalla tabella Utenti premi “Punti” per correggere manualmente il saldo di un tecnico.</p>
                <button className="primary-btn" onClick={() => setActiveTab('users')}>Apri Utenti</button>
              </div>
              <div className="manager-card">
                <h3>🔑 Gestione PIN</h3>
                <p>Modifica o resetta PIN utenti.</p>
                <button className="primary-btn" onClick={() => setShowPinModal(true)}>Gestisci PIN</button>
              </div>
            </div>
            {stats && (
              <div className="stats-box">
                <h3>📈 Statistiche</h3>
                <div className="stats-grid">
                  <div className="stat-item"><strong>{stats.totaleUtenti}</strong> Utenti Totali</div>
                  <div className="stat-item"><strong>{stats.utentiAttivi}</strong> Utenti Attivi</div>
                  <div className="stat-item"><strong>{stats.turniAssegnati}</strong> Turni Assegnati</div>
                  <div className="stat-item"><strong>{stats.turniDaCoprire}</strong> Da Coprire</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'log' && currentUser?.isManager && <LogView />}
      </main>

      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nuovo Utente</h3>
            <form onSubmit={handleAddUser}>
              <div className="form-group"><label>Nome</label><input type="text" value={newUser.nome} onChange={e => setNewUser({ ...newUser, nome: e.target.value })} required /></div>
              <div className="form-group"><label>Cognome</label><input type="text" value={newUser.cognome} onChange={e => setNewUser({ ...newUser, cognome: e.target.value })} required /></div>
              <div className="form-group"><label>Email</label><input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required /></div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowUserModal(false)}>Annulla</button>
                <button type="submit" className="primary">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTurnModal && (
        <div className="modal-overlay" onClick={() => setShowTurnModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>↯ {bulkTurnDates.length > 0 ? 'Forza Turni Selezionati' : 'Forza Turno Manuale'}</h3>
            <form onSubmit={handleAddTurn}>
              {bulkTurnDates.length > 0 ? (
                <div className="form-group">
                  <label>Turni selezionati</label>
                  <p className="bulk-selection-summary">{bulkTurnDates.length} date: {bulkTurnDates.join(', ')}</p>
                </div>
              ) : (
                <div className="form-group"><label>Data</label><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required /></div>
              )}
              <div className="form-group">
                <label>Tecnico</label>
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required>
                  <option value="">Seleziona tecnico</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome} · {u.punti} punti · {u.stato}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Note</label><input type="text" value={turnNotes} onChange={e => setTurnNotes(e.target.value)} /></div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowTurnModal(false)}>Annulla</button>
                <button type="submit" className="primary">{bulkTurnDates.length > 0 ? 'Forza turni' : 'Forza turno'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreferenceModal && (
        <div className="modal-overlay" onClick={() => setShowPreferenceModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🎨 Preferenza</h3>
            <p className="modal-date">{selectedDate ? parseLocalDate(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</p>
            <div className="preference-options">
              <button type="button" className={`pref-option verde ${selectedPreference === 'VERDE' ? 'selected' : ''}`} onClick={() => setSelectedPreference('VERDE')}>🟩 Verde</button>
              <button type="button" className={`pref-option bianco ${selectedPreference === 'BIANCO' ? 'selected' : ''}`} onClick={() => setSelectedPreference('BIANCO')}>⬜ Bianco</button>
              <button type="button" className={`pref-option giallo ${selectedPreference === 'GIALLO' ? 'selected' : ''}`} onClick={() => setSelectedPreference('GIALLO')}>🟨 Giallo</button>
              <button type="button" className={`pref-option rosso ${selectedPreference === 'ROSSO' ? 'selected' : ''}`} onClick={() => setSelectedPreference('ROSSO')}>🟥 Rosso</button>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowPreferenceModal(false)}>Annulla</button>
              <button type="button" className="primary" onClick={handleSetPreference}>Aggiungi alle modifiche</button>
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🔑 Gestione PIN</h3>
            <div className="form-group">
              <label>Utente</label>
              <select value={pinToChange.userId} onChange={e => setPinToChange({ ...pinToChange, userId: e.target.value })}>
                <option value="">Seleziona utente</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Nuovo PIN (4 cifre)</label>
              <input type="password" maxLength={4} value={pinToChange.newPin} onChange={e => setPinToChange({ ...pinToChange, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="****" />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowPinModal(false)}>Annulla</button>
              <button type="button" className="primary" onClick={handleChangePin}>Cambia PIN</button>
              <button type="button" className="danger" onClick={() => handleResetPin(pinToChange.userId)}>Reset</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer"><p>Reperibilità Smart Area 4 © 2026</p></footer>
    </div>
  )
}

function LogView() {
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLog().then(data => {
      setLog(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div>Caricamento...</div>

  return (
    <div className="log-view">
      <h2>📝 Log IA</h2>
      <table className="log-table">
        <thead>
          <tr><th>Timestamp</th><th>Azione</th><th>Data</th><th>Tecnico</th><th>Punteggio</th><th>Motivo</th></tr>
        </thead>
        <tbody>
          {log.map((entry, idx) => (
            <tr key={idx}>
              <td>{new Date(entry.timestamp).toLocaleString('it-IT')}</td>
              <td><span className="log-action">{entry.azione}</span></td>
              <td>{entry.dataTurno || '-'}</td>
              <td>{entry.nomeTecnico || '-'}</td>
              <td>{entry.punteggio}</td>
              <td>{entry.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App
