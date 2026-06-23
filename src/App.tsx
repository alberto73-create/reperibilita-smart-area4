import { useState, useEffect } from 'react'
import './App.css'
import type { User, Turn, Preference, Holiday, LogEntry, Stats } from './types'
import {
  login as apiLogin,
  getUsers, getTurns, getPreferences, getLog, getStats, getHolidays,
  addUser, setUserStatus, addTurn, deleteTurn, setPreference,
  calculateTurniAutomatici, updatePoints, changePin, resetPin
} from '../lib/api'

function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Login Form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // App State
  const [activeTab, setActiveTab] = useState<'calendar' | 'users' | 'turns' | 'preferences' | 'manager' | 'log'>('calendar')
  const [users, setUsers] = useState<User[]>([])
  const [turns, setTurns] = useState<Turn[]>([])
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Calendar
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Modals
  const [showUserModal, setShowUserModal] = useState(false)
  const [showTurnModal, setShowTurnModal] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [newUser, setNewUser] = useState({ nome: '', cognome: '', email: '' })
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [turnNotes, setTurnNotes] = useState('')
  
  // Preference
  const [showPreferenceModal, setShowPreferenceModal] = useState(false)
  const [selectedPreference, setSelectedPreference] = useState<'VERDE' | 'BIANCO' | 'GIALLO' | 'ROSSO'>('BIANCO')
  const [pinToChange, setPinToChange] = useState({ userId: '', newPin: '' })

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError('')
    
    try {
      const result = await apiLogin(loginEmail, loginPin)
      
      if (result.success) {
        setIsAuthenticated(true)
        setCurrentUser(result.user)
        localStorage.setItem('auth_token', result.token || '')
        localStorage.setItem('current_user', JSON.stringify(result.user))
        loadData()
      } else {
        setLoginError(result.error || 'Login fallito')
      }
    } catch (err) {
      setLoginError('Errore di connessione')
    } finally {
      setIsLoading(false)
    }
  }

  // Logout
  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('current_user')
  }

  // Load Data
  const loadData = async () => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }

  // Check saved session
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('current_user')
    
    if (savedToken && savedUser) {
      setCurrentUser(JSON.parse(savedUser))
      setIsAuthenticated(true)
      loadData()
    } else {
      setLoading(false)
    }
  }, [])

  // User Actions
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addUser({ ...newUser, stato: 'ON', dataAssunzione: '', note: '' })
      setNewUser({ nome: '', cognome: '', email: '' })
      setShowUserModal(false)
      loadData()
    } catch (err) {
      alert('Errore nell\'aggiunta utente')
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    if (!confirm(`Cambiare stato a ${user.nome} da ${user.stato} a ${user.stato === 'ON' ? 'OFF' : 'ON'}?`)) return
    try {
      await setUserStatus(user.id, user.stato === 'ON' ? 'OFF' : 'ON', 'Cambio manuale')
      loadData()
    } catch (err) {
      alert('Errore')
    }
  }

  // Turn Actions
  const handleAddTurn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const user = users.find(u => u.id === selectedUser)
      if (!user) return
      
      const turnoData = turns.find(t => t.data === selectedDate)
      const tipoGiorno = turnoData?.tipoGiorno || 'SABATO'
      const punti = tipoGiorno === 'FESTIVO' ? 3 : 1
      
      await addTurn({
        data: selectedDate,
        idTecnico: user.id,
        tecnicoNome: `${user.nome} ${user.cognome}`,
        tipoGiorno,
        punti,
        note: turnNotes
      })
      
      setShowTurnModal(false)
      setSelectedDate('')
      setSelectedUser('')
      setTurnNotes('')
      loadData()
    } catch (err) {
      alert('Errore')
    }
  }

  const handleDeleteTurn = async (data: string) => {
    if (!confirm('Eliminare questo turno?')) return
    try {
      await deleteTurn(data)
      loadData()
    } catch (err) {
      alert('Errore')
    }
  }

  // Preference Actions
  const handleSetPreference = async () => {
    try {
      await setPreference({
        idTecnico: currentUser.id,
        nomeTecnico: currentUser.nome,
        data: selectedDate,
        preferenza: selectedPreference
      })
      setShowPreferenceModal(false)
      loadData()
    } catch (err) {
      alert('Errore')
    }
  }

  // Manager Actions
  const handleCalculateTurns = async () => {
    if (!confirm('Avviare calcolo automatico?')) return
    try {
      const result = await calculateTurniAutomatici()
      alert(`Calcolo completato!\nAssegnazioni: ${result.assegnazioni}\nAnomalie: ${result.anomalie.length}`)
      loadData()
    } catch (err) {
      alert('Errore: ' + (err as any).message)
    }
  }

  const handleUpdatePoints = async () => {
    if (!confirm('Aggiornare i punti?')) return
    try {
      await updatePoints()
      alert('Punti aggiornati!')
      loadData()
    } catch (err) {
      alert('Errore')
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
      alert('Errore')
    }
  }

  const handleResetPin = async (userId: string) => {
    if (!confirm('Resettare il PIN di questo utente?')) return
    try {
      const result = await resetPin(userId)
      alert(`PIN resettato a: ${result.newPin}`)
    } catch (err) {
      alert('Errore')
    }
  }

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    let startingDay = firstDay.getDay()
    startingDay = startingDay === 0 ? 6 : startingDay - 1
    
    const days: (Date | null)[] = []
    for (let i = 0; i < startingDay; i++) days.push(null)
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }
    return days
  }

  const getTurnForDate = (date: Date) => turns.find(t => t.data === date.toISOString().split('T')[0])
  
  const getPreferenceForDate = (date: Date | null): string | null => {
    if (!date) return null
    const dateStr = date.toISOString().split('T')[0]
    const pref = preferences.find(p => p.idTecnico === currentUser?.id && p.data === dateStr)
    return pref ? pref.preferenza : null
  }

  const isHoliday = (date: Date): string | null => {
    const dateStr = date.toISOString().split('T')[0]
    const holiday = holidays.find(h => h.data === dateStr)
    return holiday ? holiday.nome : null
  }

  const navigateMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1))
  }

  // LOGIN SCREEN
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
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="nome@azienda.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>PIN (4 cifre)</label>
                <input
                  type="password"
                  maxLength={4}
                  value={loginPin}
                  onChange={e => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="****"
                  required
                />
              </div>
              {loginError && <p className="error-text">{loginError}</p>}
              <button type="submit" className="login-btn" disabled={isLoading}>
                {isLoading ? 'Accesso...' : 'Accedi'}
              </button>
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

  // MAIN APP
  if (loading) {
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

  const days = getDaysInMonth(currentMonth)
  const monthName = currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>📅 Reperibilità Smart - Area 4</h1>
          <div className="header-actions">
            <span className="user-info">👤 {currentUser.nome} ({currentUser.isManager ? 'Manager' : 'Utente'})</span>
            <button onClick={handleLogout} className="logout-btn">Esci</button>
          </div>
        </div>
        <nav className="nav">
          <button className={activeTab === 'calendar' ? 'active' : ''} onClick={() => setActiveTab('calendar')}>📅 Calendario</button>
          <button className={activeTab === 'preferences' ? 'active' : ''} onClick={() => setActiveTab('preferences')}>🎨 Preferenze</button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>👥 Utenti</button>
          <button className={activeTab === 'turns' ? 'active' : ''} onClick={() => setActiveTab('turns')}>📋 Turni</button>
          {currentUser.isManager && (
            <>
              <button className={activeTab === 'manager' ? 'active' : ''} onClick={() => setActiveTab('manager')}>⚙️ Manager</button>
              <button className={activeTab === 'log' ? 'active' : ''} onClick={() => setActiveTab('log')}>📝 Log IA</button>
            </>
          )}
        </nav>
      </header>

      <main className="main">
        {/* CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="calendar-view">
            <div className="calendar-header">
              <button onClick={() => navigateMonth(-1)}>←</button>
              <h2>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h2>
              <button onClick={() => navigateMonth(1)}>→</button>
            </div>
            <div className="calendar-legend">
              <span className="legend-item"><span className="legend-color verde"></span> Verde</span>
              <span className="legend-item"><span className="legend-color bianco"></span> Bianco</span>
              <span className="legend-item"><span className="legend-color giallo"></span> Giallo</span>
              <span className="legend-item"><span className="legend-color rosso"></span> Rosso</span>
            </div>
            <div className="calendar-grid">
              <div className="calendar-weekdays">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                  <div key={day} className="weekday">{day}</div>
                ))}
              </div>
              <div className="calendar-days">
                {days.map((day, index) => {
                  if (!day) return <div key={index} className="calendar-day empty"></div>
                  const turn = getTurnForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const holidayName = isHoliday(day)
                  const pref = getPreferenceForDate(day)
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  return (
                    <div
                      key={index}
                      className={`calendar-day ${isToday ? 'today' : ''} ${turn ? 'has-turn' : ''} ${holidayName ? 'holiday' : ''} ${pref ? `pref-${pref.toLowerCase()}` : ''}`}
                      onDoubleClick={() => {
                        if ((isWeekend || holidayName) && !turn) {
                          setSelectedDate(day.toISOString().split('T')[0])
                          setShowPreferenceModal(true)
                        }
                      }}
                    >
                      <div className="day-header">
                        <span className="day-number">{day.getDate()}</span>
                        {holidayName && <span className="holiday-badge" title={holidayName}>🎉</span>}
                      </div>
                      {turn ? (
                        <div className="turn-badge">{turn.tecnicoAssegnato}</div>
                      ) : (isWeekend || holidayName) ? (
                        <button className="add-preference-btn" onClick={(e) => { e.stopPropagation(); setSelectedDate(day.toISOString().split('T')[0]); setShowPreferenceModal(true); }}>+</button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="preferences-view">
            <h2>🎨 Le Tue Preferenze</h2>
            <p className="info-text">Imposta le tue preferenze per i turni</p>
            <div className="preferences-grid">
              {days.filter(d => d && (d.getDay() === 0 || d.getDay() === 6)).slice(0, 10).map((day, idx) => {
                if (!day) return null
                const pref = getPreferenceForDate(day)
                return (
                  <div key={idx} className={`preference-card ${pref ? pref.toLowerCase() : ''}`}>
                    <div className="preference-date">{day.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                    <div className="preference-value">{pref || 'Non impostata'}</div>
                    <button onClick={() => { setSelectedDate(day.toISOString().split('T')[0]); setShowPreferenceModal(true); }}>Modifica</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div className="users-view">
            <div className="view-header">
              <h2>👥 Utenti</h2>
              {currentUser.isManager && <button className="add-btn" onClick={() => setShowUserModal(true)}>+ Nuovo</button>}
            </div>
            <table className="users-table">
              <thead>
                <tr><th>Nome</th><th>Email</th><th>Stato</th><th>Punti</th><th>Ultimo Turno</th>{currentUser.isManager && <th>Azioni</th>}</tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.nome} {user.cognome}</td>
                    <td>{user.email}</td>
                    <td><span className={`status ${user.stato.toLowerCase()}`}>{user.stato}</span></td>
                    <td>{user.punti}</td>
                    <td>{user.ultimoTurno ? new Date(user.ultimoTurno).toLocaleDateString('it-IT') : '-'}</td>
                    {currentUser.isManager && (
                      <td>
                        <button className="toggle-btn" onClick={() => handleToggleUserStatus(user)}>{user.stato === 'ON' ? '⏸️' : '▶️'}</button>
                        <button className="pin-btn" onClick={() => { setPinToChange({ userId: user.id, newPin: '' }); setShowPinModal(true); }}>🔑</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TURNS */}
        {activeTab === 'turns' && (
          <div className="turns-view">
            <div className="view-header">
              <h2>📋 Turni</h2>
            </div>
            <table className="turns-table">
              <thead>
                <tr><th>Data</th><th>Giorno</th><th>Tipo</th><th>Tecnico</th><th>Punti</th>{currentUser.isManager && <th>Azioni</th>}</tr>
              </thead>
              <tbody>
                {turns.filter(t => t.statoTurno === 'ASSEGNATO').sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()).map(turn => (
                  <tr key={turn.data}>
                    <td>{new Date(turn.data).toLocaleDateString('it-IT')}</td>
                    <td>{turn.giorno}</td>
                    <td><span className={`turn-type ${turn.tipoGiorno.toLowerCase()}`}>{turn.tipoGiorno}</span></td>
                    <td>{turn.tecnicoAssegnato}</td>
                    <td>{turn.puntiAssegnati}</td>
                    {currentUser.isManager && (
                      <td><button className="delete-btn" onClick={() => handleDeleteTurn(turn.data)}>Elimina</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MANAGER */}
        {activeTab === 'manager' && currentUser.isManager && (
          <div className="manager-view">
            <h2>⚙️ Pannello Manager</h2>
            <div className="manager-cards">
              <div className="manager-card">
                <h3>🎯 Calcolo Automatico</h3>
                <p>Assegna turni automaticamente</p>
                <button className="primary-btn" onClick={handleCalculateTurns}>Avvia Calcolo</button>
              </div>
              <div className="manager-card">
                <h3>📊 Aggiorna Punti</h3>
                <p>Ricalcola tutti i punti</p>
                <button className="primary-btn" onClick={handleUpdatePoints}>Aggiorna</button>
              </div>
              <div className="manager-card">
                <h3>🔑 Gestione PIN</h3>
                <p>Modifica o resetta PIN utenti</p>
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

        {/* LOG */}
        {activeTab === 'log' && currentUser.isManager && (
          <LogView />
        )}
      </main>

      {/* MODALS */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nuovo Utente</h3>
            <form onSubmit={handleAddUser}>
              <div className="form-group"><label>Nome</label><input type="text" value={newUser.nome} onChange={e => setNewUser({...newUser, nome: e.target.value})} required /></div>
              <div className="form-group"><label>Cognome</label><input type="text" value={newUser.cognome} onChange={e => setNewUser({...newUser, cognome: e.target.value})} required /></div>
              <div className="form-group"><label>Email</label><input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required /></div>
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
            <h3>Assegna Turno</h3>
            <form onSubmit={handleAddTurn}>
              <div className="form-group"><label>Data</label><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required /></div>
              <div className="form-group"><label>Utente</label><select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required>{users.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}</select></div>
              <div className="form-group"><label>Note</label><input type="text" value={turnNotes} onChange={e => setTurnNotes(e.target.value)} /></div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowTurnModal(false)}>Annulla</button>
                <button type="submit" className="primary">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreferenceModal && (
        <div className="modal-overlay" onClick={() => setShowPreferenceModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🎨 Preferenza</h3>
            <p className="modal-date">{selectedDate ? new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</p>
            <div className="preference-options">
              <button className={`pref-option verde ${selectedPreference === 'VERDE' ? 'selected' : ''}`} onClick={() => setSelectedPreference('VERDE')}>🟩 Verde</button>
              <button className={`pref-option bianco ${selectedPreference === 'BIANCO' ? 'selected' : ''}`} onClick={() => setSelectedPreference('BIANCO')}>⬜ Bianco</button>
              <button className={`pref-option giallo ${selectedPreference === 'GIALLO' ? 'selected' : ''}`} onClick={() => setSelectedPreference('GIALLO')}>🟨 Giallo</button>
              <button className={`pref-option rosso ${selectedPreference === 'ROSSO' ? 'selected' : ''}`} onClick={() => setSelectedPreference('ROSSO')}>🟥 Rosso</button>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowPreferenceModal(false)}>Annulla</button>
              <button type="button" className="primary" onClick={handleSetPreference}>Salva</button>
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🔑 Gestione PIN</h3>
            <div className="form-group">
              <label>Nuovo PIN (4 cifre)</label>
              <input
                type="password"
                maxLength={4}
                value={pinToChange.newPin}
                onChange={e => setPinToChange({...pinToChange, newPin: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                placeholder="****"
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowPinModal(false)}>Annulla</button>
              <button type="button" className="primary" onClick={handleChangePin}>Cambia PIN</button>
              <button type="button" className="danger" onClick={() => handleResetPin(pinToChange.userId)}>Reset</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Reperibilità Smart Area 4 © 2026</p>
      </footer>
    </div>
  )
}

// Log Component
function LogView() {
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLog().then(data => {
      setLog(data)
      setLoading(false)
    })
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
