import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProfileIcon({ borderColor = 'rgba(201,168,76,0.3)', size = 34 }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate('/profile')}
      title={user ? user.username : 'Sign in'}
      style={{
        width: size, height: size,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'border-color 0.25s, box-shadow 0.25s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = borderColor.replace(/[\d.]+\)$/, '0.9)')
        e.currentTarget.style.boxShadow = `0 0 12px ${borderColor}`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = borderColor
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {user?.profileImage ? (
        <img
          src={user.profileImage}
          alt={user.username}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{
          fontFamily: '"Cinzel", serif',
          fontSize: user ? Math.floor(size * 0.45) : Math.floor(size * 0.55),
          color: borderColor.replace(/[\d.]+\)$/, '0.8)'),
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {user ? user.username[0].toUpperCase() : 'ᚢ'}
        </span>
      )}
    </div>
  )
}