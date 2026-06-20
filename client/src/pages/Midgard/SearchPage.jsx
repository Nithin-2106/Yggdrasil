import { useState, useEffect, useRef } from 'react'
import { searchDramas, detectDramaType } from '../../utils/tmdbSearch'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY

const C = {
  bg:           '#080D1A',
  surface:      '#0F1829',
  surfaceHover: '#141F33',
  input:        '#0A1220',
  gold:         '#CA8A04',
  goldBright:   '#F59E0B',
  electric:     '#38BDF8',
  electricSoft: 'rgba(56,189,248,0.12)',
  violet:       '#7C3AED',
  violetSoft:   'rgba(124,58,237,0.15)',
  ember:        '#C2410C',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderGold:   'rgba(202,138,4,0.2)',
  borderElec:   'rgba(56,189,248,0.15)',
  green:        '#22C55E',
}

function detectType(item) {
  const label = detectDramaType(item)
  const colorMap = { Kdrama: C.electric, Cdrama: C.violet, Jdrama: C.goldBright }
  return { label, color: colorMap[label] || C.textMuted }
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{
        height: '240px',
        background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        border: `1px solid ${C.borderGold}`,
      }} />
      <div style={{ height: '12px', width: '80%', background: C.surface, borderRadius: '2px' }} />
      <div style={{ height: '10px', width: '40%', background: C.surface, borderRadius: '2px' }} />
    </div>
  )
}

// ── Filter pill ───────────────────────────────────────────────────────────────
function FilterPill({ label, active, color, onClick }) {
  const [hovered, setHovered] = useState(false)
  const isActive = active
  const c = color || C.electric
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '10px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: isActive ? C.bg : hovered ? c : C.textMuted,
        background: isActive ? c : hovered ? `${c}18` : 'transparent',
        border: `1px solid ${isActive ? c : hovered ? `${c}66` : C.borderGold}`,
        padding: '6px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ item, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const type = detectType(item)
  const year = item.first_air_date ? item.first_air_date.split('-')[0] : null
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null

  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.25s ease',
      }}
    >
      {/* Poster */}
      <div style={{
        position: 'relative',
        height: '240px',
        background: C.surface,
        border: `1px solid ${hovered ? type.color + '99' : C.borderGold}`,
        overflow: 'hidden',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${type.color}44`
          : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'all 0.25s ease',
      }}>
        {item.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: C.textDim, gap: '8px',
            background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
          }}>
            <div style={{ fontSize: '36px' }}>📺</div>
            <div style={{ fontSize: '10px', fontFamily: '"Cinzel", serif', letterSpacing: '0.15em', color: C.textDim }}>No Poster</div>
          </div>
        )}

        {/* Type badge */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px',
          background: 'rgba(8,13,26,0.92)',
          border: `1px solid ${type.color}66`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: type.color,
          fontFamily: '"Cinzel", serif',
          transition: 'border-color 0.25s',
        }}>
          {type.label}
        </div>

        {/* TMDB rating badge */}
        {rating && parseFloat(rating) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '3px 8px',
            background: 'rgba(8,13,26,0.92)',
            border: `1px solid ${C.gold}55`,
            fontSize: '10px',
            color: C.goldBright,
            fontFamily: '"Cinzel", serif',
            fontWeight: 700,
          }}>
            ★ {rating}
          </div>
        )}

        {/* Corner ornaments on hover */}
        {hovered && (
          <>
            <div style={{ position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderTop: `1px solid ${type.color}`, borderLeft: `1px solid ${type.color}` }} />
            <div style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderTop: `1px solid ${type.color}`, borderRight: `1px solid ${type.color}` }} />
            <div style={{ position: 'absolute', bottom: 6, left: 6, width: 10, height: 10, borderBottom: `1px solid ${type.color}`, borderLeft: `1px solid ${type.color}` }} />
            <div style={{ position: 'absolute', bottom: 6, right: 6, width: 10, height: 10, borderBottom: `1px solid ${type.color}`, borderRight: `1px solid ${type.color}` }} />
          </>
        )}
      </div>

      {/* Title + year below poster */}
      <div style={{ marginTop: '10px', padding: '0 2px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: hovered ? C.text : C.textMuted,
          transition: 'color 0.25s',
          lineHeight: 1.35,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {item.name || item.original_name}
        </div>
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center',
          marginTop: '5px',
        }}>
          {year && (
            <span style={{ fontSize: '11px', color: C.textDim }}>{year}</span>
          )}
          {item.origin_country?.length > 0 && (
            <span style={{
              fontSize: '9px',
              color: type.color + 'aa',
              fontFamily: '"Cinzel", serif',
              letterSpacing: '0.1em',
            }}>
              {item.origin_country[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyResults({ query }) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      padding: '64px 24px',
      textAlign: 'center',
      border: `1px dashed ${C.borderGold}`,
      position: 'relative',
    }}>
      {/* corner ornaments */}
      {[
        { top: 10, left: 10, borderTop: `1px solid ${C.gold}44`, borderLeft: `1px solid ${C.gold}44` },
        { top: 10, right: 10, borderTop: `1px solid ${C.gold}44`, borderRight: `1px solid ${C.gold}44` },
        { bottom: 10, left: 10, borderBottom: `1px solid ${C.gold}44`, borderLeft: `1px solid ${C.gold}44` },
        { bottom: 10, right: 10, borderBottom: `1px solid ${C.gold}44`, borderRight: `1px solid ${C.gold}44` },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 12, height: 12, ...s }} />
      ))}
      <div style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '24px',
        color: C.gold + '33',
        letterSpacing: '0.4em',
        marginBottom: '16px',
      }}>
        ᛟ
      </div>
      <div style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '13px',
        letterSpacing: '0.25em',
        color: C.textMuted,
        marginBottom: '8px',
      }}>
        No results found
      </div>
      <div style={{ fontSize: '12px', color: C.textDim, letterSpacing: '0.05em' }}>
        No dramas found for <span style={{ color: C.electric }}>"{query}"</span> — try a different title
      </div>
    </div>
  )
}

// ── Main SearchPage ───────────────────────────────────────────────────────────
export default function SearchPage({ query: initialQuery, onSelectDrama }) {
  const [query, setQuery]       = useState(initialQuery || '')
  const [results, setResults]   = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [focused, setFocused]   = useState(false)
  const inputRef = useRef(null)

  const filters = [
    { label: 'All',    color: C.electric },
    { label: 'Kdrama', color: C.electric },
    { label: 'Cdrama', color: C.violet },
    { label: 'Jdrama', color: C.goldBright },
  ]

  // Auto-search when query comes in from navbar
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
      runSearch(initialQuery)
    }
  }, [initialQuery])

  // Apply filter whenever results or activeFilter change
  useEffect(() => {
    if (activeFilter === 'All') {
      setFiltered(results)
    } else {
      setFiltered(results.filter(item => detectType(item).label === activeFilter))
    }
  }, [results, activeFilter])

  const runSearch = async (q) => {
  if (!q.trim()) return
  setLoading(true)
  setSearched(true)
  setActiveFilter('All')
  try {
    const res = await searchDramas(q)
    setResults(res)
  } catch {
    setResults([])
  } finally {
    setLoading(false)
  }
}

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') runSearch(query)
  }

  return (
    <>
      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      {/* Search bar row */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '28px', alignItems: 'center',
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)',
            color: focused ? C.electric : C.textDim,
            fontSize: '16px', pointerEvents: 'none',
            transition: 'color 0.25s',
          }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search for a drama, movie or series..."
            style={{
              width: '100%',
              padding: '13px 14px 13px 44px',
              background: C.input,
              border: `1px solid ${focused ? C.electric + '99' : C.borderGold}`,
              color: C.text,
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: focused ? `0 0 20px rgba(56,189,248,0.12)` : 'none',
              transition: 'all 0.25s ease',
            }}
          />
        </div>
        <button
          onClick={() => runSearch(query)}
          disabled={loading}
          style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '11px', letterSpacing: '0.2em',
            color: C.electric,
            background: C.electricSoft,
            border: `1px solid ${C.electric}55`,
            padding: '0 28px',
            height: '48px',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.25s',
            whiteSpace: 'nowrap',
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(56,189,248,0.2)' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.electricSoft }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Filter pills — only show after first search */}
      {searched && !loading && results.length > 0 && (
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '28px',
          alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: '10px', letterSpacing: '0.25em',
            color: C.textDim, fontFamily: '"Cinzel", serif',
            marginRight: '4px', textTransform: 'uppercase',
          }}>Filter</span>
          <div style={{ width: '1px', height: '16px', background: C.borderGold }} />
          {filters.map(f => (
            <FilterPill
              key={f.label}
              label={f.label}
              color={f.color}
              active={activeFilter === f.label}
              onClick={() => setActiveFilter(f.label)}
            />
          ))}
          {/* Result count */}
          <span style={{
            marginLeft: 'auto',
            fontSize: '11px',
            color: C.textDim,
            fontFamily: '"Cinzel", serif',
            letterSpacing: '0.1em',
          }}>
            <span style={{ color: C.electric }}>{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Divider before results */}
      {searched && (
        <div style={{
          height: '1px', marginBottom: '32px',
          background: `linear-gradient(to right, ${C.ember}66, ${C.electric}33, transparent)`,
        }} />
      )}

      {/* Results grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '20px 16px',
      }}>

        {/* Loading skeletons */}
        {loading && Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}

        {/* Empty state */}
        {!loading && searched && filtered.length === 0 && (
          <EmptyResults query={query} />
        )}

        {/* Result cards */}
        {!loading && filtered.map(item => (
          <ResultCard
            key={item.id}
            item={item}
            onSelect={onSelectDrama}
          />
        ))}
      </div>

      {/* Pre-search prompt */}
      {!searched && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: '35vh', gap: '16px',
        }}>
          <div style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '40px',
            color: C.gold + '22',
            letterSpacing: '0.3em',
          }}>ᛟ</div>
          <div style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '12px',
            letterSpacing: '0.3em',
            color: C.textDim,
            textTransform: 'uppercase',
          }}>Search the realms</div>
        </div>
      )}
    </>
  )
}