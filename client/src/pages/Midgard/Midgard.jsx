import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import AddNew from './AddNew'
import SearchPage from './SearchPage'

const API = 'http://localhost:5000/api/drama'

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
        opacity: 0.022,
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
  const links = ['Dashboard', 'My List', 'Add New']

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

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, rune }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 150px',
        padding: '28px 20px 22px',
        background: hovered
          ? `linear-gradient(135deg, ${C.surfaceHover}, ${C.surface})`
          : `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
        border: `1px solid ${hovered ? color + '55' : C.borderGold}`,
        transition: 'all 0.35s ease',
        boxShadow: hovered ? `0 0 40px ${color}22, inset 0 0 30px rgba(0,0,0,0.3)` : 'none',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      <Corners color={hovered ? color : C.gold} size={10} opacity={hovered ? 0.8 : 0.3} />
      <div style={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px',
        background: `linear-gradient(to right, transparent, ${color}, transparent)`,
        opacity: hovered ? 0.8 : 0.25,
        transition: 'opacity 0.35s',
      }} />
      <div style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '14px',
        color: hovered ? color : C.textDim,
        marginBottom: '10px',
        transition: 'color 0.35s',
        letterSpacing: '0.1em',
      }}>
        {rune}
      </div>
      <div style={{
        fontSize: 'clamp(28px, 3vw, 40px)',
        fontWeight: 700,
        color: hovered ? color : C.text,
        fontFamily: '"Cinzel", serif',
        textShadow: hovered ? `0 0 24px ${color}` : 'none',
        transition: 'all 0.35s',
        lineHeight: 1,
        marginBottom: '10px',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '10px',
        letterSpacing: '0.25em',
        color: C.textMuted,
        textTransform: 'uppercase',
        fontFamily: '"Cinzel", serif',
      }}>
        {label}
      </div>
    </div>
  )
}

// ── Drama Card (Currently Watching) ──────────────────────────────────────────
function DramaCard({ drama }) {
  const [hovered, setHovered] = useState(false)
  const progress = drama.episodes?.total
    ? (drama.episodes.current / drama.episodes.total) * 100 : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '150px', flexShrink: 0, cursor: 'pointer',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div style={{
        width: '150px', height: '210px',
        background: C.surface,
        border: `1px solid ${hovered ? C.electric + '88' : C.borderGold}`,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: hovered ? `0 12px 40px ${C.electricSoft}, 0 0 0 1px ${C.electric}33` : '0 4px 16px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease',
      }}>
        {drama.coverImage
          ? <img src={drama.coverImage} alt={drama.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '32px', background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>📺</div>
        }
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px',
          background: 'rgba(8,13,26,0.9)',
          border: `1px solid ${C.gold}55`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: C.gold,
          fontFamily: '"Cinzel", serif',
        }}>
          {drama.type}
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${C.electric}22, transparent)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s',
        }} />
        {hovered && <Corners color={C.electric} size={10} opacity={0.7} />}
      </div>
      {progress !== null && (
        <div style={{ height: '2px', background: C.borderGold, marginTop: '6px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: `linear-gradient(to right, ${C.ember}, ${C.electric})`,
            boxShadow: `0 0 6px ${C.electric}`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}
      <div style={{
        marginTop: '8px', fontSize: '12px', fontWeight: 600,
        color: hovered ? C.text : C.textMuted,
        transition: 'color 0.3s',
        lineHeight: 1.3,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {drama.title}
      </div>
      {drama.episodes?.total && (
        <div style={{ fontSize: '11px', color: C.textDim, marginTop: '3px' }}>
          Ep {drama.episodes.current} / {drama.episodes.total}
        </div>
      )}
    </div>
  )
}

// ── Recent Card ───────────────────────────────────────────────────────────────
function RecentCard({ drama }) {
  const [hovered, setHovered] = useState(false)
  const statusColor = {
    'Watching':       C.electric,
    'Completed':      '#22C55E',
    'Dropped':        '#EF4444',
    'Plan to Watch':  C.violet,
    'On Hold':        C.goldBright,
  }
  const sc = statusColor[drama.status] || C.textMuted

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '14px 20px',
        background: hovered ? `linear-gradient(90deg, ${C.surfaceHover}, ${C.surface})` : 'transparent',
        border: `1px solid ${hovered ? C.borderElec : 'transparent'}`,
        borderLeft: `2px solid ${hovered ? sc : C.textDim + '33'}`,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(90deg, ${sc}08, transparent)`,
        }} />
      )}
      <div style={{
        width: '38px', height: '54px', flexShrink: 0,
        background: C.surface,
        border: `1px solid ${hovered ? C.borderElec : C.borderGold}`,
        overflow: 'hidden',
        transition: 'border-color 0.25s',
      }}>
        {drama.coverImage
          ? <img src={drama.coverImage} alt={drama.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '14px' }}>📺</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 600,
          color: hovered ? C.text : '#9BAEC8',
          transition: 'color 0.25s',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {drama.title}
        </div>
        <div style={{
          fontSize: '11px', color: C.textDim, marginTop: '4px',
          display: 'flex', gap: '10px', letterSpacing: '0.05em',
        }}>
          <span style={{ color: C.gold + 'aa', fontFamily: '"Cinzel", serif' }}>{drama.type}</span>
          {drama.year && <span>{drama.year}</span>}
          {drama.genres?.[0] && <span>{drama.genres[0]}</span>}
        </div>
      </div>
      <div style={{
        fontSize: '10px', letterSpacing: '0.1em',
        color: sc,
        padding: '4px 10px',
        border: `1px solid ${sc}44`,
        background: `${sc}0f`,
        whiteSpace: 'nowrap',
        fontFamily: '"Cinzel", serif',
      }}>
        {drama.status}
      </div>
      {drama.rating && (
        <div style={{
          fontSize: '14px', fontWeight: 700,
          color: C.goldBright,
          minWidth: '36px', textAlign: 'right',
          textShadow: `0 0 10px ${C.gold}`,
          fontFamily: '"Cinzel", serif',
        }}>
          {drama.rating}<span style={{ fontSize: '9px', color: C.textDim, fontWeight: 400 }}>/10</span>
        </div>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, rune, count }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '16px',
          color: C.gold + '88',
          letterSpacing: '0.1em',
        }}>{rune}</span>
        <h2 style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.3em',
          color: C.text,
          margin: 0,
          textTransform: 'uppercase',
        }}>
          {title}
        </h2>
        {count > 0 && (
          <span style={{
            fontSize: '11px', color: C.electric,
            fontFamily: '"Cinzel", serif',
            border: `1px solid ${C.electric}44`,
            padding: '2px 8px',
            background: C.electricSoft,
          }}>
            {count}
          </span>
        )}
      </div>
      <div style={{
        height: '1px', marginTop: '14px',
        background: `linear-gradient(to right, ${C.gold}55, ${C.electric}22, transparent)`,
      }} />
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center',
      border: `1px dashed ${C.borderGold}`,
      color: C.textDim,
      position: 'relative',
    }}>
      <Corners color={C.gold} size={10} opacity={0.3} />
      <div style={{ fontFamily: '"Cinzel", serif', fontSize: '20px', color: C.gold + '44', marginBottom: '12px', letterSpacing: '0.3em' }}>ᛗᛁᛞᚷᚨᚱᛞ</div>
      <div style={{ fontSize: '13px', marginBottom: '20px', letterSpacing: '0.05em' }}>No entries yet in this realm</div>
      <button
        onClick={onAdd}
        style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '11px', letterSpacing: '0.2em',
          color: C.electric,
          background: 'transparent',
          border: `1px solid ${C.electric}55`,
          padding: '10px 28px',
          cursor: 'pointer',
          transition: 'all 0.3s',
          textTransform: 'uppercase',
        }}
        onMouseEnter={e => e.currentTarget.style.background = C.electricSoft}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        + Add Drama
      </button>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }) {
  const [dramas, setDramas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(API)
      .then(r => setDramas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const rated = dramas.filter(d => d.rating)
  const stats = {
    total:       dramas.length,
    watching:    dramas.filter(d => d.status === 'Watching').length,
    completed:   dramas.filter(d => d.status === 'Completed').length,
    planToWatch: dramas.filter(d => d.status === 'Plan to Watch').length,
    avgRating:   rated.length ? (rated.reduce((s, d) => s + d.rating, 0) / rated.length).toFixed(1) : '—',
  }
  const watching = dramas.filter(d => d.status === 'Watching')
  const recent   = [...dramas].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8)

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '52px' }}>
        <StatCard label="Total"         value={stats.total}       color={C.electric}   rune="ᛏ" />
        <StatCard label="Watching"      value={stats.watching}    color={C.electric}   rune="ᚹ" />
        <StatCard label="Completed"     value={stats.completed}   color="#22C55E"      rune="ᚲ" />
        <StatCard label="Plan to Watch" value={stats.planToWatch} color={C.violet}     rune="ᛈ" />
        <StatCard label="Avg Rating"    value={stats.avgRating}   color={C.goldBright} rune="★" />
      </div>

      <div style={{ marginBottom: '52px' }}>
        <SectionHeader title="Currently Watching" rune="ᚹ" count={watching.length} />
        {loading
          ? <div style={{ color: C.textDim, fontSize: '13px', letterSpacing: '0.1em' }}>Loading...</div>
          : watching.length === 0
            ? <EmptyState onAdd={() => onNavigate('Add New')} />
            : (
              <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '12px' }}>
                {watching.map(d => <DramaCard key={d._id} drama={d} />)}
              </div>
            )
        }
      </div>

      <div>
        <SectionHeader title="Recently Added" rune="ᚾ" count={recent.length} />
        {loading
          ? <div style={{ color: C.textDim, fontSize: '13px', letterSpacing: '0.1em' }}>Loading...</div>
          : recent.length === 0
            ? <EmptyState onAdd={() => onNavigate('Add New')} />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {recent.map(d => <RecentCard key={d._id} drama={d} />)}
              </div>
            )
        }
      </div>
    </div>
  )
}



// ── Main ──────────────────────────────────────────────────────────────────────
function Midgard() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDramaId, setSelectedDramaId] = useState(null)

  const handleNavigate = (page, payload = '') => {
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
        <div style={{ marginBottom: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
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
            {activePage === 'Search' ? `SEARCH` : activePage.toUpperCase()}
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
        {activePage === 'My List' && (
          <div style={{ color: C.textMuted, fontFamily: '"Cinzel", serif', letterSpacing: '0.15em', fontSize: '13px' }}>
            My List — coming soon
          </div>
        )}
        {activePage === 'Add New' && (
          <AddNew onSaved={() => handleNavigate('Dashboard')} />
        )}
        {/* Search page */}
        {activePage === 'Search' && (
          <SearchPage
            query={searchQuery}
            onSelectDrama={(item) => {
              // Step 3: navigate to Info page with this item
              // For now, log so we can confirm click works
              console.log('Selected:', item.id, item.name)
              handleNavigate('Info', item.id)
            }}
          />
        )}
        {/* Info page placeholder — Step 3 */}
        {activePage === 'Info' && (
          <div style={{ color: C.textMuted, fontFamily: '"Cinzel", serif', letterSpacing: '0.15em', fontSize: '13px' }}>
            Info page coming in Step 3 — TMDB ID: <span style={{ color: C.electric }}>{selectedDramaId}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export default Midgard