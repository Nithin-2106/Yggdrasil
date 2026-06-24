import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchPage from './SearchPage'
import InfoPage from './InfoPage'
import Counter from '../../components/Counter'
import MyList from './MyList'
import Dashboard from './Dashboard'
import BrowsePage from './BrowsePage'
import ProfileIcon from '../../components/ProfileIcon'
import { useAuth } from '../../context/AuthContext'

const C = {
  bg:           '#080D1A',
  surface:      '#0F1829',
  surfaceHover: '#141F33',
  input:        '#0A1220',
  ember:        '#C2410C',
  emberSoft:    'rgba(194,65,12,0.15)',
  gold:         '#CA8A04',
  goldBright:   '#F59E0B',
  goldSoft:     'rgba(202,138,4,0.2)',
  electric:     '#38BDF8',
  electricSoft: 'rgba(56,189,248,0.12)',
  violet:       '#7C3AED',
  violetSoft:   'rgba(124,58,237,0.15)',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderGold:   'rgba(202,138,4,0.2)',
  borderElec:   'rgba(56,189,248,0.15)',
}

// ── SVG Vegvisir (Norse compass) watermark ────────────────────────────────────
function VegvisirWatermark() {
  return (
    <svg
      viewBox="0 0 200 200"
      style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '700px', height: '700px',
        opacity: 0.05,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <circle cx="100" cy="100" r="95" fill="none" stroke="#CA8A04" strokeWidth="1"/>
      <circle cx="100" cy="100" r="80" fill="none" stroke="#CA8A04" strokeWidth="0.5"/>
      {[0,45,90,135,180,225,270,315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x1 = 100 + 20 * Math.cos(rad)
        const y1 = 100 + 20 * Math.sin(rad)
        const x2 = 100 + 80 * Math.cos(rad)
        const y2 = 100 + 80 * Math.sin(rad)
        const bx = 100 + 55 * Math.cos(rad)
        const by = 100 + 55 * Math.sin(rad)
        const perpRad = rad + Math.PI / 2
        const b1x = bx + 10 * Math.cos(perpRad)
        const b1y = by + 10 * Math.sin(perpRad)
        const b2x = bx - 10 * Math.cos(perpRad)
        const b2y = by - 10 * Math.sin(perpRad)
        const tip1x = b1x + 14 * Math.cos(rad)
        const tip1y = b1y + 14 * Math.sin(rad)
        const tip2x = b2x + 14 * Math.cos(rad)
        const tip2y = b2y + 14 * Math.sin(rad)
        return (
          <g key={i} stroke="#CA8A04" strokeWidth="1.5" fill="none">
            <line x1={x1} y1={y1} x2={x2} y2={y2}/>
            <line x1={b1x} y1={b1y} x2={tip1x} y2={tip1y}/>
            <line x1={b2x} y1={b2y} x2={tip2x} y2={tip2y}/>
          </g>
        )
      })}
      <circle cx="100" cy="100" r="20" fill="none" stroke="#CA8A04" strokeWidth="1"/>
      <circle cx="100" cy="100" r="6" fill="#CA8A04" opacity="0.5"/>
    </svg>
  )
}

// ── Corner ornament ───────────────────────────────────────────────────────────
function Corners({ color = C.goldBright, size = 14, opacity = 1 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 10, left: 10, borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 10, right: 10, borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 10, left: 10, borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 10, right: 10, borderBottom: b, borderRight: b }} />
    </>
  )
}

// ── NEW: Search bar component ─────────────────────────────────────────────────
function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query.trim())
      setQuery('')
    }
  }

  const handleIconClick = () => {
    if (query.trim()) {
      onSearch(query.trim())
      setQuery('')
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Search icon — clickable */}
      <button
        onClick={handleIconClick}
        style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: focused ? C.electric : C.textDim,
          fontSize: '15px',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
          transition: 'color 0.25s',
          zIndex: 1,
        }}
      >
        ⌕
      </button>
      <input
        placeholder="Search dramas..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          paddingLeft: '32px',
          paddingRight: '12px',
          height: '34px',
          // Expands on focus for a nice effect
          width: focused ? '220px' : '160px',
          background: C.input,
          border: `1px solid ${focused ? C.electric + '99' : C.borderGold}`,
          color: C.text,
          fontSize: '12px',
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.05em',
          outline: 'none',
          transition: 'all 0.3s ease',
          boxShadow: focused ? `0 0 18px rgba(56,189,248,0.15)` : 'none',
        }}
      />
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
// CHANGED: accepts onSearch prop; right section now has SearchBar + Yggdrasil button
function Navbar({ activePage, onNavigate, onSearch }) {
  const navigate = useNavigate()
    const links = ['Dashboard', 'Browse', 'My List']

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: '64px',
      background: 'rgba(8,13,26,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${C.borderGold}`,
      display: 'flex', alignItems: 'center',
      padding: '0 36px',
    }}>
      {/* Gold top line */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
        background: `linear-gradient(to right, transparent, ${C.goldBright}88, transparent)`,
      }} />

      {/* Logo — left */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '11px',
          letterSpacing: '0.3em',
          color: C.gold,
          userSelect: 'none',
        }}>ᛗ</div>
        <div style={{ width: '1px', height: '20px', background: C.borderGold }} />
        <span style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '0.25em',
          color: C.text,
          textShadow: `0 0 20px ${C.electric}44`,
        }}>
          MIDGARD
        </span>
        <div style={{
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: C.textDim,
          fontFamily: '"Cinzel", serif',
          marginLeft: '4px',
        }}>
          ᚱᛖᚨᛚᛗ
        </div>
      </div>

      {/* Nav links — center */}
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

      {/* Right: Search bar + Yggdrasil button */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>

        {/* NEW: Search bar */}
        <SearchBar onSearch={onSearch} />

        <ProfileIcon borderColor="rgba(202,138,4,0.35)" size={34} />

        {/* Rune separator */}
        <div style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '10px',
          color: C.borderGold,
          userSelect: 'none',
          letterSpacing: '0.1em',
        }}>᛭</div>

        {/* Yggdrasil home button */}
        <button
          onClick={() => navigate('/')}
          style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '11px',
            letterSpacing: '0.25em',
            color: C.textMuted,
            background: 'transparent',
            border: `1px solid ${C.borderGold}`,
            padding: '8px 18px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = C.goldBright
            e.currentTarget.style.borderColor = `${C.gold}88`
            e.currentTarget.style.boxShadow = `0 0 16px ${C.goldSoft}`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = C.textMuted
            e.currentTarget.style.borderColor = C.borderGold
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          ᛟ YGGDRASIL
        </button>
      </div>
    </nav>
  )
}

function NavLink({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '11px',
        letterSpacing: '0.2em',
        color: active ? C.electric : hovered ? C.text : C.textMuted,
        background: active ? C.electricSoft : 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${C.electric}` : '2px solid transparent',
        padding: '8px 22px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        textTransform: 'uppercase',
        textShadow: active ? `0 0 12px ${C.electric}` : 'none',
      }}
    >
      {label}
    </button>
  )
}


// ── Main ──────────────────────────────────────────────────────────────────────
function Midgard() {
  const { user } = useAuth()
  const [activePage, setActivePage] = useState('Dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDramaId, setSelectedDramaId] = useState(null)

  const handleNavigate = (page, payload = '') => {
    if (page === 'My List' && !user) { navigate('/profile'); return }
    if (page === 'Search') setSearchQuery(payload)
    if (page === 'Info')   setSelectedDramaId(payload)
    setActivePage(page)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap" />

      <VegvisirWatermark />

      {/* Ember edge glow — bottom */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '180px',
        background: `linear-gradient(to top, ${C.ember}18, transparent)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Electric edge glow — top right */}
      <div style={{
        position: 'fixed', top: 0, right: 0, width: '400px', height: '400px',
        background: `radial-gradient(ellipse at top right, ${C.electric}0f, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Violet edge — bottom left */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, width: '350px', height: '350px',
        background: `radial-gradient(ellipse at bottom left, ${C.violet}0f, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* CHANGED: pass onSearch to Navbar */}
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        onSearch={(q) => handleNavigate('Search', q)}
      />

      <main style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1200px', margin: '0 auto',
        padding: '96px 36px 80px',
      }}>
        {/* Page header */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1px' }}>
            <span style={{ fontFamily: '"Cinzel", serif', fontSize: '18px', color: C.gold + '66' }}>ᛗ</span>
            <div style={{ fontSize: '10px', letterSpacing: '0.45em', color: C.textDim, textTransform: 'uppercase', fontFamily: '"Cinzel", serif' }}>
              Realm of Mortals · Drama
            </div>
          </div>
          <h1 style={{
            fontFamily: '"Cinzel", serif',
            fontSize: 'clamp(22px, 3vw, 34px)',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: C.text,
            margin: 0,
            textShadow: `0 0 40px ${C.electric}33`,
          }}>
            {/* CHANGED: show query in header when on search page */}
          {activePage === 'Search' ? 'SEARCH' : activePage === 'Info' ? 'DRAMA INFO' : activePage === 'Browse' ? 'BROWSE' : activePage.toUpperCase()}

          </h1>
          {/* CHANGED: show query subtitle under header on search page */}
          {activePage === 'Search' && searchQuery && (
            <div style={{
              fontSize: '12px',
              letterSpacing: '0.2em',
              color: C.textMuted,
              marginTop: '6px',
              fontFamily: '"Cinzel", serif',
            }}>
              ᛭ results for <span style={{ color: C.electric }}>"{searchQuery}"</span>
            </div>
          )}
          <div style={{
            height: '1px', marginTop: '16px',
            background: `linear-gradient(to right, ${C.ember}88, ${C.electric}44, transparent)`,
          }} />
        </div>

        {activePage === 'Dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {activePage === 'Browse' && <BrowsePage onNavigate={handleNavigate} />}
        {activePage === 'My List' && (
  <MyList onNavigate={handleNavigate} />
)}
        {/* Search page */}
        {activePage === 'Search' && (
          <SearchPage
            query={searchQuery}
            onSelectDrama={(item) => handleNavigate('Info', item.id)}
          />
        )}
        {/* Info / Detail page */}
        {activePage === 'Info' && (
          <InfoPage
            tmdbId={selectedDramaId}
            onBack={() => handleNavigate('Search', searchQuery)}
          />
        )}
      </main>
    </div>
  )
}

export default Midgard