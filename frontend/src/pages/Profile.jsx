import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { API_URL, getToken, setStoredUser } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'
import '../styles/auth.css'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState(null) // { text, type: 'success'|'error' }
  const [saving, setSaving] = useState(false)

  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

  function showMsg(text, type = 'success') {
    setStatus({ text, type })
    setTimeout(() => setStatus(null), 5000)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { name: name.trim() }
    if (currentPassword || newPassword) {
      payload.current_password = currentPassword
      payload.new_password = newPassword
    }

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setStoredUser(data.user)
        setCurrentPassword('')
        setNewPassword('')
        showMsg('Profile updated successfully!')
      } else {
        showMsg(data.error || 'Update failed.', 'error')
      }
    } catch {
      showMsg('Cannot reach server.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="profile-wrapper">
      <div className="profile-bg" />

      <nav className="auth-nav">
        <Link to="/" className="auth-nav-logo">🪷 Gita Wisdom</Link>
        <button
          onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 50, padding: '4px 13px', color: 'rgba(245,230,161,0.6)', fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
        >
          Sign Out
        </button>
      </nav>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">{initials}</div>
          <h1>{user?.name || 'User Name'}</h1>
          <p>{user?.email}</p>
        </div>

        {status && (
          <div className={`message-box ${status.type === 'error' ? 'message-error' : 'message-success'}`}>
            {status.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="profile-form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              required
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="profile-divider" />

          <h3 style={{ fontSize: 14, marginBottom: 16, color: '#1B2A4E' }}>Change Password</h3>

          <div className="profile-form-group">
            <label>Current Password</label>
            <input
              type="password"
              placeholder="Required for password change"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="profile-form-group">
            <label>New Password (min 8 chars)</label>
            <input
              type="password"
              placeholder="Leave blank to keep current"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <button
          className="btn-back"
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/chat')}
        >
          ← Go Back
        </button>
      </div>
    </div>
  )
}
