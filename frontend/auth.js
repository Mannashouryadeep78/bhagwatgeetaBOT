// ── Supabase Configuration ────────────────────────────────────────────────────
// FILL THESE IN to connect directly to Supabase from the frontend
const SUPABASE_URL = "https://izqcpfznbjeeyklhzjsq.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWNwZnpuYmplZXlrbGh6anNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzUwMjEsImV4cCI6MjA5MTg1MTAyMX0.CtxsY2FeiBu5NgcX5CQVqP_05m-40SELpCSXY1gpdF4";

let supabase = null;
if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
  // Rename global supabase to prevent conflict if needed, or just use it
  const { createClient } = supabase;
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── API URL (fallback for Python-based RAG chat) ───────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://hibque-bhagwatgita-bot.hf.space/api';

// ── Storage helpers ───────────────────────────────────────────────────────────
function getToken()       { return localStorage.getItem('gita_token'); }
function setToken(t)      { localStorage.setItem('gita_token', t); }
function removeToken()    { localStorage.removeItem('gita_token'); }

function getUser()        { try { return JSON.parse(localStorage.getItem('gita_user')); } catch { return null; } }
function setUser(u)       { localStorage.setItem('gita_user', JSON.stringify(u)); }
function removeUser()     { localStorage.removeItem('gita_user'); }

function isLoggedIn()     { return !!getToken(); }

// ── Auth actions ──────────────────────────────────────────────────────────────
async function logout() {
  if (supabase) await supabase.auth.signOut();
  removeToken();
  removeUser();
  window.location.href = 'index.html';
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function apiRegister(name, email, password) {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
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
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
  if (supabase) {
     const { data: { user } } = await supabase.auth.getUser();
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
function applyAuthToNav() {
  const user = getUser();
  const actionsEl = document.getElementById('navActions');
  if (!actionsEl) return;

  if (user) {
    actionsEl.innerHTML = `
      <span style="color:rgba(245,230,161,0.7);font-size:13px;">
        🙏 ${user.name.split(' ')[0]}
      </span>
      <a href="profile.html" class="btn-ghost">Profile</a>
      <a href="chat.html" class="btn-gold">Open Chat</a>
      <button class="btn-ghost" onclick="logout()" style="padding: 9px 16px;">Logout</button>
    `;
  } else {
    actionsEl.innerHTML = `
      <a href="login.html" class="btn-ghost">Login</a>
      <a href="register.html" class="btn-gold">Get Started</a>
    `;
  }
}
