import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mimir_token')

    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
    }

    if (!token) {
      setLoading(false)
      return
    }

    axios.get('/api/auth/me')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('mimir_token')
        delete axios.defaults.headers.common.Authorization
      })
      .finally(() => setLoading(false))
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('mimir_token', token)
    axios.defaults.headers.common.Authorization = `Bearer ${token}`
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('mimir_token')
    delete axios.defaults.headers.common.Authorization
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}