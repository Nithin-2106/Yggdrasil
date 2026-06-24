import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { searchDramas, detectDramaType } from '../../utils/tmdbSearch'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const TMDB_BASE = 'http://localhost:5000/api/tmdb'
const IMG_BASE = 'https://image.tmdb.org/t/p'
const API = 'http://localhost:5000/api/drama'
const TOP10_API = 'http://localhost:5000/api/top10'

const C = {
  bg:           '#080D1A',
  surface:      '#0F1829',
  surfaceHover: '#141F33',
  input:        '#0A1220',
  ember:        '#C2410C',
  emberSoft:    'rgba(194,65,12,0.15)',
  gold:         '#CA8A04',
  goldBright:   '#F59E0B',
  goldSoft:     'rgba(202,138,4,0.15)',
  electric:     '#38BDF8',
  electricSoft: 'rgba(56,189,248,0.12)',
  violet:       '#7C3AED',
  violetSoft:   'rgba(124,58,237,0.15)',
  green:        '#22C55E',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderGold:   'rgba(202,138,4,0.2)',
  borderElec:   'rgba(56,189,248,0.15)',
}

// ── TMDB helpers ──────────────────────────────────────────────────────────────
const ALLOWED_COUNTRIES = new Set(['KR', 'CN', 'TW', 'HK', 'JP'])
const ALLOWED_LANGUAGES = new Set(['ko', 'zh', 'ja'])
const BLOCKED_GENRES    = new Set([16, 10764, 10767, 10763, 10766])

function isValidDrama(item) {
  const countries = (item.origin_country || []).map(c => c.toUpperCase())
  const lang      = (item.original_language || '').toLowerCase()
  const genres    = item.genre_ids || []
  const validOrigin =
    countries.some(c => ALLOWED_COUNTRIES.has(c)) ||
    ALLOWED_LANGUAGES.has(lang)
  if (!validOrigin) return false
  if (genres.some(g => BLOCKED_GENRES.has(g))) return false
  return true
}

function getDramaType(item) {
  const countries = (item.origin_country || []).map(c => c.toUpperCase())
  const lang      = (item.original_language || '').toLowerCase()
  if (countries.includes('KR') || lang === 'ko') return 'Kdrama'
  if (['CN','TW','HK'].some(c => countries.includes(c)) || lang === 'zh') return 'Cdrama'
  if (countries.includes('JP') || lang === 'ja') return 'Jdrama'
  return 'Drama'
}

function typeLabel(type) {
  if (type === 'Kdrama') return 'Korean'
  if (type === 'Cdrama') return 'Chinese'
  if (type === 'Jdrama') return 'Japanese'
  return type
}

function typeColor(type) {
  if (type === 'Kdrama') return C.electric
  if (type === 'Cdrama') return C.violet
  if (type === 'Jdrama') return C.goldBright
  return C.electric
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────
function Corners({ color = C.goldBright, size = 12, opacity = 0.4 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 8, left: 8,    borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 8, right: 8,   borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 8, left: 8,  borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 8, right: 8, borderBottom: b, borderRight: b }} />
    </>
  )
}

function SectionHeader({ title, rune, count, right }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '16px', color: C.gold + '88', letterSpacing: '0.1em',
        }}>{rune}</span>
        <h2 style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '13px', fontWeight: 600,
          letterSpacing: '0.3em', color: C.text,
          margin: 0, textTransform: 'uppercase',
        }}>{title}</h2>
        {count > 0 && (
          <span style={{
            fontSize: '11px', color: C.electric,
            fontFamily: '"Cinzel", serif',
            border: `1px solid ${C.electric}44`,
            padding: '2px 8px', background: C.electricSoft,
          }}>{count}</span>
        )}
        {right && (
          <div style={{ marginLeft: 'auto' }}>{right}</div>
        )}
      </div>
      <div style={{
        height: '1px', marginTop: '14px',
        background: `linear-gradient(to right, ${C.gold}55, ${C.electric}22, transparent)`,
      }} />
    </div>
  )
}

// ── 1. STATS ROW ─────────────────────────────────────────────────────────────
import Counter from '../../components/Counter'

function StatCard({ label, value, color, rune }) {
  const [hovered, setHovered] = useState(false)
  const isNumeric = typeof value === 'number' ||
    (typeof value === 'string' && !isNaN(parseFloat(value)) && value !== '—')
  const numericValue = isNumeric ? parseFloat(value) : 0

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
        cursor: 'default', position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}
    >
      <Corners color={hovered ? color : C.gold} size={10} opacity={hovered ? 0.8 : 0.3} />
      <div style={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px',
        background: `linear-gradient(to right, transparent, ${color}, transparent)`,
        opacity: hovered ? 0.8 : 0.25, transition: 'opacity 0.35s',
      }} />
      <div style={{
        fontFamily: '"Cinzel", serif', fontSize: '14px',
        color: hovered ? color : C.textDim,
        marginBottom: '10px', transition: 'color 0.35s', letterSpacing: '0.1em',
      }}>{rune}</div>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'baseline' }}>
        {isNumeric ? (
          <Counter
            value={numericValue} fontSize={36} padding={4} gap={1}
            horizontalPadding={0} borderRadius={0} gradientHeight={0}
            textColor={hovered ? color : C.text} fontWeight={700}
            counterStyle={{
              fontFamily: '"Cinzel", serif',
              transition: 'color 0.35s',
            }}
          />
        ) : (
          <span style={{
            fontSize: '36px', fontWeight: 700,
            color: hovered ? color : C.text,
            fontFamily: '"Cinzel", serif',
            lineHeight: 1,
            transition: 'color 0.35s',
          }}>{value}</span>
        )}
      </div>
      <div style={{
        fontSize: '10px', letterSpacing: '0.25em',
        color: C.textMuted, textTransform: 'uppercase',
        fontFamily: '"Cinzel", serif',
      }}>{label}</div>
    </div>
  )
}

function StatsRow({ dramas }) {
  const rated = dramas.filter(d => d.rating)
  const stats = {
    total:       dramas.length,
    watching:    dramas.filter(d => d.status === 'Watching').length,
    completed:   dramas.filter(d => d.status === 'Completed').length,
    planToWatch: dramas.filter(d => d.status === 'Plan to Watch').length,
    avgRating:   rated.length
      ? (rated.reduce((s, d) => s + d.rating, 0) / rated.length).toFixed(1)
      : '—',
  }
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '52px' }}>
      <StatCard label="Total"         value={stats.total}       color={C.electric}   rune="ᛏ" />
      <StatCard label="Watching"      value={stats.watching}    color={C.electric}   rune="ᚹ" />
      <StatCard label="Completed"     value={stats.completed}   color={C.green}      rune="ᚲ" />
      <StatCard label="Plan to Watch" value={stats.planToWatch} color={C.violet}     rune="ᛈ" />
      <StatCard label="Avg Rating"    value={stats.avgRating}   color={C.goldBright} rune="★" />
    </div>
  )
}

// ── 2. TRENDING (TMDB) ────────────────────────────────────────────────────────
function TrendingCard({ item, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const type  = getDramaType(item)
  const tColor = typeColor(type)
  const year  = item.first_air_date ? item.first_air_date.split('-')[0] : null
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null

  return (
    <div
      onClick={() => onNavigate('Info', item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0, width: '160px', cursor: 'pointer',
        transform: hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div style={{
        width: '160px', height: '220px',
        background: C.surface,
        border: `1px solid ${hovered ? tColor + '99' : C.borderGold}`,
        overflow: 'hidden', position: 'relative',
        boxShadow: hovered
          ? `0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px ${tColor}44`
          : '0 4px 16px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease',
      }}>
        {item.poster_path ? (
          <img
            src={`${IMG_BASE}/w300${item.poster_path}`}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.textDim, fontSize: '32px',
            background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
          }}>📺</div>
        )}
        {/* Type badge */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px',
          background: 'rgba(8,13,26,0.9)',
          border: `1px solid ${tColor}66`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: tColor, fontFamily: '"Cinzel", serif',
        }}>{typeLabel(type)}</div>
        {/* Rating badge */}
        {rating && parseFloat(rating) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '3px 8px',
            background: 'rgba(8,13,26,0.9)',
            border: `1px solid ${C.gold}55`,
            fontSize: '10px', color: C.goldBright,
            fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>★ {rating}</div>
        )}
        {/* Hover glow overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${tColor}33, transparent 60%)`,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
        }} />
        {hovered && <Corners color={tColor} size={10} opacity={0.7} />}
      </div>
      <div style={{ marginTop: '10px', padding: '0 2px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 600,
          color: hovered ? C.text : C.textMuted,
          transition: 'color 0.25s', lineHeight: 1.35,
          overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{item.name || item.original_name}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
          {year && <span style={{ fontSize: '11px', color: C.textDim }}>{year}</span>}
          {item.origin_country?.[0] && (
            <span style={{ fontSize: '9px', color: tColor + 'aa', fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
              {item.origin_country[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function HorizontalScroll({ children }) {
  const ref = useRef(null)
  const [canLeft, setCanLeft]   = useState(false)
  const [canRight, setCanRight] = useState(true)

  const check = () => {
    if (!ref.current) return
    setCanLeft(ref.current.scrollLeft > 8)
    setCanRight(ref.current.scrollLeft < ref.current.scrollWidth - ref.current.clientWidth - 8)
  }

  const scroll = (dir) => {
    if (!ref.current) return
    ref.current.scrollBy({ left: dir * 520, behavior: 'smooth' })
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Left arrow */}
      {canLeft && (
        <button onClick={() => scroll(-1)} style={{
          position: 'absolute', left: '-16px', top: '50%',
          transform: 'translateY(-60%)',
          zIndex: 10, width: '36px', height: '36px',
          background: 'rgba(8,13,26,0.92)',
          border: `1px solid ${C.borderGold}`,
          color: C.goldBright, fontSize: '16px',
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.electric}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.borderGold}
        >‹</button>
      )}
      <div
        ref={ref}
        onScroll={check}
        style={{
          display: 'flex', gap: '14px',
          overflowX: 'auto', paddingBottom: '12px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}
        className="hide-scroll"
      >
        {children}
      </div>
      {/* Right arrow */}
      {canRight && (
        <button onClick={() => scroll(1)} style={{
          position: 'absolute', right: '-16px', top: '50%',
          transform: 'translateY(-60%)',
          zIndex: 10, width: '36px', height: '36px',
          background: 'rgba(8,13,26,0.92)',
          border: `1px solid ${C.borderGold}`,
          color: C.goldBright, fontSize: '16px',
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.electric}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.borderGold}
        >›</button>
      )}
    </div>
  )
}

function TrendingSection({ onNavigate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const countries = ['KR', 'CN', 'JP', 'TW']
    const fetches = countries.flatMap(country =>
      [1, 2, 3].map(page =>
        fetch(`${TMDB_BASE}/discover/tv?with_origin_country=${country}&sort_by=popularity.desc&page=${page}`)
          .then(r => r.json())
          .then(d => d.results || [])
          .catch(() => [])
      )
    )
    Promise.all(fetches).then(pages => {
      const seen = new Set()
      const filtered = pages.flat().filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        const genres = item.genre_ids || []
        return item.poster_path && !genres.some(g => BLOCKED_GENRES.has(g))
      }).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 20)
      setItems(filtered)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Trending This Week" rune="ᚦ" />
      <div style={{ display: 'flex', gap: '14px' }}>
        {Array(6).fill(0).map((_, i) => (
          <div key={i} style={{
            flexShrink: 0, width: '160px', height: '220px',
            background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
            border: `1px solid ${C.borderGold}`,
          }} />
        ))}
      </div>
    </div>
  )

  if (!items.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Trending This Week" rune="ᚦ" count={items.length} />
      <HorizontalScroll>
        {items.map(item => (
          <TrendingCard key={item.id} item={item} onNavigate={onNavigate} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 3. CURRENTLY WATCHING ─────────────────────────────────────────────────────
function WatchingCard({ drama, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const progress = drama.episodes?.total
    ? (drama.episodes.current / drama.episodes.total) * 100
    : null

  return (
    <div
      onClick={() => drama.tmdbId && onNavigate('Info', drama.tmdbId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0, width: '150px', cursor: drama.tmdbId ? 'pointer' : 'default',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div style={{
        width: '150px', height: '210px',
        background: C.surface,
        border: `1px solid ${hovered ? C.electric + '88' : C.borderGold}`,
        overflow: 'hidden', position: 'relative',
        boxShadow: hovered
          ? `0 12px 40px ${C.electricSoft}, 0 0 0 1px ${C.electric}33`
          : '0 4px 16px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease',
      }}>
        {drama.coverImage
          ? <img src={drama.coverImage} alt={drama.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '32px', background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>📺</div>
        }
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px', background: 'rgba(8,13,26,0.9)',
          border: `1px solid ${C.gold}55`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: C.gold, fontFamily: '"Cinzel", serif',
        }}>{typeLabel(drama.type)}</div>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${C.electric}22, transparent)`,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
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
        transition: 'color 0.3s', lineHeight: 1.3,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>{drama.title}</div>
      {drama.episodes?.total && (
        <div style={{ fontSize: '11px', color: C.textDim, marginTop: '3px' }}>
          Ep {drama.episodes.current} / {drama.episodes.total}
        </div>
      )}
    </div>
  )
}

function CurrentlyWatchingSection({ dramas, onNavigate }) {
  const watching = dramas.filter(d => d.status === 'Watching')
  if (!watching.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Currently Watching" rune="ᚹ" count={watching.length} />
      <HorizontalScroll>
        {watching.map(d => (
          <WatchingCard key={d._id} drama={d} onNavigate={onNavigate} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 4. TOP 10 (Netflix style) ─────────────────────────────────────────────────
function Top10SearchModal({ position, region, onClose, onSaved }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await searchDramas(query)
      setResults(res.slice(0, 12))
    } catch { setResults([]) }
    finally { setLoading(false) }
  }

  const select = async (item) => {
    try {
      await axios.put(`${TOP10_API}/${region}/${position}`, {
        tmdbId:     item.id,
        title:      item.name || item.original_name || '',
        coverImage: item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : '',
        year:       item.first_air_date ? parseInt(item.first_air_date.split('-')[0]) : null,
        type:       getDramaType(item),
      })
      onSaved()
    } catch (err) { console.error(err) }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(5,10,20,0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{
        background: C.surface,
        border: `1px solid ${C.borderGold}`,
        width: '100%', maxWidth: '600px',
        maxHeight: '80vh', overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 0 80px rgba(0,0,0,0.8)',
      }}>
        <Corners color={C.goldBright} size={12} opacity={0.4} />

        {/* Header */}
        <div style={{
          padding: '18px 24px 14px',
          borderBottom: `1px solid ${C.borderGold}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: C.surface, zIndex: 10,
        }}>
          <span style={{
            fontFamily: '"Cinzel", serif', fontSize: '12px',
            letterSpacing: '0.3em', color: C.goldBright,
          }}>SELECT FOR SLOT #{position}</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: C.textDim, fontSize: '20px', cursor: 'pointer',
          }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '20px 24px 16px', display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '12px', top: '50%',
              transform: 'translateY(-50%)',
              color: focused ? C.electric : C.textDim, fontSize: '14px',
            }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search drama title..."
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                background: C.input,
                border: `1px solid ${focused ? C.electric + '88' : C.borderGold}`,
                color: C.text, fontSize: '13px',
                fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>
          <button
            onClick={search} disabled={loading}
            style={{
              fontFamily: '"Cinzel", serif', fontSize: '11px',
              letterSpacing: '0.15em', color: C.electric,
              background: C.electricSoft,
              border: `1px solid ${C.electric}55`,
              padding: '0 20px', cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >{loading ? '...' : 'Search'}</button>
        </div>

        {/* Results */}
        <div style={{
          padding: '0 24px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: '12px',
        }}>
          {results.map(item => {
            const tc = typeColor(getDramaType(item))
            return (
              <div
                key={item.id}
                onClick={() => select(item)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{
                  height: '150px', background: C.bg,
                  border: `1px solid ${C.borderGold}`,
                  overflow: 'hidden', position: 'relative',
                  transition: 'border-color 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = tc}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.borderGold}
                >
                  {item.poster_path
                    ? <img src={`${IMG_BASE}/w185${item.poster_path}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim }}>📺</div>
                  }
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: C.textMuted, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.name || item.original_name}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Top10Card({ entry, index, onEdit, onClear, onNavigate }) {
  const [hovered, setHovered]         = useState(false)
  const [showActions, setShowActions] = useState(false)
  const isEmpty  = !entry.tmdbId
  const tColor   = entry.type ? typeColor(entry.type) : C.textDim
  const numStr   = String(index + 1)

  // Rank colours: gold for 1-3, electric for 4-6, violet for 7-10
  const rankColor = index === 0
    ? '#FFD700'
    : index === 1
      ? '#E8C04A'
      : index === 2
        ? '#C9963A'
        : index <= 5
          ? C.electric
          : C.violet

  return (
    <div
      style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}
      onMouseEnter={() => { setHovered(true); setShowActions(true) }}
      onMouseLeave={() => { setHovered(false); setShowActions(false) }}
    >
      {/* Big rank number */}
      <div style={{
        fontFamily: '"Cinzel Decorative", "Cinzel", serif',
        fontSize: 'clamp(100px, 12vw, 150px)',
        fontWeight: 900,
        lineHeight: 1,
        color: 'transparent',
        WebkitTextStroke: `3px ${isEmpty ? rankColor + '22' : rankColor + (hovered ? 'cc' : '66')}`,
        textShadow: hovered && !isEmpty
          ? `0 0 60px ${rankColor}44, 0 0 120px ${rankColor}22`
          : 'none',
        userSelect: 'none',
        marginRight: '-22px',
        zIndex: 1,
        transition: 'all 0.3s ease',
        letterSpacing: '-0.05em',
      }}>{numStr}</div>

      {/* Poster card */}
      <div
        onClick={() => {
          if (isEmpty) { onEdit() }
          else if (entry.tmdbId) onNavigate('Info', entry.tmdbId)
        }}
        style={{
          width: '140px', height: '200px',
          flexShrink: 0, position: 'relative', zIndex: 2,
          background: isEmpty ? C.surface : C.bg,
          border: `1px solid ${hovered
            ? isEmpty ? C.gold + '66' : tColor + '99'
            : isEmpty ? C.borderGold + '88' : C.borderGold}`,
          overflow: 'hidden', cursor: 'pointer',
          transform: hovered ? 'translateY(-10px) scale(1.03)' : 'translateY(0) scale(1)',
          transformOrigin: 'bottom center',
          transition: 'all 0.3s ease',
          boxShadow: hovered && !isEmpty
            ? `0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px ${tColor}44`
            : hovered && isEmpty
              ? `0 8px 24px rgba(0,0,0,0.5)`
              : '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        {isEmpty ? (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '10px', color: C.textDim,
          }}>
            <div style={{ fontSize: '28px', opacity: 0.4 }}>+</div>
            <div style={{
              fontSize: '9px', letterSpacing: '0.2em',
              fontFamily: '"Cinzel", serif', color: C.textDim + '88',
              textAlign: 'center', padding: '0 12px',
            }}>CLICK TO ADD</div>
          </div>
        ) : (
          <>
            {entry.coverImage
              ? <img src={entry.coverImage} alt={entry.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px' }}>📺</div>
            }
            {/* Type badge */}
            <div style={{
              position: 'absolute', top: '6px', left: '6px',
              padding: '2px 7px',
              background: 'rgba(8,13,26,0.9)',
              border: `1px solid ${tColor}55`,
              fontSize: '9px', color: tColor,
              fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
            }}>{typeLabel(entry.type)}</div>
            {/* Gradient overlay on hover */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(to top, ${tColor}44, transparent 60%)`,
              opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
            }} />
          </>
        )}
        {hovered && <Corners color={isEmpty ? C.gold : tColor} size={9} opacity={0.6} />}
      </div>

      {/* Action buttons on hover */}
      {showActions && !isEmpty && (
        <div style={{
          position: 'absolute',
          bottom: '-34px', left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: '6px', zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            style={{
              fontFamily: '"Cinzel", serif', fontSize: '9px',
              letterSpacing: '0.1em', color: C.electric,
              background: 'rgba(8,13,26,0.95)',
              border: `1px solid ${C.electric}44`,
              padding: '4px 10px', cursor: 'pointer',
            }}
          >Edit</button>
          <button
            onClick={e => { e.stopPropagation(); onClear() }}
            style={{
              fontFamily: '"Cinzel", serif', fontSize: '9px',
              letterSpacing: '0.1em', color: '#EF4444',
              background: 'rgba(8,13,26,0.95)',
              border: '1px solid rgba(239,68,68,0.3)',
              padding: '4px 10px', cursor: 'pointer',
            }}
          >Clear</button>
        </div>
      )}
    </div>
  )
}

const REGIONS = ['Korean', 'Chinese', 'Japanese']

function Top10Section({ onNavigate }) {
  const [region, setRegion]       = useState('Korean')
  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalSlot, setModalSlot] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  const load = useCallback(async (r) => {
    setLoading(true)
    try {
      const res = await axios.get(`${TOP10_API}/${r}`)
      // Ensure 10 slots always
      const slots = Array.from({ length: 10 }, (_, i) => {
        const found = res.data.entries?.find(e => e.position === i + 1)
        return found || { position: i + 1, tmdbId: null, title: '', coverImage: '', year: null, type: '' }
      })
      setEntries(slots)
    } catch { setEntries(Array.from({ length: 10 }, (_, i) => ({ position: i + 1, tmdbId: null, title: '', coverImage: '', year: null, type: '' }))) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(region) }, [region, load])

  const clearSlot = async (pos) => {
  if (!user) {
    navigate('/profile')
    return
  }

  try {
    await axios.delete(`${TOP10}/${pos}`)
    load()
  } catch (err) {
    console.error(err)
  }
}

  const regionTabColor = { Korean: C.electric, Chinese: C.violet, Japanese: C.goldBright }

  return (
    <div style={{ marginBottom: '72px' }}>
      <SectionHeader
        title="Top 10"
        rune="ᛏ"
        right={
          <div style={{ display: 'flex', gap: '6px' }}>
            {REGIONS.map(r => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                style={{
                  fontFamily: '"Cinzel", serif', fontSize: '10px',
                  letterSpacing: '0.15em',
                  color: region === r ? regionTabColor[r] : C.textDim,
                  background: region === r ? `${regionTabColor[r]}15` : 'transparent',
                  border: `1px solid ${region === r ? regionTabColor[r] + '55' : C.borderGold}`,
                  padding: '6px 14px', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >{r}</button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', gap: '4px' }}>
          {Array(10).fill(0).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '60px', height: '90px', background: C.surface, opacity: 0.3 }} />
              <div style={{ width: '140px', height: '200px', background: C.surface, border: `1px solid ${C.borderGold}` }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: '44px', paddingTop: '16px' }}
          className="hide-scroll"
        >
          <div style={{ display: 'flex', gap: '4px', minWidth: 'max-content' }}>
            {entries.map((entry, i) => (
              <Top10Card
                key={entry.position}
                entry={entry}
                index={i}
                onEdit={() => {
  if (!user) {
    navigate('/profile')
    return
  }

  setModalSlot(entry.position)
}}
                onClear={() => clearSlot(entry.position)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {modalSlot !== null && (
        <Top10SearchModal
          position={modalSlot}
          region={region}
          onClose={() => setModalSlot(null)}
          onSaved={() => { setModalSlot(null); load(region) }}
        />
      )}
    </div>
  )
}

// ── 5. RECENTLY RELEASED (TMDB on-air) ───────────────────────────────────────
function RecentlyReleasedSection({ onNavigate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const countries = ['KR', 'CN', 'JP', 'TW']
    const fetches = countries.flatMap(country =>
      [1, 2].map(page =>
        fetch(`${TMDB_BASE}/discover/tv?with_origin_country=${country}&first_air_date.gte=${threeMonthsAgo}&sort_by=first_air_date.desc&page=${page}`)
          .then(r => r.json())
          .then(d => d.results || [])
          .catch(() => [])
      )
    )
    Promise.all(fetches).then(pages => {
      const seen = new Set()
      const filtered = pages.flat().filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        const genres = item.genre_ids || []
        return item.poster_path && !genres.some(g => BLOCKED_GENRES.has(g))
      }).sort((a, b) => (b.first_air_date || '').localeCompare(a.first_air_date || '')).slice(0, 20)
      setItems(filtered)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Recently Released" rune="ᚾ" />
      <div style={{ display: 'flex', gap: '14px' }}>
        {Array(5).fill(0).map((_, i) => (
          <div key={i} style={{
            flexShrink: 0, width: '160px', height: '220px',
            background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
            border: `1px solid ${C.borderGold}`,
          }} />
        ))}
      </div>
    </div>
  )

  if (!items.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Recently Released" rune="ᚾ" count={items.length} />
      <HorizontalScroll>
        {items.map(item => (
          <TrendingCard key={item.id} item={item} onNavigate={onNavigate} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 6. EXPLORE NEW (random 6 with refresh) ───────────────────────────────────
function ExploreSection({ onNavigate }) {
  const [pool, setPool]         = useState([])
  const [shown, setShown]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [spinning, setSpinning] = useState(false)
  const shownIds = useRef(new Set())

  const loadPool = async () => {
    setLoading(true)
    try {
      const queries = [
        `with_origin_country=KR&sort_by=popularity.desc`,
        `with_origin_country=KR&sort_by=vote_average.desc&vote_count.gte=100`,
        `with_origin_country=CN&sort_by=popularity.desc`,
        `with_origin_country=TW&sort_by=popularity.desc`,
        `with_origin_country=JP&sort_by=popularity.desc`,
        `with_origin_country=KR&sort_by=first_air_date.desc`,
      ]
      const pages = await Promise.all(
        queries.flatMap(q => [1, 2].map(p =>
          fetch(`${TMDB_BASE}/discover/tv?${q}&page=${p}`)
            .then(r => r.json())
            .then(d => d.results || [])
            .catch(() => [])
        ))
      )
      const seen = new Set()
      const all = pages.flat().filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return item.poster_path && isValidDrama(item)
      })
      setPool(all)
      const initial = pick6(all, new Set())
      shownIds.current = new Set(initial.map(i => i.id))
      setShown(initial)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadPool() }, [])

  function pick6(arr, excludeIds) {
    const available = arr.filter(i => !excludeIds.has(i.id))
    const source = available.length >= 6 ? available : arr
    const shuffled = [...source].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 6)
  }

  const refresh = () => {
    setSpinning(true)
    const next = pick6(pool, shownIds.current)
    shownIds.current = new Set(next.map(i => i.id))
    setShown(next)
    setTimeout(() => setSpinning(false), 400)
  }

  const RefreshButton = (
    <button
      onClick={refresh}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontFamily: '"Cinzel", serif', fontSize: '10px',
        letterSpacing: '0.2em', color: C.electric,
        background: 'transparent',
        border: `1px solid ${C.electric}44`,
        padding: '6px 14px', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = C.electricSoft}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{
        display: 'inline-block',
        transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
        transition: 'transform 0.4s ease',
        fontSize: '13px',
      }}>↻</span>
      Refresh
    </button>
  )

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Explore New" rune="ᚱ" right={RefreshButton} />
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '14px',
        }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} style={{
              height: '220px',
              background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
              border: `1px solid ${C.borderGold}`,
            }} />
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '14px',
          opacity: spinning ? 0.4 : 1,
          transition: 'opacity 0.2s',
        }}>
          {shown.map(item => (
            <TrendingCard key={item.id} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 7. RECENTLY ADDED (my list, last 10) ─────────────────────────────────────
function RecentlyAddedCard({ drama, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const sc = {
    'Watching': C.electric, 'Completed': C.green,
    'Dropped': '#EF4444', 'Plan to Watch': C.violet, 'On Hold': C.goldBright,
  }[drama.status] || C.textMuted

  return (
    <div
      onClick={() => drama.tmdbId && onNavigate('Info', drama.tmdbId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '14px 20px',
        background: hovered ? `linear-gradient(90deg, ${C.surfaceHover}, ${C.surface})` : 'transparent',
        border: `1px solid ${hovered ? C.borderElec : 'transparent'}`,
        borderLeft: `2px solid ${hovered ? sc : C.textDim + '33'}`,
        cursor: drama.tmdbId ? 'pointer' : 'default',
        transition: 'all 0.25s ease',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(90deg, ${sc}08, transparent)`,
        }} />
      )}
      <div style={{
        width: '42px', height: '60px', flexShrink: 0,
        background: C.surface,
        border: `1px solid ${hovered ? C.borderElec : C.borderGold}`,
        overflow: 'hidden', transition: 'border-color 0.25s',
      }}>
        {drama.coverImage
          ? <img src={drama.coverImage} alt={drama.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '16px' }}>📺</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 600,
          color: hovered ? C.text : '#9BAEC8',
          transition: 'color 0.25s',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{drama.title}</div>
        <div style={{
          fontSize: '11px', color: C.textDim, marginTop: '4px',
          display: 'flex', gap: '10px', letterSpacing: '0.05em',
        }}>
          <span style={{ color: C.gold + 'aa', fontFamily: '"Cinzel", serif' }}>{typeLabel(drama.type)}</span>
          {drama.year && <span>{drama.year}</span>}
          {drama.genres?.[0] && <span>{drama.genres[0]}</span>}
        </div>
      </div>
      <div style={{
        fontSize: '10px', letterSpacing: '0.1em',
        color: sc, padding: '4px 10px',
        border: `1px solid ${sc}44`,
        background: `${sc}0f`,
        whiteSpace: 'nowrap', fontFamily: '"Cinzel", serif',
      }}>{drama.status}</div>
      {drama.rating && (
        <div style={{
          fontSize: '14px', fontWeight: 700,
          color: C.goldBright, minWidth: '36px', textAlign: 'right',
          textShadow: `0 0 10px ${C.gold}`,
          fontFamily: '"Cinzel", serif',
        }}>
          {drama.rating}<span style={{ fontSize: '9px', color: C.textDim, fontWeight: 400 }}>/10</span>
        </div>
      )}
    </div>
  )
}

function RecentlyAddedSection({ onNavigate }) {
  const [dramas, setDramas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(API)
      .then(r => setDramas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const recent = [...dramas]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)

  if (!recent.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Recently Added to My List" rune="ᛊ" count={recent.length} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {recent.map(d => (
          <RecentlyAddedCard key={d._id} drama={d} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  )
}

// ── MAIN DASHBOARD EXPORT ─────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const [dramas, setDramas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(API)
      .then(r => setDramas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 1. Stats */}
      <StatsRow dramas={dramas} />

      {/* 2. Trending */}
      <TrendingSection onNavigate={onNavigate} />

      {/* 3. Currently Watching — only if entries exist */}
      {!loading && <CurrentlyWatchingSection dramas={dramas} onNavigate={onNavigate} />}

      {/* 4. Top 10 */}
      <Top10Section onNavigate={onNavigate} />

      {/* 5. Recently Released */}
      <RecentlyReleasedSection onNavigate={onNavigate} />

      {/* 6. Explore New */}
      <ExploreSection onNavigate={onNavigate} />

      {/* 7. Recently Added — fetches its own data */}
      <RecentlyAddedSection onNavigate={onNavigate} />
    </div>
  )
}