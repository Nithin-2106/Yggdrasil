import { useState, useEffect } from 'react'
import { useIsCompact } from '../../hooks/useMediaQuery'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SearchPage  from './SearchPage'
import InfoPage    from './InfoPage'
import MyList      from './MyList'
import Dashboard   from './Dashboard'
import BrowsePage  from './BrowsePage'
import ProfileIcon from '../../components/ProfileIcon'
import ErrorBoundary from '../../components/ErrorBoundary'
import { useAuth } from '../../context/AuthContext'

const C = {
  bg:           '#050C10',
  surface:      '#0A1A20',
  surfaceHover: '#0E2228',
  input:        '#071318',
  primary:      '#5EEAD4',
  primarySoft:  'rgba(94,234,212,0.12)',
  aurora:       '#C084FC',
  auroraSoft:   'rgba(192,132,252,0.15)',
  gold:         '#A3E635',
  goldSoft:     'rgba(163,230,53,0.15)',
  text:         '#E0F7F4',
  textMuted:    '#7ABFB8',
  textDim:      '#2E5A56',
  borderPrimary:'rgba(94,234,212,0.2)',
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
        width: '700px', height: '700px',
        opacity: 0.04, pointerEvents: 'none', zIndex: 0,
      }}
    >
      <circle cx="100" cy="100" r="95" fill="none" stroke="#5EEAD4" strokeWidth="1" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#5EEAD4" strokeWidth="0.5" />
      {spokes.map((angle, i) => {
        const rad    = (angle * Math.PI) / 180
        const cos    = Math.cos(rad), sin = Math.sin(rad)
        const x1     = 100 + 20 * cos,  y1 = 100 + 20 * sin
        const x2     = 100 + 80 * cos,  y2 = 100 + 80 * sin
        const bx     = 100 + 55 * cos,  by = 100 + 55 * sin
        const perp   = rad + Math.PI / 2
        const pc     = Math.cos(perp),  ps = Math.sin(perp)
        return (
          <g key={i} stroke="#5EEAD4" strokeWidth="1.5" fill="none">
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            <line x1={bx + 10 * pc} y1={by + 10 * ps} x2={bx + 24 * cos + 10 * pc} y2={by + 24 * sin + 10 * ps} />
            <line x1={bx - 10 * pc} y1={by - 10 * ps} x2={bx + 24 * cos - 10 * pc} y2={by + 24 * sin - 10 * ps} />
          </g>
        )
      })}
      <circle cx="100" cy="100" r="20" fill="none" stroke="#7EB8F7" strokeWidth="1" />
      <circle cx="100" cy="100" r="6"  fill="#7EB8F7" opacity="0.5" />
    </svg>
  )
}

// ── Navbar search bar ─────────────────────────────────────────────────────────
function SearchBar({ onSearch }) {
  const [query,   setQuery]   = useState('')
  const [focused, setFocused] = useState(false)

  const submit = () => {
    const q = query.trim()
    if (!q) return
    onSearch(q)
    setQuery('')
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        onClick={submit}
        style={{
          position: 'absolute', left: '10px', top: '50%',
          transform: 'translateY(-50%)',
          background: 'none', border: 'none',
          color: focused ? C.primary : C.textDim,
          fontSize: '15px', cursor: 'pointer',
          padding: 0, lineHeight: 1, transition: 'color 0.25s', zIndex: 1,
        }}
      >⌕</button>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search anime..."
        style={{
          paddingLeft: '32px', paddingRight: '12px',
          height: '34px', width: focused ? '220px' : '160px',
          background: C.input,
          border: `1px solid ${focused ? C.primary + '99' : C.borderPrimary}`,
          color: C.text, fontSize: '12px',
          fontFamily: '"Cinzel", serif', letterSpacing: '0.05em',
          outline: 'none', transition: 'all 0.3s ease',
          boxShadow: focused ? '0 0 18px rgba(94,234,212,0.15)' : 'none',
        }}
      />
    </div>
  )
}

function SearchBarMobile({ onSearch }) {
  const [query,   setQuery]   = useState('')
  const [focused, setFocused] = useState(false)

  const submit = () => {
    if (query.trim()) { onSearch(query.trim()); setQuery('') }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <button onClick={submit} style={{
        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none',
        color: focused ? C.primary : C.textDim,
        fontSize: '16px', cursor: 'pointer', padding: 0, lineHeight: 1,
        transition: 'color 0.25s', zIndex: 1,
      }}>⌕</button>
      <input
        placeholder="Search anime..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          paddingLeft: '40px', paddingRight: '14px',
          height: '48px', width: '100%',
          background: C.input,
          border: `1px solid ${focused ? C.primary + '99' : C.borderPrimary}`,
          color: C.text, fontSize: '14px',
          fontFamily: '"Cinzel", serif', letterSpacing: '0.05em',
          outline: 'none', boxSizing: 'border-box',
          transition: 'all 0.3s ease',
          boxShadow: focused ? `0 0 18px rgba(94,234,212,0.15)` : 'none',
        }}
      />
    </div>
  )
}

// ── Nav link button ───────────────────────────────────────────────────────────
function NavLink({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? C.primary : hovered ? C.text : C.textMuted,
        background: active ? C.primarySoft : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? C.primary : 'transparent'}`,
        padding: '8px 22px', cursor: 'pointer',
        transition: 'all 0.25s ease',
        textShadow: active ? `0 0 12px ${C.primary}` : 'none',
      }}
    >{label}</button>
  )
}

// ── Top navigation bar ────────────────────────────────────────────────────────
function HamburgerIcon({ open, color }) {
  const bar = {
    display: 'block',
    height: '2px',
    width: '100%',
    background: color,
    transition: 'transform 0.25s ease, opacity 0.2s ease',
  }
  return (
    <div style={{ width: 20, height: 15, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <span style={{ ...bar, transform: open ? 'translateY(6.5px) rotate(45deg)' : 'none' }} />
      <span style={{ ...bar, opacity: open ? 0 : 1 }} />
      <span style={{ ...bar, transform: open ? 'translateY(-6.5px) rotate(-45deg)' : 'none' }} />
    </div>
  )
}

function Navbar({ activePage, onNavigate, onSearch, isCompact }) {
  const navigate = useNavigate()
  const links    = ['Dashboard', 'Browse', 'My List']
  const [menuOpen, setMenuOpen] = useState(false)

  // Auto-close the mobile panel if the viewport grows past the breakpoint
  useEffect(() => { if (!isCompact) setMenuOpen(false) }, [isCompact])

  const handleNav = (page) => {
    onNavigate(page)
    setMenuOpen(false)
  }

  const handleSearchSubmit = (q) => {
    onSearch(q)
    setMenuOpen(false)
  }

  return (
    <>
      <style>{`
        @keyframes alfheim-mobile-menu-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <nav style={{
        position:       'fixed',
        top:            0,
        left:           0,
        right:          0,
        zIndex:         100,
        height:         '64px',
        background:     'rgba(6,11,20,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom:   `1px solid ${C.borderPrimary}`,
        display:        'flex',
        alignItems:     'center',
        padding:        isCompact ? '0 16px' : '0 36px',
      }}>
        {/* Gold top accent */}
        <div style={{
          position:   'absolute',
          top:        0,
          left:       '10%',
          right:      '10%',
          height:     '1px',
          background: `linear-gradient(to right, transparent, ${C.primary}88, transparent)`,
        }} />

        {/* Logo */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div style={{
            fontFamily:    '"Cinzel", serif',
            fontSize:      '11px',
            letterSpacing: '0.3em',
            color:         C.gold,
            userSelect:    'none',
          }}>ᚨ</div>
          {!isCompact && <div style={{ width: '1px', height: '20px', background: C.borderPrimary }} />}
          <span style={{
            fontFamily:    '"Cinzel", serif',
            fontSize:      isCompact ? '14px' : '16px',
            fontWeight:    700,
            letterSpacing: '0.25em',
            color:         C.text,
            textShadow:    `0 0 20px ${C.primary}44`,
            whiteSpace:    'nowrap',
          }}>
            ALFHEIM
          </span>
          {!isCompact && (
            <div style={{
              fontSize:      '10px',
              letterSpacing: '0.2em',
              color:         C.textDim,
              fontFamily:    '"Cinzel", serif',
              marginLeft:    '4px',
            }}>
              ᚱᛖᚨᛚᛗ
            </div>
          )}
        </div>

        {/* Nav links — desktop only */}
        {!isCompact && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '4px' }}>
            {links.map(link => (
              <NavLink
                key={link}
                label={link}
                active={activePage === link}
                onClick={() => onNavigate(link)}
              />
            ))}
          </div>
        )}

        {/* Right side */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: isCompact ? '10px' : '12px' }}>
          {!isCompact && <SearchBar onSearch={onSearch} />}

          <ProfileIcon borderColor="rgba(94,234,212,0.35)" size={34} />

          {!isCompact && (
            <>
              <div style={{
                fontFamily:    '"Cinzel", serif',
                fontSize:      '10px',
                color:         C.borderPrimary,
                userSelect:    'none',
                letterSpacing: '0.1em',
              }}>᛭</div>

              <button
                onClick={() => navigate('/')}
                style={{
                  fontFamily:    '"Cinzel", serif',
                  fontSize:      '11px',
                  letterSpacing: '0.25em',
                  color:         C.textMuted,
                  background:    'transparent',
                  border:        `1px solid ${C.borderPrimary}`,
                  padding:       '8px 18px',
                  cursor:        'pointer',
                  transition:    'all 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color       = C.gold
                  e.currentTarget.style.borderColor = `${C.gold}88`
                  e.currentTarget.style.boxShadow   = `0 0 16px ${C.goldSoft}`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color       = C.textMuted
                  e.currentTarget.style.borderColor = C.borderPrimary
                  e.currentTarget.style.boxShadow   = 'none'
                }}
              >
                ᛟ YGGDRASIL
              </button>
            </>
          )}

          {isCompact && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              style={{
                width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: menuOpen ? C.primarySoft : 'transparent',
                border: `1px solid ${menuOpen ? C.primary + '66' : C.borderPrimary}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              <HamburgerIcon open={menuOpen} color={menuOpen ? C.primary : C.text} />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile dropdown panel */}
      {isCompact && menuOpen && (
        <div style={{
          position:       'fixed',
          top:            '64px',
          left:           0,
          right:          0,
          zIndex:         99,
          background:     'rgba(6,11,20,0.97)',
          backdropFilter: 'blur(20px)',
          borderBottom:   `1px solid ${C.borderPrimary}`,
          padding:        '20px 16px 28px',
          display:        'flex',
          flexDirection:  'column',
          gap:            '20px',
          animation:      'alfheim-mobile-menu-in 0.2s ease-out',
        }}>
          <div style={{ width: '100%' }}>
            <SearchBarMobile onSearch={handleSearchSubmit} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {links.map(link => {
              const active = activePage === link
              return (
                <button
                  key={link}
                  onClick={() => handleNav(link)}
                  style={{
                    textAlign:     'left',
                    minHeight:     '48px',
                    padding:       '0 14px',
                    fontFamily:    '"Cinzel", serif',
                    fontSize:      '13px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color:         active ? C.primary : C.textMuted,
                    background:    active ? C.primarySoft : 'transparent',
                    border:        'none',
                    borderLeft:    `2px solid ${active ? C.primary : 'transparent'}`,
                    cursor:        'pointer',
                    transition:    'all 0.2s ease',
                  }}
                >
                  {link}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => { navigate('/'); setMenuOpen(false) }}
            style={{
              fontFamily:    '"Cinzel", serif',
              fontSize:      '11px',
              letterSpacing: '0.25em',
              color:         C.textMuted,
              background:    'transparent',
              border:        `1px solid ${C.borderPrimary}`,
              minHeight:     '48px',
              cursor:        'pointer',
              transition:    'all 0.3s ease',
            }}
          >
            ᛟ YGGDRASIL
          </button>
        </div>
      )}
    </>
  )
}

// ── Page title bar ────────────────────────────────────────────────────────────
function PageTitle({ activePage, searchQuery }) {
  const title = activePage === 'Search' ? 'SEARCH'
    : activePage === 'Info'   ? 'ANIME INFO'
    : activePage === 'Browse' ? 'BROWSE'
    : activePage.toUpperCase()

  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1px' }}>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '18px', color: C.primary + '66' }}>ᚨ</span>
        <div style={{
          fontSize: '10px', letterSpacing: '0.45em', color: C.textDim,
          textTransform: 'uppercase', fontFamily: '"Cinzel", serif',
        }}>Realm of Light Elves · Anime</div>
      </div>
      <h1 style={{
        fontFamily: '"Cinzel", serif',
        fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 700,
        letterSpacing: '0.2em', color: C.text, margin: 0,
        textShadow: `0 0 40px ${C.primary}33`,
      }}>{title}</h1>
      {activePage === 'Search' && searchQuery && (
        <div style={{
          fontSize: '12px', letterSpacing: '0.2em', color: C.textMuted,
          marginTop: '6px', fontFamily: '"Cinzel", serif',
        }}>
          ᛭ results for <span style={{ color: C.primary }}>"{searchQuery}"</span>
        </div>
      )}
      <div style={{
        height: '1px', marginTop: '16px',
        background: `linear-gradient(to right, ${C.primary}88, ${C.aurora}44, transparent)`,
      }} />
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────
export default function Alfheim() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const isCompact = useIsCompact()
  const [searchParams, setSearchParams] = useSearchParams()


  const activePage      = searchParams.get('page') || 'Dashboard'
  const searchQuery     = searchParams.get('q') || ''
  const selectedAnimeId = searchParams.get('id') || null

  // Central navigation handler — navigate is stable here at the top level
  const handleNavigate = (page, payload = '') => {
    if (page === 'My List' && !user) { navigate('/profile'); return }
    const next = new URLSearchParams(searchParams)
    next.set('page', page)
    if (page === 'Search') next.set('q', payload)
    if (page === 'Info')   next.set('id', payload)
    setSearchParams(next)
  }

  return (
  <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap"
    />

    {/* Ambient background layers */}
    <VegvisirWatermark />
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '400px',
        height: '400px',
        background: `radial-gradient(ellipse at top left, ${C.primary}0f, transparent 70%)`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '400px',
        height: '400px',
        background: `radial-gradient(ellipse at bottom right, ${C.aurora}0f, transparent 70%)`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '180px',
        background: 'linear-gradient(to top, rgba(52,211,153,0.04), transparent)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />

    <Navbar
      activePage={activePage}
      onNavigate={handleNavigate}
      onSearch={q => handleNavigate('Search', q)}
      isCompact={isCompact}
    />

    <main
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isCompact ? '84px 16px 56px' : '96px 36px 80px',
      }}
    >
      <PageTitle activePage={activePage} searchQuery={searchQuery} />

      <ErrorBoundary
        colors={C}
        realmName="Alfheim"
        onReturnHome={() => handleNavigate('Dashboard')}
      >
        {activePage === 'Dashboard' && (
          <Dashboard onNavigate={handleNavigate} />
        )}

        {activePage === 'Browse' && (
          <BrowsePage onNavigate={handleNavigate} />
        )}

        {activePage === 'My List' && (
          <MyList onNavigate={handleNavigate} />
        )}

        {activePage === 'Search' && (
          <SearchPage
            query={searchQuery}
            onSelectAnime={item => handleNavigate('Info', item.mal_id)}
          />
        )}

        {activePage === 'Info' && (
          <InfoPage
            malId={selectedAnimeId}
            onBack={() => handleNavigate('Search', searchQuery)}
          />
        )}
      </ErrorBoundary>
    </main>
  </div>
)
}