import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'

const AUTH_API = '/api/auth'

const C = {
  bg:           '#07080F',
  surface:      '#0D0F1C',
  surfaceHover: '#12152A',
  input:        '#090B18',
  gold:         '#C9A84C',
  goldBright:   '#F0C040',
  goldSoft:     'rgba(201,168,76,0.12)',
  electric:     '#38BDF8',
  electricSoft: 'rgba(56,189,248,0.10)',
  green:        '#22C55E',
  red:          '#EF4444',
  redSoft:      'rgba(239,68,68,0.12)',
  text:         '#EEF2FA',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderGold:   'rgba(201,168,76,0.22)',
  borderElec:   'rgba(56,189,248,0.18)',
}

// ── Corner ornaments ──────────────────────────────────────────────────────────
function Corners({ color = C.gold, size = 12, opacity = 0.5 }) {
  const base = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...base, top: 8,    left: 8,   borderTop: b,    borderLeft: b   }} />
      <div style={{ ...base, top: 8,    right: 8,  borderTop: b,    borderRight: b  }} />
      <div style={{ ...base, bottom: 8, left: 8,   borderBottom: b, borderLeft: b   }} />
      <div style={{ ...base, bottom: 8, right: 8,  borderBottom: b, borderRight: b  }} />
    </>
  )
}

// ── Vegvisir watermark ────────────────────────────────────────────────────────
function VegvisirWatermark() {
  const spokes = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg
      viewBox="0 0 200 200"
      style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 700,
        opacity: 0.04, pointerEvents: 'none', zIndex: 0,
      }}
    >
      <circle cx="100" cy="100" r="95" fill="none" stroke="#C9A84C" strokeWidth="1" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#C9A84C" strokeWidth="0.5" />
      {spokes.map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const cos = Math.cos(rad), sin = Math.sin(rad)
        const x1 = 100 + 20 * cos, y1 = 100 + 20 * sin
        const x2 = 100 + 80 * cos, y2 = 100 + 80 * sin
        const bx = 100 + 55 * cos, by = 100 + 55 * sin
        const pr = rad + Math.PI / 2
        const cosp = Math.cos(pr), sinp = Math.sin(pr)
        const b1x = bx + 10 * cosp, b1y = by + 10 * sinp
        const b2x = bx - 10 * cosp, b2y = by - 10 * sinp
        const t1x = b1x + 14 * cos,  t1y = b1y + 14 * sin
        const t2x = b2x + 14 * cos,  t2y = b2y + 14 * sin
        return (
          <g key={i} stroke="#C9A84C" strokeWidth="1.5" fill="none">
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            <line x1={b1x} y1={b1y} x2={t1x} y2={t1y} />
            <line x1={b2x} y1={b2y} x2={t2x} y2={t2y} />
          </g>
        )
      })}
      <circle cx="100" cy="100" r="20" fill="none" stroke="#C9A84C" strokeWidth="1" />
      <circle cx="100" cy="100" r="6"  fill="#C9A84C" opacity="0.5" />
    </svg>
  )
}

// ── Shared label style ────────────────────────────────────────────────────────
const labelStyle = {
  fontSize: '9px',
  letterSpacing: '0.3em',
  color: C.textMuted,
  textTransform: 'uppercase',
  fontFamily: '"Cinzel", serif',
  marginBottom: '7px',
  display: 'block',
}

// ── Shared input style factory ────────────────────────────────────────────────
function inputStyle(focusedField, thisField, extra = {}) {
  return {
    width: '100%',
    padding: '11px 14px',
    background: C.input,
    border: `1px solid ${focusedField === thisField ? C.electric + 'aa' : C.borderGold}`,
    color: C.text,
    fontSize: '14px',
    fontFamily: '"Cinzel", serif',
    letterSpacing: '0.04em',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.25s, box-shadow 0.25s',
    boxShadow: focusedField === thisField ? '0 0 18px rgba(56,189,248,0.12)' : 'none',
    ...extra,
  }
}

// ── Login Form ────────────────────────────────────────────────────────────────
function LoginForm({ onSwitch }) {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [focused,  setFocused]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async () => {
    if (!email.trim() || !password) { setError('Please fill in all fields'); return }
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${AUTH_API}/login`, {
        email: email.trim().toLowerCase(),
        password,
      })
      login(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <label style={labelStyle}>ᛖ Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused('')}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="your@email.com"
          style={inputStyle(focused, 'email')}
          autoComplete="email"
        />
      </div>

      <div>
        <label style={labelStyle}>ᚲ Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onFocus={() => setFocused('password')}
          onBlur={() => setFocused('')}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="••••••••"
          style={inputStyle(focused, 'password')}
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div style={{
          fontSize: '12px', color: C.red, letterSpacing: '0.05em',
          padding: '10px 14px', background: C.redSoft,
          border: `1px solid ${C.red}33`,
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          fontFamily: '"Cinzel", serif', fontSize: '12px', letterSpacing: '0.3em',
          color: loading ? C.textDim : C.gold,
          background: loading ? C.surface : C.goldSoft,
          border: `1px solid ${loading ? C.borderGold : C.gold + '77'}`,
          padding: '14px',
          cursor: loading ? 'wait' : 'pointer',
          textTransform: 'uppercase',
          transition: 'all 0.25s',
          boxShadow: loading ? 'none' : '0 0 20px rgba(201,168,76,0.12)',
          marginTop: '4px',
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(201,168,76,0.2)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(201,168,76,0.22)' }}}
        onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = C.goldSoft; e.currentTarget.style.boxShadow = '0 0 20px rgba(201,168,76,0.12)' }}}
      >
        {loading ? 'Entering the realm…' : 'ᛟ Enter the Realm'}
      </button>

      <div style={{ textAlign: 'center', paddingTop: '8px' }}>
        <span style={{ fontSize: '12px', color: C.textDim, letterSpacing: '0.05em' }}>
          No account yet?{' '}
        </span>
        <button
          onClick={onSwitch}
          style={{
            fontSize: '12px', color: C.electric, background: 'none', border: 'none',
            cursor: 'pointer', letterSpacing: '0.08em', padding: 0,
            fontFamily: 'inherit', textDecoration: 'underline',
            textDecorationColor: C.electric + '55', textUnderlineOffset: '3px',
          }}
        >
          Create an account
        </button>
      </div>
    </div>
  )
}

// ── Register Form ─────────────────────────────────────────────────────────────
function RegisterForm({ onSwitch }) {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [username,     setUsername]     = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [focused,      setFocused]      = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const handleSubmit = async () => {
    if (!username.trim() || !email.trim() || !password) {
      setError('Username, email and password are required'); return
    }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${AUTH_API}/register`, {
        username:     username.trim(),
        email:        email.trim().toLowerCase(),
        password,
        profileImage: profileImage.trim(),
      })
      login(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const passwordMismatch = confirm && confirm !== password

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <label style={labelStyle}>ᚢ Username</label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          onFocus={() => setFocused('username')}
          onBlur={() => setFocused('')}
          placeholder="Your chosen name"
          style={inputStyle(focused, 'username')}
          autoComplete="username"
        />
      </div>

      <div>
        <label style={labelStyle}>ᛖ Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused('')}
          placeholder="your@email.com"
          style={inputStyle(focused, 'email')}
          autoComplete="email"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>ᚲ Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused('')}
            placeholder="Min. 6 characters"
            style={inputStyle(focused, 'password')}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label style={labelStyle}>ᚲ Confirm</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onFocus={() => setFocused('confirm')}
            onBlur={() => setFocused('')}
            placeholder="Repeat password"
            style={inputStyle(focused, 'confirm', {
              borderColor: passwordMismatch
                ? C.red + 'aa'
                : focused === 'confirm' ? C.electric + 'aa' : C.borderGold,
            })}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>
          ᛈ Profile Image URL{' '}
          <span style={{ color: C.textDim, fontSize: '8px', letterSpacing: '0.1em' }}>(optional)</span>
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            value={profileImage}
            onChange={e => setProfileImage(e.target.value)}
            onFocus={() => setFocused('profileImage')}
            onBlur={() => setFocused('')}
            placeholder="https://…"
            style={{ ...inputStyle(focused, 'profileImage'), flex: 1 }}
          />
          {/* Live preview */}
          <div style={{
            width: 40, height: 40, flexShrink: 0,
            background: C.input,
            border: `1px solid ${C.borderGold}`,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {profileImage
              ? <img
                  src={profileImage}
                  alt="preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              : <span style={{ fontSize: '16px', color: C.textDim }}>ᚢ</span>
            }
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          fontSize: '12px', color: C.red, letterSpacing: '0.05em',
          padding: '10px 14px', background: C.redSoft,
          border: `1px solid ${C.red}33`,
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          fontFamily: '"Cinzel", serif', fontSize: '12px', letterSpacing: '0.3em',
          color: loading ? C.textDim : C.electric,
          background: loading ? C.surface : C.electricSoft,
          border: `1px solid ${loading ? C.borderGold : C.electric + '77'}`,
          padding: '14px',
          cursor: loading ? 'wait' : 'pointer',
          textTransform: 'uppercase',
          transition: 'all 0.25s',
          boxShadow: loading ? 'none' : '0 0 20px rgba(56,189,248,0.10)',
          marginTop: '4px',
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(56,189,248,0.18)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(56,189,248,0.18)' }}}
        onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = C.electricSoft; e.currentTarget.style.boxShadow = '0 0 20px rgba(56,189,248,0.10)' }}}
      >
        {loading ? 'Creating your legend…' : 'ᚨ Begin the Journey'}
      </button>

      <div style={{ textAlign: 'center', paddingTop: '4px' }}>
        <span style={{ fontSize: '12px', color: C.textDim, letterSpacing: '0.05em' }}>
          Already a wanderer?{' '}
        </span>
        <button
          onClick={onSwitch}
          style={{
            fontSize: '12px', color: C.gold, background: 'none', border: 'none',
            cursor: 'pointer', letterSpacing: '0.08em', padding: 0,
            fontFamily: 'inherit', textDecoration: 'underline',
            textDecorationColor: C.gold + '55', textUnderlineOffset: '3px',
          }}
        >
          Sign in
        </button>
      </div>
    </div>
  )
}

// ── Profile View (logged in) ──────────────────────────────────────────────────
function ProfileView() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [hoverLogout, setHoverLogout] = useState(false)
  const [hoverHome,   setHoverHome]   = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initial = (user?.username?.[0] ?? 'ᚢ').toUpperCase()

  const realms = [
    { name: 'Alfheim',  rune: 'ᚨ', color: '#7EB8F7', sub: 'Anime'  },
    { name: 'Valhalla', rune: '⚔', color: '#C084FC', sub: 'Manga'  },
    { name: 'Midgard',  rune: 'ᛗ', color: '#F4A261', sub: 'Drama'  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '36px' }}>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: 110, height: 110,
          border: `1px solid ${C.gold}66`,
          overflow: 'hidden', position: 'relative',
          boxShadow: `0 0 40px rgba(201,168,76,0.18), 0 0 0 1px ${C.gold}22`,
        }}>
          <Corners color={C.gold} size={10} opacity={0.6} />
          {user?.profileImage
            ? <img
                src={user.profileImage}
                alt={user.username}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
                fontFamily: '"Cinzel Decorative", "Cinzel", serif',
                fontSize: 38, color: C.gold,
                textShadow: '0 0 20px rgba(201,168,76,0.5)',
              }}>
                {initial}
              </div>
            )
          }
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: '"Cinzel", serif',
            fontSize: 22, fontWeight: 700,
            letterSpacing: '0.15em', color: C.text,
            textShadow: '0 0 30px rgba(201,168,76,0.2)',
          }}>
            {user?.username}
          </div>
          <div style={{
            fontSize: 12, color: C.textDim,
            letterSpacing: '0.1em', marginTop: 6,
            fontFamily: '"Cinzel", serif',
          }}>
            {user?.email}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${C.borderGold})` }} />
        <div style={{ color: C.gold + '66', fontSize: 14, fontFamily: '"Cinzel", serif' }}>ᛟ</div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${C.borderGold})` }} />
      </div>

      {/* Realm badges */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {realms.map(realm => (
          <div key={realm.name} style={{
            padding: '14px 20px',
            background: C.surface,
            border: `1px solid ${realm.color}33`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            minWidth: 90, position: 'relative',
          }}>
            <Corners color={realm.color} size={7} opacity={0.3} />
            <div style={{ fontSize: 20, color: realm.color, textShadow: `0 0 12px ${realm.color}55` }}>
              {realm.rune}
            </div>
            <div style={{ fontFamily: '"Cinzel", serif', fontSize: 10, letterSpacing: '0.2em', color: realm.color }}>
              {realm.name}
            </div>
            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: '0.15em', fontFamily: '"Cinzel", serif' }}>
              {realm.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        <button
          onClick={() => navigate('/')}
          onMouseEnter={() => setHoverHome(true)}
          onMouseLeave={() => setHoverHome(false)}
          style={{
            fontFamily: '"Cinzel", serif', fontSize: 11, letterSpacing: '0.3em',
            color: hoverHome ? C.goldBright : C.gold,
            background: hoverHome ? 'rgba(201,168,76,0.15)' : C.goldSoft,
            border: `1px solid ${hoverHome ? C.gold + 'aa' : C.gold + '55'}`,
            padding: 13, cursor: 'pointer', textTransform: 'uppercase',
            transition: 'all 0.25s',
            boxShadow: hoverHome ? '0 0 24px rgba(201,168,76,0.18)' : 'none',
          }}
        >
          ᛟ Return to Yggdrasil
        </button>

        <button
          onClick={handleLogout}
          onMouseEnter={() => setHoverLogout(true)}
          onMouseLeave={() => setHoverLogout(false)}
          style={{
            fontFamily: '"Cinzel", serif', fontSize: 11, letterSpacing: '0.3em',
            color: hoverLogout ? C.red : C.textMuted,
            background: hoverLogout ? C.redSoft : 'transparent',
            border: `1px solid ${hoverLogout ? C.red + '66' : C.borderGold}`,
            padding: 13, cursor: 'pointer', textTransform: 'uppercase',
            transition: 'all 0.25s',
          }}
        >
          ✕ Leave the Realm
        </button>
      </div>
    </div>
  )
}

// ── Main ProfilePage ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: '"Cinzel", serif', fontSize: 13,
          letterSpacing: '0.3em', color: C.textDim,
        }}>
          ᛟ Consulting the runes…
        </div>
      </div>
    )
  }

  const headerRune     = user ? 'ᛟ' : mode === 'login' ? 'ᚢ' : 'ᚨ'
  const headerTitle    = user ? 'YOUR LEGEND' : mode === 'login' ? 'ENTER THE REALM' : 'FORGE YOUR PATH'
  const headerSubtitle = user
    ? `Welcome back, ${user.username}`
    : mode === 'login' ? 'Sign in to your account' : 'Create a new account'

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, position: 'relative' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;600;700&display=swap" />
      <VegvisirWatermark />

      {/* Ambient edge glows */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: 400, height: 400,
        background: 'radial-gradient(ellipse at top left, rgba(201,168,76,0.06), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: 0, right: 0, width: 400, height: 400,
        background: 'radial-gradient(ellipse at bottom right, rgba(56,189,248,0.05), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Back button */}
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 36px 0' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            fontFamily: '"Cinzel", serif', fontSize: 11, letterSpacing: '0.25em',
            color: C.textDim, background: 'transparent', border: 'none',
            cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.gold}
          onMouseLeave={e => e.currentTarget.style.color = C.textDim}
        >
          ← Yggdrasil
        </button>
      </div>

      {/* Main content */}
      <div style={{
        position: 'relative', zIndex: 1,
        minHeight: 'calc(100vh - 80px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px 80px',
      }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Card */}
          <div style={{
            background: C.surface,
            border: `1px solid ${C.borderGold}`,
            position: 'relative',
            boxShadow: '0 0 80px rgba(0,0,0,0.6)',
          }}>
            <Corners color={C.goldBright} size={13} opacity={0.4} />

            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
              background: `linear-gradient(to right, transparent, ${C.gold}88, transparent)`,
            }} />

            {/* Header */}
            <div style={{
              padding: '32px 36px 28px',
              borderBottom: `1px solid ${C.borderGold}`,
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: '"Cinzel", serif', fontSize: 24,
                color: C.gold + '66', marginBottom: 14, letterSpacing: '0.3em',
              }}>
                {headerRune}
              </div>

              <div style={{
                fontFamily: '"Cinzel Decorative", "Cinzel", serif',
                fontSize: 18, fontWeight: 700,
                letterSpacing: '0.2em', color: C.text,
                textShadow: '0 0 30px rgba(201,168,76,0.2)',
                marginBottom: 8,
              }}>
                {headerTitle}
              </div>

              <div style={{
                fontSize: 10, letterSpacing: '0.35em', color: C.textDim,
                fontFamily: '"Cinzel", serif', textTransform: 'uppercase',
              }}>
                {headerSubtitle}
              </div>

              {/* Tab switcher — guests only */}
              {!user && (
                <div style={{ display: 'flex', marginTop: 22 }}>
                  {[
                    { key: 'login',    label: 'Sign In',  rune: 'ᚢ' },
                    { key: 'register', label: 'Register', rune: 'ᚨ' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setMode(tab.key)}
                      style={{
                        flex: 1,
                        fontFamily: '"Cinzel", serif', fontSize: 10,
                        letterSpacing: '0.25em', textTransform: 'uppercase',
                        color: mode === tab.key ? C.gold : C.textDim,
                        background: mode === tab.key ? C.goldSoft : 'transparent',
                        border: 'none',
                        borderBottom: `2px solid ${mode === tab.key ? C.gold : C.borderGold}`,
                        padding: 10, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {tab.rune} {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: '32px 36px 36px' }}>
              {user
                ? <ProfileView />
                : mode === 'login'
                  ? <LoginForm    onSwitch={() => setMode('register')} />
                  : <RegisterForm onSwitch={() => setMode('login')} />
              }
            </div>

            {/* Bottom rune row */}
            <div style={{
              borderTop: `1px solid ${C.borderGold}`,
              padding: 14, textAlign: 'center',
              fontFamily: '"Cinzel", serif', fontSize: 11,
              letterSpacing: '0.4em', color: C.textDim + '88',
            }}>
              ᛟ ᚹ ᛁ ᚷ ᛞ ᚱ ᚨ ᛊ ᛁ ᛚ ᛟ
            </div>
          </div>

          {/* Below-card note */}
          <div style={{
            textAlign: 'center', marginTop: 20,
            fontSize: 11, color: C.textDim, letterSpacing: '0.1em',
            fontFamily: '"Cinzel", serif',
          }}>
            Keeper of Worlds · Mimir's Well
          </div>
        </div>
      </div>
    </div>
  )
}