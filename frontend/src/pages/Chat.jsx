import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { API_URL, getToken } from '../lib/api.js'
import '../styles/chat.css'

const INIT_MSG = {
  id: 'init',
  content: '🙏 Namaste! I am your companion on this journey through the Gita. How are you feeling today? Tell me what\'s on your heart, and together we shall find wisdom in the words of Shri Krishna.',
  sender: 'bot',
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function groupByDate(items) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yestStart = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1)
  const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7)

  const groups = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] }
  for (const item of items) {
    const d = new Date(item.created_at)
    if      (d >= todayStart) groups.Today.push(item)
    else if (d >= yestStart)  groups.Yesterday.push(item)
    else if (d >= weekStart)  groups['This Week'].push(item)
    else                      groups.Earlier.push(item)
  }
  return groups
}

function formatTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return d >= todayStart
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Chat() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [messages, setMessages] = useState([INIT_MSG])
  const [historyItems, setHistoryItems] = useState(null)
  const [activeHistoryId, setActiveHistoryId] = useState(null)
  const [lastQuestion, setLastQuestion] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    checkHealth()
    loadHistory()
    // Close dropdown only when clicking outside the dropdown container
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })

    const onResize = () => {
      if (window.innerWidth <= 768) setSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)

    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  async function checkHealth() {
    try {
      const res = await fetch(`${API_URL}/health`)
      await res.json()
    } catch {
      addErrorMsg('⚠️ Cannot connect to the backend. The server may be starting up — please wait a moment and try again.')
    }
  }

  async function loadHistory() {
    const token = getToken()
    if (!token) { setHistoryItems([]); return }
    try {
      const res = await fetch(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401 || res.status === 422 || !res.ok) { setHistoryItems([]); return }
      const data = await res.json()
      setHistoryItems(data.history || [])
    } catch {
      setHistoryItems([])
    }
  }

  function addMsg(content, sender) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), content, sender }])
  }

  function addErrorMsg(text, showRetry = false) {
    setMessages(prev => [
      ...prev,
      { id: Date.now() + Math.random(), content: text, sender: 'bot', isError: true, showRetry },
    ])
  }

  async function sendQuestion(retryQuestion) {
    const question = retryQuestion || inputValue.trim()
    if (!question || isSending) return

    if (!retryQuestion) {
      addMsg(question, 'user')
      setInputValue('')
    }

    setLastQuestion(question)
    setActiveHistoryId(null)
    setIsSending(true)
    setIsTyping(true)

    try {
      const headers = { 'Content-Type': 'application/json' }
      const token = getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`

      // Send last 8 messages (4 exchanges) as conversation context, excluding init + errors
      const conversation_history = messages
        .filter(m => m.id !== 'init' && !m.isError)
        .slice(-8)
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content }))

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question, conversation_history }),
      })

      setIsTyping(false)
      const data = await response.json()

      if (response.status === 429) {
        addErrorMsg('You\'re asking too fast! Please wait a moment before trying again.')
      } else if (response.ok) {
        addMsg(data.answer, 'bot')
        if (data.conversation_id) {
          const newItem = {
            id: data.conversation_id,
            question,
            answer: data.answer,
            created_at: new Date().toISOString(),
          }
          setHistoryItems(prev => (prev ? [newItem, ...prev] : [newItem]))
        }
      } else {
        addErrorMsg(data.error || 'Something went wrong. Please try again.', true)
      }
    } catch {
      setIsTyping(false)
      addErrorMsg('Cannot reach the server. Check your connection and try again.', true)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  function newChat() {
    setActiveHistoryId(null)
    setLastQuestion('')
    setMessages([INIT_MSG])
    inputRef.current?.focus()
  }

  function loadConversation(id, question, answer) {
    setActiveHistoryId(id)
    setLastQuestion(question)
    setMessages([
      INIT_MSG,
      { id: 'q-' + id, content: question, sender: 'user' },
      { id: 'a-' + id, content: answer, sender: 'bot' },
    ])
    if (window.innerWidth <= 768) setSidebarOpen(false)
  }

  async function deleteHistoryItem(id) {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/history/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setHistoryItems(prev => prev?.filter(h => h.id !== id) || [])
        if (activeHistoryId === id) newChat()
      }
    } catch (e) { console.error('Delete failed', e) }
  }

  async function clearAllHistory() {
    if (!confirm('Clear all conversation history? This cannot be undone.')) return
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/history/clear`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setHistoryItems([])
        newChat()
      }
    } catch (e) { console.error('Clear failed', e) }
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  const initials = user
    ? (user.name || user.email || 'U')
        .split(' ').filter(Boolean)
        .map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : ''

  const hasHistory = historyItems && historyItems.length > 0
  const groups = historyItems ? groupByDate(historyItems) : {}

  return (
    <div className="chat-page">
      <div className="krishna-bg" />

      {/* Top navbar */}
      <div className="chat-nav">
        <div className="chat-nav-left">
          <button
            className="btn-sidebar-toggle"
            onClick={() => setSidebarOpen(o => !o)}
            title="Toggle history"
          >
            &#9776;
          </button>
          <Link to="/">&#8592; Home</Link>
        </div>
        <div className="chat-nav-title">🪷 Gita Wisdom</div>
        <div className="chat-nav-right">
          {user ? (
            <div className="user-profile-nav" ref={dropdownRef}>
              <div
                className="user-avatar-circle"
                onClick={() => setDropdownOpen(o => !o)}
              >
                {initials}
              </div>
              <div className={`user-dropdown-menu${dropdownOpen ? ' visible' : ''}`}>
                <div style={{ padding: '4px 16px 12px', borderBottom: '1px solid rgba(212,175,55,0.1)', marginBottom: 8 }}>
                  <p style={{ fontSize: 14, color: '#fff', fontWeight: 600, margin: 0 }}>{user.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(245,230,161,0.5)', margin: 0 }}>{user.email}</p>
                </div>
                <Link to="/chat" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                  <span>💬</span> Chat with Wisdom Bot
                </Link>
                <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                  <span>👤</span> View Profile
                </Link>
                <div className="dropdown-item logout" onClick={handleLogout}>
                  <span>🚪</span> Sign Out
                </div>
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn-login-link">Login</Link>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main layout */}
      <div className="chat-layout">

        {/* Sidebar */}
        <div className={`sidebar${sidebarOpen ? '' : ' collapsed'}`} id="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-header-title">History</span>
            <button className="btn-new-chat" onClick={newChat}>+ New Chat</button>
          </div>

          <div className="sidebar-body">
            {historyItems === null ? (
              <div className="sidebar-empty">
                <div className="sidebar-empty-icon">⏳</div>
                Loading…
              </div>
            ) : !user ? (
              <div className="sidebar-guest">
                <p>Login to save your conversations and revisit them anytime.</p>
                <Link to="/login">Login / Register</Link>
              </div>
            ) : !hasHistory ? (
              <div className="sidebar-empty">
                <div className="sidebar-empty-icon">📜</div>
                No conversations yet.<br />Start asking to build your history.
              </div>
            ) : (
              Object.entries(groups).map(([label, items]) =>
                items.length > 0 ? (
                  <div key={label}>
                    <div className="history-group-label">{label}</div>
                    {items.map(item => {
                      const preview = item.question.length > 52
                        ? item.question.slice(0, 52) + '…'
                        : item.question
                      return (
                        <div
                          key={item.id}
                          className={`history-item${activeHistoryId === item.id ? ' active' : ''}`}
                          onClick={() => loadConversation(item.id, item.question, item.answer)}
                        >
                          <div className="history-item-question">{escapeHtml(preview)}</div>
                          <div className="history-item-date">{formatTime(item.created_at)}</div>
                          <button
                            className="history-item-delete"
                            title="Delete"
                            onClick={e => { e.stopPropagation(); deleteHistoryItem(item.id) }}
                          >
                            &#x2715;
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : null
              )
            )}
          </div>

          {hasHistory && (
            <div className="sidebar-footer">
              <button className="btn-clear-history" onClick={clearAllHistory}>
                Clear all history
              </button>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="chat-main">
          <div className="chat-main-header">
            <h1>🪷 Bhagavad Gita Wisdom</h1>
            <p>Timeless guidance for modern life</p>
          </div>

          <div className="chat-container">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`message ${msg.sender}-message${msg.isError ? ' error-message' : ''}`}
              >
                <div className="message-content">
                  {msg.content}
                  {msg.showRetry && (
                    <>
                      <br />
                      <button
                        className="retry-btn"
                        onClick={() => {
                          setMessages(prev => prev.filter(m => m.id !== msg.id))
                          sendQuestion(lastQuestion)
                        }}
                      >
                        ↺ Retry
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="message bot-message typing-indicator">
                <div className="message-content">
                  <div className="typing-dots">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="input-container">
            <input
              ref={inputRef}
              className="question-input"
              type="text"
              placeholder="Ask Krishna your question…"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendQuestion()}
              disabled={isSending}
            />
            <button
              className="send-button"
              onClick={() => sendQuestion()}
              disabled={isSending}
            >
              {isSending ? <span className="loading-dot" /> : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
