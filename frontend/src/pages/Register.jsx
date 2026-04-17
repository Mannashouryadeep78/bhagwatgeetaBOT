import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import '../styles/auth.css'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [fname, setFname] = useState('')
  const [lname, setLname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [confirmError, setConfirmError] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/chat', { replace: true })
  }, [user, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setConfirmError(false)

    if (password !== confirm) {
      setConfirmError(true)
      setError('Passwords do not match.')
      return
    }

    const fullName = lname ? `${fname.trim()} ${lname.trim()}` : fname.trim()
    setLoading(true)
    try {
      await register(fullName, email.trim(), password)
      navigate('/chat', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <nav className="auth-nav">
        <Link to="/" className="auth-nav-logo">🪷 Gita Wisdom</Link>
        <div />
      </nav>

      <div className="auth-card register">
        <Link to="/" className="card-logo">🪷 Gita Wisdom</Link>
        <p className="card-sub">Begin your journey</p>

        <h1>Create Account</h1>
        <p className="subtitle">Free forever. No credit card required.</p>

        <div className="perks">
          <div className="perk"><span className="perk-icon">✓</span> Save your conversation history</div>
          <div className="perk"><span className="perk-icon">✓</span> Access from any device</div>
          <div className="perk"><span className="perk-icon">✓</span> Unlimited questions, always free</div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fname">First Name</label>
              <input
                type="text"
                id="fname"
                placeholder="Arjuna"
                required
                autoComplete="given-name"
                value={fname}
                onChange={e => setFname(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lname">Last Name</label>
              <input
                type="text"
                id="lname"
                placeholder="Pandava"
                autoComplete="family-name"
                value={lname}
                onChange={e => setLname(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Min. 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              type="password"
              id="confirm"
              placeholder="Repeat password"
              required
              autoComplete="new-password"
              className={confirmError ? 'input-error' : ''}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? <><span className="loading-spinner" />Creating account…</> : 'Create Free Account'}
          </button>
        </form>

        <p className="footer-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className="footer-text" style={{ marginTop: 10 }}>
          <Link to="/">← Back to Home</Link>
        </p>
      </div>
    </div>
  )
}
