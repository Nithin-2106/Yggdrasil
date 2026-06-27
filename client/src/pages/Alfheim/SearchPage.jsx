// client/src/pages/Alfheim/SearchPage.jsx
import { useState, useEffect, useRef } from 'react'
import { searchAnime, detectAnimeFormat, getAnimeYear } from '../../utils/jikanSearch'

const C = {
  bg:           '#050C10',
  surface:      '#0A1A20',
  surfaceHover: '#0E2228',
  input:        '#071318',
  primary:      '#5EEAD4',
  primarySoft:  'rgba(94,234,212,0.12)',
  aurora:       '#C084FC',
  green:        '#34D399',
  gold:         '#A3E635',
  text:         '#E0F7F4',
  textMuted:    '#7ABFB8',
  textDim:      '#2E5A56',
  borderPrimary:'rgba(94,234,212,0.2)',
}

const FORMAT_COLOR = {
  Movie:   '#A3E635',
  OVA:     '#C084FC',
  Special: '#34D399',
  Series:  '#5EEAD4',
}

const FILTERS = [
  { label: 'All',     color: C.primary },
  { label: 'Series',  color: C.primary },
  { label: 'Movie',   color: C.gold    },
  { label: 'OVA',     color: C.aurora  },
  { label: 'Special', color: C.green   },
]

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{
        height: '240px',
        background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        border: `1px solid ${C.borderPrimary}`,
      }} />
      <div style={{ height: '12px', width: '80%', background: C.surface, borderRadius: '2px' }} />
      <div style={{ height: '10px', width: '40%', background: C.surface, borderRadius: '2px' }} />
    </div>
  )
}

// ── Filter pill ───────────────────────────────────────────────────────────────
function FilterPill({ label, color, active, onClick }) {
  const [hovered, setHovered] = useState(false)
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
        color: active ? C.bg : hovered ? color : C.textMuted,
        background: active ? color : hovered ? `${color}18` : 'transparent',
        border: `1px solid ${active ? color : hovered ? `${color}66` : C.borderPrimary}`,
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
  const format = detectAnimeFormat(item)
  const fColor = FORMAT_COLOR[format] || C.primary
  const year   = getAnimeYear(item)
  const rating = item.score ? item.score.toFixed(1) : null
  const cover  = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url

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
      <div style={{
        position: 'relative',
        height: '240px',
        background: C.surface,
        border: `1px solid ${hovered ? fColor + '99' : C.borderPrimary}`,
        overflow: 'hidden',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${fColor}44`
          : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'all 0.25s ease',
      }}>
        {cover ? (
          <img
            src={cover}
            alt={item.title_english || item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '8px', background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
          }}>
            <div style={{ fontSize: '36px', color: C.textDim }}>✦</div>
            <div style={{ fontSize: '10px', fontFamily: '"Cinzel", serif', letterSpacing: '0.15em', color: C.textDim }}>
              No Cover
            </div>
          </div>
        )}

        {/* Format badge */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px',
          background: 'rgba(6,11,20,0.92)',
          border: `1px solid ${fColor}66`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: fColor, fontFamily: '"Cinzel", serif',
        }}>
          {format}
        </div>

        {/* Score badge */}
        {rating && parseFloat(rating) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '3px 8px',
            background: 'rgba(6,11,20,0.92)',
            border: `1px solid ${C.gold}55`,
            fontSize: '10px', color: C.gold,
            fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>
            ★ {rating}
          </div>
        )}

        {/* Hover gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${fColor}33, transparent 60%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s',
          pointerEvents: 'none',
        }} />

        {/* Corner ornaments */}
        {hovered && (
          <>
            <div style={{ position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderTop: `1px solid ${fColor}`, borderLeft: `1px solid ${fColor}`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderTop: `1px solid ${fColor}`, borderRight: `1px solid ${fColor}`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 6, left: 6, width: 10, height: 10, borderBottom: `1px solid ${fColor}`, borderLeft: `1px solid ${fColor}`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 6, right: 6, width: 10, height: 10, borderBottom: `1px solid ${fColor}`, borderRight: `1px solid ${fColor}`, pointerEvents: 'none' }} />
          </>
        )}
      </div>

      <div style={{ marginTop: '10px', padding: '0 2px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 600,
          color: hovered ? C.text : C.textMuted,
          transition: 'color 0.25s',
          lineHeight: 1.35,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {item.title_english || item.title}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
          {year && <span style={{ fontSize: '11px', color: C.textDim }}>{year}</span>}
          {item.episodes > 0 && (
            <span style={{ fontSize: '9px', color: fColor + 'aa', fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
              {item.episodes} eps
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyResults({ query }) {
  const corners = [
    { top: 10, left: 10, borderTop: `1px solid ${C.primary}44`, borderLeft: `1px solid ${C.primary}44` },
    { top: 10, right: 10, borderTop: `1px solid ${C.primary}44`, borderRight: `1px solid ${C.primary}44` },
    { bottom: 10, left: 10, borderBottom: `1px solid ${C.primary}44`, borderLeft: `1px solid ${C.primary}44` },
    { bottom: 10, right: 10, borderBottom: `1px solid ${C.primary}44`, borderRight: `1px solid ${C.primary}44` },
  ]
  return (
    <div style={{
      gridColumn: '1 / -1',
      padding: '64px 24px',
      textAlign: 'center',
      border: `1px dashed ${C.borderPrimary}`,
      position: 'relative',
    }}>
      {corners.map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 12, height: 12, ...s }} />
      ))}
      <div style={{ fontFamily: '"Cinzel", serif', fontSize: '24px', color: C.primary + '33', letterSpacing: '0.4em', marginBottom: '16px' }}>ᚨ</div>
      <div style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.25em', color: C.textMuted, marginBottom: '8px' }}>
        No results found
      </div>
      <div style={{ fontSize: '12px', color: C.textDim }}>
        No anime found for <span style={{ color: C.primary }}>"{query}"</span> — try a different title
      </div>
    </div>
  )
}

// ── Main SearchPage ───────────────────────────────────────────────────────────
export default function SearchPage({ query: initialQuery, onSelectAnime }) {
  const [query, setQuery]           = useState(initialQuery || '')
  const [results, setResults]       = useState([])
  const [filtered, setFiltered]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [searched, setSearched]     = useState(false)
  const [activeFilter, setFilter]   = useState('All')
  const [focused, setFocused]       = useState(false)
  const inputRef = useRef(null)

  // Run initial search if query passed from nav bar
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
      runSearch(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  // Apply format filter whenever results or filter changes
  useEffect(() => {
    if (activeFilter === 'All') {
      setFiltered(results)
    } else {
      setFiltered(results.filter((item) => detectAnimeFormat(item) === activeFilter))
    }
  }, [results, activeFilter])

  const runSearch = async (q) => {
    if (!q?.trim()) return
    setLoading(true)
    setSearched(true)
    setFilter('All')
    try {
      const res = await searchAnime(q)
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
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)',
            color: focused ? C.primary : C.textDim,
            fontSize: '16px', pointerEvents: 'none', transition: 'color 0.25s',
          }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search for an anime title..."
            style={{
              width: '100%',
              padding: '13px 14px 13px 44px',
              background: C.input,
              border: `1px solid ${focused ? C.primary + '99' : C.borderPrimary}`,
              color: C.text,
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: focused ? '0 0 20px rgba(94,234,212,0.1)' : 'none',
              transition: 'all 0.25s ease',
            }}
          />
        </div>
        <button
          onClick={() => runSearch(query)}
          disabled={loading}
          style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '11px',
            letterSpacing: '0.2em',
            color: C.primary,
            background: C.primarySoft,
            border: `1px solid ${C.primary}55`,
            padding: '0 28px',
            height: '48px',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.25s',
            whiteSpace: 'nowrap',
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(94,234,212,0.2)' }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = C.primarySoft }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Filter pills — only shown after search with results */}
      {searched && !loading && results.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', marginRight: '4px', textTransform: 'uppercase' }}>
            Filter
          </span>
          <div style={{ width: '1px', height: '16px', background: C.borderPrimary }} />
          {FILTERS.map((f) => (
            <FilterPill
              key={f.label}
              label={f.label}
              color={f.color}
              active={activeFilter === f.label}
              onClick={() => setFilter(f.label)}
            />
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
            <span style={{ color: C.primary }}>{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Divider */}
      {searched && (
        <div style={{
          height: '1px', marginBottom: '32px',
          background: `linear-gradient(to right, ${C.primary}66, ${C.aurora}33, transparent)`,
        }} />
      )}

      {/* Results grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '20px 16px',
      }}>
        {loading && Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && searched && filtered.length === 0 && <EmptyResults query={query} />}
        {!loading && filtered.map((item) => (
          <ResultCard key={item.mal_id} item={item} onSelect={onSelectAnime} />
        ))}
      </div>

      {/* Pre-search prompt */}
      {!searched && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: '35vh', gap: '16px',
        }}>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '40px', color: C.primary + '22', letterSpacing: '0.3em' }}>ᚨ</div>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '12px', letterSpacing: '0.3em', color: C.textDim, textTransform: 'uppercase' }}>
            Search the realm of light elves
          </div>
        </div>
      )}
    </>
  )
}