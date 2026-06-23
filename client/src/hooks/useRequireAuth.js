import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function useRequireAuth() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (action) => {
    if (!user) {
      navigate('/profile')
      return false
    }
    action?.()
    return true
  }
}