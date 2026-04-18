import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import '../styles/auth.css'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/chat', { replace: true })
  }, [user, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/chat', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed.')
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

      <div className="auth-card">
        <Link to="/" className="card-logo">🪷 Gita Wisdom</Link>
        <p className="card-sub">Timeless guidance for modern life</p>

        <h1>Welcome Back</h1>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
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
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? <><span className="loading-spinner" />Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p className="footer-text" style={{ marginTop: 28 }}>
          Don&apos;t have an account? <Link to="/register">Create one free</Link>
        </p>
        <p className="footer-text" style={{ marginTop: 10 }}>
          <Link to="/">← Back to Home</Link>
        </p>
      </div>
    </div>
  )
}
