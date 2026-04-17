export const API_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://hibque-bhagwatgita-bot.hf.space/api'

export function getToken() {
  const t = localStorage.getItem('gita_token')
  if (!t || t === 'undefined' || t === 'null') return null
  return t
}

export function setToken(t) {
  if (!t || t === 'undefined' || t === 'null') {
    localStorage.removeItem('gita_token')
  } else {
    localStorage.setItem('gita_token', t)
  }
}

export function removeToken() {
  localStorage.removeItem('gita_token')
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('gita_user')) } catch { return null }
}

export function setStoredUser(u) {
  localStorage.setItem('gita_user', JSON.stringify(u))
}

export function removeStoredUser() {
  localStorage.removeItem('gita_user')
}
