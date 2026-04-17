import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { getToken, setToken, removeToken, getStoredUser, setStoredUser, removeStoredUser } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        const u = {
          id: session.user.id,
          name: session.user.user_metadata?.name,
          email: session.user.email,
        }
        setStoredUser(u)
        setUser(u)
      } else if (getToken()) {
        removeToken()
        removeStoredUser()
        setUser(null)
      }
      setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setToken(session.access_token)
        const u = {
          id: session.user.id,
          name: session.user.user_metadata?.name,
          email: session.user.email,
        }
        setStoredUser(u)
        setUser(u)
      } else {
        removeToken()
        removeStoredUser()
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function register(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
    removeToken()
    removeStoredUser()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
