import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)  // true while checking saved token

  // On mount — check if a valid token exists in localStorage
  useEffect(() => {
    const token = localStorage.getItem('mimir_token')
    if (!token) { setLoading(false); return }

    axios.get('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => setUser(r.data))
      .catch(() => localStorage.removeItem('mimir_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('mimir_token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('mimir_token')
    setUser(null)
  }

  // Attach token to every axios request automatically
  axios.defaults.headers.common['Authorization'] =
    user ? `Bearer ${localStorage.getItem('mimir_token')}` : ''

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — all components import this
export function useAuth() {
  return useContext(AuthContext)
}