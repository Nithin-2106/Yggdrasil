import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchPage from './SearchPage'
import InfoPage from './InfoPage'
import MyList from './MyList'
import Dashboard from './Dashboard'

const C = {
  bg:           '#060B14',
  surface:      '#0B1220',
  surfaceHover: '#101A2E',
  input:        '#080F1C',
  primary:      '#7EB8F7',
  primarySoft:  'rgba(126,184,247,0.12)',
  aurora:       '#A78BFA',
  auroraSoft:   'rgba(167,139,250,0.15)',
  green:        '#34D399',
  greenSoft:    'rgba(52,211,153,0.12)',
  gold:         '#FCD34D',
  goldSoft:     'rgba(252,211,77,0.15)',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderPrimary:'rgba(126,184,247,0.2)',
  borderAurora: 'rgba(167,139,250,0.15)',
}

function VegvisirWatermark() {
  return (
    <svg
      viewBox="0 0 200 200"
      style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '700px', height: '700px',
        opacity: 0.04,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <circle cx="100" cy="100" r="95" fill="none" stroke="#7EB8F7" strokeWidth="1"/>
      <circle cx="100" cy="100" r="80" fill="none" stroke="#7EB8F7" strokeWidth="0.5"/>
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
          <g key={i} stroke="#7EB8F7" strokeWidth="1.5" fill="none">
            <line x1={x1} y1={y1} x2={x2} y2={y2}/>
            <line x1={b1x} y1={b1y} x2={tip1x} y2={tip1y}/>
            <line x1={b2x} y1={b2y} x2={tip2x} y2={tip2y}/>
          </g>
        )
      })}
      <circle cx="100" cy="100" r="20" fill="none" stroke="#7EB8F7" strokeWidth="1"/>
      <circle cx="100" cy="100" r="6" fill="#7EB8F7" opacity="0.5"/>
    </svg>
  )
}

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
      <button
        onClick={handleIconClick}
        style={{
          position: 'absolute', left: '10px', top: '50%',
          transform: 'translateY(-50%)',
          background: 'none', border: 'none',
          color: focused ? C.primary : C.textDim,
          fontSize: '15px', cursor: 'pointer',
          padding: 0, lineHeight: 1,
          transition: 'color 0.25s', zIndex: 1,
        }}
      >⌕</button>
      <input
        placeholder="Search anime..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          paddingLeft: '32px', paddingRight: '12px',
          height: '34px',
          width: focused ? '220px' : '160px',
          background: C.input,
          border: `1px solid ${focused ? C.primary + '99' : C.borderPrimary}`,
          color: C.text, fontSize: '12px',
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.05em',
          outline: 'none',
          transition: 'all 0.3s ease',
          boxShadow: focused ? `0 0 18px rgba(126,184,247,0.15)` : 'none',
        }}
      />
    </div>
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
        color: active ? C.primary : hovered ? C.text : C.textMuted,
        background: active ? C.primarySoft : 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent',
        padding: '8px 22px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        textTransform: 'uppercase',
        textShadow: active ? `0 0 12px ${C.primary}` : 'none',
      }}
    >
      {label}
    </button>
  )
}

function Navbar({ activePage, onNavigate, onSearch }) {
  const navigate = useNavigate()
  const links = ['Dashboard', 'My List']

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: '64px',
      background: 'rgba(6,11,20,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${C.borderPrimary}`,
      display: 'flex', alignItems: 'center',
      padding: '0 36px',
    }}>
      {/* Primary top line */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
        background: `linear-gradient(to right, transparent, ${C.primary}88, transparent)`,
      }} />

      {/* Logo */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          fontFamily: '"Cinzel", serif', fontSize: '11px',
          letterSpacing: '0.3em', color: C.primary, userSelect: 'none',
        }}>ᚨ</div>
        <div style={{ width: '1px', height: '20px', background: C.borderPrimary }} />
        <span style={{
          fontFamily: '"Cinzel", serif', fontSize: '16px',
          fontWeight: 700, letterSpacing: '0.25em', color: C.text,
          textShadow: `0 0 20px ${C.primary}44`,
        }}>ALFHEIM</span>
        <div style={{
          fontSize: '10px', letterSpacing: '0.2em',
          color: C.textDim, fontFamily: '"Cinzel", serif', marginLeft: '4px',
        }}>ᚱᛖᚨᛚᛗ</div>
      </div>

      {/* Nav links */}
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

      {/* Right: search + home */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
        <SearchBar onSearch={onSearch} />
        <div style={{
          fontFamily: '"Cinzel", serif', fontSize: '10px',
          color: C.borderPrimary, userSelect: 'none', letterSpacing: '0.1em',
        }}>᛭</div>
        <button
          onClick={() => navigate('/')}
          style={{
            fontFamily: '"Cinzel", serif', fontSize: '11px',
            letterSpacing: '0.25em', color: C.textMuted,
            background: 'transparent',
            border: `1px solid ${C.borderPrimary}`,
            padding: '8px 18px', cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = C.gold
            e.currentTarget.style.borderColor = `${C.gold}88`
            e.currentTarget.style.boxShadow = `0 0 16px ${C.goldSoft}`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = C.textMuted
            e.currentTarget.style.borderColor = C.borderPrimary
            e.currentTarget.style.boxShadow = 'none'
          }}
        >ᛟ YGGDRASIL</button>
      </div>
    </nav>
  )
}

export default function Alfheim() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAnimeId, setSelectedAnimeId] = useState(null)

  const handleNavigate = (page, payload = '') => {
    if (page === 'Search') setSearchQuery(payload)
    if (page === 'Info')   setSelectedAnimeId(payload)
    setActivePage(page)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap" />

      <VegvisirWatermark />

      {/* Primary edge glow — top left */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '400px', height: '400px',
        background: `radial-gradient(ellipse at top left, ${C.primary}0f, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Aurora edge glow — bottom right */}
      <div style={{
        position: 'fixed', bottom: 0, right: 0, width: '400px', height: '400px',
        background: `radial-gradient(ellipse at bottom right, ${C.aurora}0f, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Green edge glow — bottom */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '180px',
        background: `linear-gradient(to top, ${C.green}0a, transparent)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

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
            <span style={{ fontFamily: '"Cinzel", serif', fontSize: '18px', color: C.primary + '66' }}>ᚨ</span>
            <div style={{ fontSize: '10px', letterSpacing: '0.45em', color: C.textDim, textTransform: 'uppercase', fontFamily: '"Cinzel", serif' }}>
              Realm of Light Elves · Anime
            </div>
          </div>
          <h1 style={{
            fontFamily: '"Cinzel", serif',
            fontSize: 'clamp(22px, 3vw, 34px)',
            fontWeight: 700, letterSpacing: '0.2em', color: C.text,
            margin: 0,
            textShadow: `0 0 40px ${C.primary}33`,
          }}>
            {activePage === 'Search' ? 'SEARCH'
              : activePage === 'Info' ? 'ANIME INFO'
              : activePage.toUpperCase()}
          </h1>
          {activePage === 'Search' && searchQuery && (
            <div style={{
              fontSize: '12px', letterSpacing: '0.2em',
              color: C.textMuted, marginTop: '6px',
              fontFamily: '"Cinzel", serif',
            }}>
              ᛭ results for <span style={{ color: C.primary }}>"{searchQuery}"</span>
            </div>
          )}
          <div style={{
            height: '1px', marginTop: '16px',
            background: `linear-gradient(to right, ${C.primary}88, ${C.aurora}44, transparent)`,
          }} />
        </div>

        {activePage === 'Dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {activePage === 'My List'   && <MyList onNavigate={handleNavigate} />}
        {activePage === 'Search'    && (
          <SearchPage
            query={searchQuery}
            onSelectAnime={(item) => handleNavigate('Info', item.mal_id)}
          />
        )}
        {activePage === 'Info' && (
          <InfoPage
            malId={selectedAnimeId}
            onBack={() => handleNavigate('Search', searchQuery)}
          />
        )}
      </main>
    </div>
  )
}