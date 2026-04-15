// ── API URL (auto-switch local vs production) ─────────────────────────────────
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
function logout() {
  removeToken();
  removeUser();
  window.location.href = 'index.html';
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function apiRegister(name, email, password) {
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

async function apiLogin(email, password) {
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

async function apiMe() {
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
  } catch {
    return null;
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
      <a href="chat.html" class="btn-gold">Open Chat</a>
      <button class="btn-ghost" onclick="logout()">Logout</button>
    `;
  } else {
    actionsEl.innerHTML = `
      <a href="login.html" class="btn-ghost">Login</a>
      <a href="register.html" class="btn-gold">Get Started</a>
    `;
  }
}
