import { useState, useEffect, useRef } from 'react'
import {
  searchManga,
  detectMangaType,
  getTitle,
  getYear,
  getCover,
  formatScore,
} from '../../utils/anilistSearch'

const C = {
  bg:           '#0A0810',
  surface:      '#120F1E',
  surfaceHover: '#17132A',
  input:        '#0D0A18',
  primary:      '#A78BFA',
  primarySoft:  'rgba(167,139,250,0.12)',
  crimson:      '#F43F5E',
  gold:         '#FCD34D',
  text:         '#EDE9FE',
  textMuted:    '#A89BC2',
  textDim:      '#4A3F6B',
  borderPrimary:'rgba(167,139,250,0.2)',
}

const TYPE_COLOR = {
  Manhwa: '#A78BFA',
  Manga:  '#FCD34D',
  Manhua: '#F43F5E',
}

const FILTERS = [
  { label: 'All',    color: '#A78BFA' },
  { label: 'Manhwa', color: '#A78BFA' },
  { label: 'Manga',  color: '#FCD34D' },
  { label: 'Manhua', color: '#F43F5E' },
]

function typeColor(type) { return TYPE_COLOR[type] || C.primary }

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

function FilterPill({ label, active, color, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? C.bg : hovered ? color : C.textMuted,
        background: active ? color : hovered ? `${color}18` : 'transparent',
        border: `1px solid ${active ? color : hovered ? `${color}66` : C.borderPrimary}`,
        padding: '6px 16px', cursor: 'pointer',
        transition: 'all 0.2s ease', whiteSpace: 'nowrap',
      }}
    >{label}</button>
  )
}

function ResultCard({ item, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const type   = detectMangaType(item)
  const tColor = typeColor(type)
  const cover  = getCover(item)
  const title  = getTitle(item)
  const year   = getYear(item)
  const score  = formatScore(item.averageScore)

  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.25s ease',
      }}
    >
      <div style={{
        position: 'relative', height: '240px',
        background: C.surface,
        border: `1px solid ${hovered ? tColor + '99' : C.borderPrimary}`,
        overflow: 'hidden',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${tColor}44`
          : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'all 0.25s ease',
      }}>
        {cover
          ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: C.textDim, gap: '8px',
              background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
            }}>
              <div style={{ fontSize: '36px' }}>⚔</div>
              <div style={{ fontSize: '10px', fontFamily: '"Cinzel", serif', letterSpacing: '0.15em', color: C.textDim }}>No Cover</div>
            </div>
        }

        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px', background: 'rgba(10,8,16,0.92)',
          border: `1px solid ${tColor}66`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: tColor, fontFamily: '"Cinzel", serif',
        }}>{type}</div>

        {score && parseFloat(score) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '3px 8px', background: 'rgba(10,8,16,0.92)',
            border: `1px solid ${C.gold}55`,
            fontSize: '10px', color: C.gold,
            fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>★ {score}</div>
        )}

        {hovered && (
          <>
            <div style={{ position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderTop: `1px solid ${tColor}`, borderLeft: `1px solid ${tColor}` }} />
            <div style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderTop: `1px solid ${tColor}`, borderRight: `1px solid ${tColor}` }} />
            <div style={{ position: 'absolute', bottom: 6, left: 6, width: 10, height: 10, borderBottom: `1px solid ${tColor}`, borderLeft: `1px solid ${tColor}` }} />
            <div style={{ position: 'absolute', bottom: 6, right: 6, width: 10, height: 10, borderBottom: `1px solid ${tColor}`, borderRight: `1px solid ${tColor}` }} />
          </>
        )}
      </div>

      <div style={{ marginTop: '10px', padding: '0 2px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 600,
          color: hovered ? C.text : C.textMuted,
          transition: 'color 0.25s', lineHeight: 1.35,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{title}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
          {year && <span style={{ fontSize: '11px', color: C.textDim }}>{year}</span>}
          {item.chapters && (
            <span style={{ fontSize: '9px', color: tColor + 'aa', fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
              {item.chapters} ch
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyResults({ query }) {
  return (
    <div style={{
      gridColumn: '1 / -1', padding: '64px 24px',
      textAlign: 'center',
      border: `1px dashed ${C.borderPrimary}`,
      position: 'relative',
    }}>
      {[
        { top: 10, left: 10, borderTop: `1px solid ${C.primary}44`, borderLeft: `1px solid ${C.primary}44` },
        { top: 10, right: 10, borderTop: `1px solid ${C.primary}44`, borderRight: `1px solid ${C.primary}44` },
        { bottom: 10, left: 10, borderBottom: `1px solid ${C.primary}44`, borderLeft: `1px solid ${C.primary}44` },
        { bottom: 10, right: 10, borderBottom: `1px solid ${C.primary}44`, borderRight: `1px solid ${C.primary}44` },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 12, height: 12, ...s }} />
      ))}
      <div style={{
        fontFamily: '"Cinzel", serif', fontSize: '24px',
        color: C.primary + '33', letterSpacing: '0.4em', marginBottom: '16px',
      }}>⚔</div>
      <div style={{
        fontFamily: '"Cinzel", serif', fontSize: '13px',
        letterSpacing: '0.25em', color: C.textMuted, marginBottom: '8px',
      }}>No results found</div>
      <div style={{ fontSize: '12px', color: C.textDim, letterSpacing: '0.05em' }}>
        No titles found for <span style={{ color: C.primary }}>"{query}"</span> — try a different title
      </div>
    </div>
  )
}

export default function SearchPage({ query: initialQuery, onSelectManga }) {
  const [query, setQuery]       = useState(initialQuery || '')
  const [results, setResults]   = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [focused, setFocused]   = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
      runSearch(initialQuery)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  useEffect(() => {
    if (activeFilter === 'All') {
      setFiltered(results)
    } else {
      setFiltered(results.filter(item => detectMangaType(item) === activeFilter))
    }
  }, [results, activeFilter])

  const runSearch = async (q) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    setActiveFilter('All')
    try {
      const res = await searchManga(q)
      setResults(res)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
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
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch(query)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search for a manga, manhwa or manhua title..."
            style={{
              width: '100%', padding: '13px 14px 13px 44px',
              background: C.input,
              border: `1px solid ${focused ? C.primary + '99' : C.borderPrimary}`,
              color: C.text, fontSize: '14px', fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box',
              boxShadow: focused ? '0 0 20px rgba(167,139,250,0.12)' : 'none',
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
            color: C.primary, background: C.primarySoft,
            border: `1px solid ${C.primary}55`,
            padding: '0 28px', height: '48px',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.25s', whiteSpace: 'nowrap',
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(167,139,250,0.2)' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.primarySoft }}
        >{loading ? 'Searching...' : 'Search'}</button>
      </div>

      {/* Filter pills */}
      {searched && !loading && results.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '10px', letterSpacing: '0.25em', color: C.textDim,
            fontFamily: '"Cinzel", serif', marginRight: '4px', textTransform: 'uppercase',
          }}>Filter</span>
          <div style={{ width: '1px', height: '16px', background: C.borderPrimary }} />
          {FILTERS.map(f => (
            <FilterPill
              key={f.label} label={f.label} color={f.color}
              active={activeFilter === f.label}
              onClick={() => setActiveFilter(f.label)}
            />
          ))}
          <span style={{
            marginLeft: 'auto', fontSize: '11px',
            color: C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
          }}>
            <span style={{ color: C.primary }}>{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Divider */}
      {searched && (
        <div style={{
          height: '1px', marginBottom: '32px',
          background: `linear-gradient(to right, ${C.primary}66, ${C.crimson}33, transparent)`,
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
        {!loading && filtered.map(item => (
          <ResultCard key={item.id} item={item} onSelect={onSelectManga} />
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
            fontFamily: '"Cinzel", serif', fontSize: '40px',
            color: C.primary + '22', letterSpacing: '0.3em',
          }}>⚔</div>
          <div style={{
            fontFamily: '"Cinzel", serif', fontSize: '12px',
            letterSpacing: '0.3em', color: C.textDim, textTransform: 'uppercase',
          }}>Search the hall of the chosen</div>
        </div>
      )}
    </>
  )
}