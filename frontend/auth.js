// ── Supabase Configuration ────────────────────────────────────────────────────
// FILL THESE IN to connect directly to Supabase from the frontend
const SUPABASE_URL = "https://izqcpfznbjeeyklhzjsq.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWNwZnpuYmplZXlrbGh6anNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzUwMjEsImV4cCI6MjA5MTg1MTAyMX0.CtxsY2FeiBu5NgcX5CQVqP_05m-40SELpCSXY1gpdF4";

let gitaSupabase = null;
if (typeof window.supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
  gitaSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── API URL (fallback for Python-based RAG chat) ───────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://hibque-bhagwatgita-bot.hf.space/api';

// ── Storage helpers ───────────────────────────────────────────────────────────
function getToken() {
  const t = localStorage.getItem('gita_token');
  if (!t || t === 'undefined' || t === 'null') return null;
  return t;
}
function setToken(t) {
  if (!t || t === 'undefined' || t === 'null') {
    localStorage.removeItem('gita_token');
  } else {
    localStorage.setItem('gita_token', t);
  }
}
function removeToken() { localStorage.removeItem('gita_token'); }

function getUser()        { try { return JSON.parse(localStorage.getItem('gita_user')); } catch { return null; } }
function setUser(u)       { localStorage.setItem('gita_user', JSON.stringify(u)); }
function removeUser()     { localStorage.removeItem('gita_user'); }

function isLoggedIn()     { return !!getToken(); }

// ── Auth actions ──────────────────────────────────────────────────────────────
async function logout() {
  if (gitaSupabase) await gitaSupabase.auth.signOut();
  removeToken();
  removeUser();
  window.location.href = 'index.html';
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function apiRegister(name, email, password) {
  if (gitaSupabase) {
    const { data, error } = await gitaSupabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw error;
    setToken(data.session?.access_token);
    const user = { id: data.user.id, name: data.user.user_metadata.name, email: data.user.email };
    setUser(user);
    return { token: data.session?.access_token, user };
  } else {
    // Fallback to proxy
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed.');
    setToken(data.token);
    setUser(data.user);
    return data;
  }
}

async function apiLogin(email, password) {
  if (gitaSupabase) {
    const { data, error } = await gitaSupabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setToken(data.session.access_token);
    const user = { id: data.user.id, name: data.user.user_metadata.name, email: data.user.email };
    setUser(user);
    return { token: data.session.access_token, user };
  } else {
    // Fallback to proxy
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed.');
    setToken(data.token);
    setUser(data.user);
    return data;
  }
}

async function apiMe() {
  if (gitaSupabase) {
     const { data: { user } } = await gitaSupabase.auth.getUser();
     if (user) {
        const u = { id: user.id, name: user.user_metadata.name, email: user.email };
        setUser(u);
        return u;
     }
     return null;
  } else {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) { removeToken(); removeUser(); return null; }
      const data = await res.json();
      setUser(data.user);
      return data.user;
    } catch { return null; }
  }
}

// ── Update landing page navbar based on auth state ────────────────────────────
function toggleUserDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('userDropdownMenu');
  if (menu) menu.classList.toggle('visible');
}

// Close dropdown when clicking elsewhere
document.addEventListener('click', () => {
  const menu = document.getElementById('userDropdownMenu');
  if (menu) menu.classList.remove('visible');
});

function applyAuthToNav() {
  const user = getUser();
  // Target multiple potential navbar container IDs
  const actionsEl = document.getElementById('navActions') || 
                    document.getElementById('chatNavRight') || 
                    document.getElementById('globalNavActions');
  if (!actionsEl) return;

  if (user) {
    const displayName = user.name || user.email || "User";
    const initials = displayName
      .split(' ')
      .filter(n => n)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    
    actionsEl.innerHTML = `
      <div class="user-profile-nav">
        <div class="user-avatar-circle" onclick="toggleUserDropdown(event)">
          ${initials}
        </div>
        <div class="user-dropdown-menu" id="userDropdownMenu">
          <div style="padding: 4px 16px 12px; border-bottom: 1px solid rgba(212,175,55,0.1); margin-bottom: 8px;">
            <p style="font-size: 14px; color: #fff; font-weight: 600; margin: 0;">${user.name}</p>
            <p style="font-size: 11px; color: rgba(245,230,161,0.5); margin: 0;">${user.email}</p>
          </div>
          <a href="chat.html" class="dropdown-item">
            <span>💬</span> Chat with Wisdom Bot
          </a>
          <a href="profile.html" class="dropdown-item">
            <span>👤</span> View Profile
          </a>
          <div class="dropdown-item logout" onclick="logout()">
            <span>🚪</span> Sign Out
          </div>
        </div>
      </div>
    `;
  } else {
    actionsEl.innerHTML = `
      <a href="login.html" class="btn-ghost">Login</a>
      <a href="register.html" class="btn-gold">Get Started</a>
    `;
  }
}

// ── Auto-Initialization ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', applyAuthToNav);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  applyAuthToNav();
}
