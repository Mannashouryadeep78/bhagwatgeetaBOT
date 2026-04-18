import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { API_URL } from '../lib/api.js'
import '../styles/landing.css'

export default function Landing() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [vod, setVod] = useState(null)

  const stepsRef = useRef([])
  const avatarRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])


  // Intersection observer for step reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          observer.unobserve(e.target)
        }
      }),
      { threshold: 0.2 }
    )
    stepsRef.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Fetch verse of the day
  useEffect(() => {
    async function fetchVod() {
      try {
        const res = await fetch(`${API_URL}/verse-of-day`)
        if (res.ok) {
          const data = await res.json()
          setVod(data)
        }
      } catch { /* silent fail */ }
    }
    fetchVod()
  }, [])

  function closeMenu() {
    setMenuOpen(false)
    document.body.style.overflow = ''
  }

  function toggleMenu() {
    const next = !menuOpen
    setMenuOpen(next)
    document.body.style.overflow = next ? 'hidden' : ''
  }

  async function handleLogout() {
    await logout()
    setDropdownOpen(false)
  }

  const initials = user
    ? (user.name || user.email || 'U')
        .split(' ').filter(Boolean)
        .map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : ''

  return (
    <>
      {/* ===== NAVBAR ===== */}
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`} id="navbar">
        <Link className="nav-logo" to="/" onClick={closeMenu}>
          <span>🪷</span> Gita Wisdom
        </Link>

        <div className={`nav-menu${menuOpen ? ' open' : ''}`} id="navMenu">
          <ul className="nav-links" id="navLinks">
            <li><a href="#features" onClick={closeMenu}>Features</a></li>
            <li><a href="#how-it-works" onClick={closeMenu}>How it Works</a></li>
            <li><a href="#demo" onClick={closeMenu}>Live Demo</a></li>
          </ul>

          <div className="nav-actions" id="navActions">
            {user ? (
              <div className="user-profile-nav">
                <div
                  ref={avatarRef}
                  className="user-avatar-circle"
                  onClick={() => { closeMenu(); setDropdownOpen(o => !o) }}
                >
                  {initials}
                </div>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost" onClick={closeMenu}>Login</Link>
                <Link to="/register" className="btn-gold" onClick={closeMenu}>Get Started</Link>
              </>
            )}
          </div>
        </div>

        <button
          className={`nav-hamburger${menuOpen ? ' active' : ''}`}
          id="hamburger"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>


      {/* ===== HERO ===== */}
      <section className="hero">
        <video autoPlay muted loop playsInline className="hero-video hero-video-desktop" poster="/images/krishna2.png">
          <source src="/videos/krishnavideo.mp4" type="video/mp4" />
        </video>
        <video autoPlay muted loop playsInline className="hero-video hero-video-mobile" poster="/images/krishnamobile.jpg">
          <source src="/videos/krishnamobilevideo.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay" />

        <div className="hero-content">
          <span className="hero-badge">&#9834; Ancient Wisdom · Modern Answers</span>

          <h1 className="hero-title">
            Discover<br />
            <span className="gold">Timeless Wisdom</span>
          </h1>

          <p className="hero-subtitle">
            Ask any question about life, duty, karma, or purpose.
            Receive guidance directly from the Bhagavad Gita —
            grounded in scripture, with chapter and verse references.
          </p>

          {vod && (
            <div className="verse-card">
              <div className="verse-label">Verse of the Day</div>
              <p className="verse-text">&ldquo;{vod.text}&rdquo;</p>
              <div className="verse-ref">— Chapter {vod.chapter}, Verse {vod.verse}</div>
            </div>
          )}

          <div className="hero-ctas">
            <Link to="/chat" className="btn-hero-primary">
              Start Chatting &nbsp;→
            </Link>
            <a href="#features" className="btn-hero-secondary">
              Learn More &nbsp;↓
            </a>
          </div>
        </div>

        <div className="hero-scroll-hint">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
          <span>Scroll</span>
        </div>
      </section>


      {/* ===== FEATURES ===== */}
      <section id="features">
        <span className="section-label">Why Gita Wisdom</span>
        <h2 className="section-title">Scripture Meets Intelligence</h2>
        <p className="section-sub">
          Not a generic chatbot — every answer is grounded in the Bhagavad Gita&apos;s teachings,
          retrieved from the original text and cited by chapter and verse.
        </p>

        <div className="features-grid">
          {[
            { icon: '📜', title: 'Rooted in Scripture', desc: 'Answers are retrieved directly from the Bhagavad Gita\'s text using semantic search — not hallucinated, not paraphrased beyond recognition.' },
            { icon: '🔖', title: 'Chapter & Verse Citations', desc: 'Every response includes the relevant chapter and verse so you can trace the wisdom back to its source and study further.' },
            { icon: '🌿', title: 'Life-Relevant Guidance', desc: 'Ask about grief, purpose, relationships, ambition, or fear. Krishna\'s teachings apply to modern dilemmas just as they did millennia ago.' },
            { icon: '⚡', title: 'Instant Answers', desc: 'Powered by Groq\'s ultra-fast LLM inference — answers in seconds, not minutes. Wisdom should never make you wait.' },
            { icon: '🎯', title: 'No Noise, Pure Signal', desc: 'No long-winded preambles or filler text. Direct, meaningful answers that respect your time and your question.' },
            { icon: '🔓', title: 'Free to Use', desc: 'Always free. No paywalls on ancient wisdom. Start asking immediately — no credit card required.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works">
        <span className="section-label">The Process</span>
        <h2 className="section-title">How It Works</h2>
        <p className="section-sub">
          A modern RAG (Retrieval-Augmented Generation) pipeline ensures answers
          are always grounded in the actual text of the Gita.
        </p>

        <div className="steps-container">
          {[
            { n: 1, title: 'Ask Your Question', desc: 'Type any question about life, purpose, duty, karma, devotion, or any other spiritual or philosophical topic. There are no wrong questions.' },
            { n: 2, title: 'AI Searches the Gita', desc: 'A semantic search engine scans all 18 chapters and 700 verses to find the passages most relevant to your question — using meaning, not just keywords.' },
            { n: 3, title: 'Receive Wisdom with Context', desc: 'A large language model synthesizes the retrieved passages into a clear, concise answer — with chapter and verse references you can follow up on.' },
          ].map((s, i) => (
            <div key={s.n} className="step" ref={el => stepsRef.current[i] = el}>
              <div className="step-number">{s.n}</div>
              <div className="step-body">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* ===== LIVE DEMO ===== */}
      <section id="demo">
        <span className="section-label">See It In Action</span>
        <h2 className="section-title">Real Questions, Real Wisdom</h2>
        <p className="section-sub">
          Here are a few examples of what you can ask. Click each tab to explore.
        </p>

        <div className="demo-container">
          <div className="demo-header">🪷 &nbsp;Bhagavad Gita Wisdom</div>

          <div className="demo-tabs">
            {['On Purpose', 'On Grief', 'On Action'].map((label, i) => (
              <button
                key={label}
                className={`demo-tab${activeTab === i ? ' active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="demo-chat">
            <div className={`demo-pane${activeTab === 0 ? ' active' : ''}`}>
              <div className="demo-msg user">
                <div className="demo-avatar user-av">🙋</div>
                <div className="demo-bubble user-bubble">How do I find my true purpose in life?</div>
              </div>
              <div className="demo-msg">
                <div className="demo-avatar bot-av">🪷</div>
                <div className="demo-bubble bot-bubble">
                  Your true purpose — your <em>svadharma</em> — lies in your unique nature, not in imitation of others.
                  Krishna teaches that it is better to perform one&apos;s own duty imperfectly than to perform another&apos;s duty perfectly.
                  Look inward: your dharma is revealed through your innate qualities, your natural inclinations, and the duties that life has placed before you.
                  <br /><br />
                  <span className="demo-verse">📖 Chapter 3, Verse 35</span>
                </div>
              </div>
            </div>

            <div className={`demo-pane${activeTab === 1 ? ' active' : ''}`}>
              <div className="demo-msg user">
                <div className="demo-avatar user-av">🙋</div>
                <div className="demo-bubble user-bubble">How should I deal with the grief of losing someone I love?</div>
              </div>
              <div className="demo-msg">
                <div className="demo-avatar bot-av">🪷</div>
                <div className="demo-bubble bot-bubble">
                  The Gita teaches that the soul is eternal — it is never born and never dies.
                  What we grieve is the body, the form; but the essence of the one you loved was never truly lost.
                  This is not a call to suppress emotion, but to understand the deeper reality behind it.
                  Grief itself is natural; clinging to the impermanent is the source of suffering.
                  <br /><br />
                  <span className="demo-verse">📖 Chapter 2, Verse 20</span>
                  &nbsp;
                  <span className="demo-verse">📖 Chapter 2, Verse 27</span>
                </div>
              </div>
            </div>

            <div className={`demo-pane${activeTab === 2 ? ' active' : ''}`}>
              <div className="demo-msg user">
                <div className="demo-avatar user-av">🙋</div>
                <div className="demo-bubble user-bubble">I keep worrying about the results of my efforts. How do I stop?</div>
              </div>
              <div className="demo-msg">
                <div className="demo-avatar bot-av">🪷</div>
                <div className="demo-bubble bot-bubble">
                  This is the heart of Karma Yoga. Krishna says: <em>&ldquo;You have the right to perform
                  your actions, but you are not entitled to the fruits of your actions.&rdquo;</em>
                  Act with full effort and sincerity — then release attachment to the outcome.
                  The quality of your action is entirely within your control; the result is not.
                  Anxiety arises precisely when we confuse these two.
                  <br /><br />
                  <span className="demo-verse">📖 Chapter 2, Verse 47</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ===== CTA BANNER ===== */}
      <section className="cta-section">
        <h2>Begin Your Journey Today</h2>
        <p>Ancient wisdom. Instant access. Completely free.</p>
        <Link to="/chat" className="btn-hero-primary">
          Ask Krishna &nbsp;→
        </Link>
      </section>


      {/* ===== FOOTER ===== */}
      <footer>
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="nav-logo" to="/" style={{ display: 'inline-flex', marginBottom: 12 }}>
              <span>🪷</span> Gita Wisdom
            </Link>
            <p>
              Timeless guidance from the Bhagavad Gita,
              made accessible through modern AI.
            </p>
          </div>

          <div className="footer-links">
            <h4>Navigate</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How it Works</a></li>
              <li><a href="#demo">Live Demo</a></li>
              <li><Link to="/chat">Open Chat</Link></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4>Account</h4>
            <ul>
              <li><Link to="/register">Register</Link></li>
              <li><Link to="/login">Login</Link></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4>Tech Stack</h4>
            <ul>
              <li><a href="#">LangChain + FAISS</a></li>
              <li><a href="#">Groq LLM</a></li>
              <li><a href="#">Flask + Gunicorn</a></li>
              <li><a href="#">HuggingFace Spaces</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2025 Bhagavad Gita Wisdom. Built with devotion.</p>
          <p>
            <a href="https://huggingface.co/spaces/Hibque/bhagwatgita-bot" target="_blank" rel="noopener noreferrer">
              Backend on HuggingFace Spaces
            </a>
          </p>
        </div>
      </footer>

      {/* Portal dropdown — rendered in document.body, escapes navbar stacking context */}
      {dropdownOpen && user && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setDropdownOpen(false)}
          />
          <div
            className="portal-dropdown"
            style={
              window.innerWidth <= 768
                ? { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }
                : avatarRef.current
                  ? {
                      position: 'fixed',
                      top: avatarRef.current.getBoundingClientRect().bottom + 8,
                      right: window.innerWidth - avatarRef.current.getBoundingClientRect().right,
                      zIndex: 9999,
                    }
                  : { position: 'fixed', top: 70, right: 24, zIndex: 9999 }
            }
          >
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
        </>,
        document.body
      )}
    </>
  )
}
