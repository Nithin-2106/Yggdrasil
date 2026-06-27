import { useState, useEffect, useRef, useCallback } from 'react'

const TMDB_BASE = '/api/tmdb'
const IMG_BASE  = 'https://image.tmdb.org/t/p'

const C = {
  bg:           '#080D1A',
  surface:      '#0F1829',
  surfaceHover: '#141F33',
  ember:        '#C2410C',
  gold:         '#CA8A04',
  goldBright:   '#F59E0B',
  electric:     '#38BDF8',
  electricSoft: 'rgba(56,189,248,0.12)',
  violet:       '#7C3AED',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderGold:   'rgba(202,138,4,0.2)',
}

const BLOCKED_GENRES  = new Set([16, 10764, 10767, 10763, 10766])
const INITIAL_PAGES   = 25
const EXPAND_PAGES    = 15
const PAGE_SIZE       = 24
const MAX_TMDB_PAGES  = 500

const SORT_MODES = [
  { key: 'mostwatched', label: 'Most Watched',      rune: 'ᚦ' },
  { key: 'toprated',    label: 'Top Rated',         rune: '★' },
  { key: 'popularity',  label: 'Popularity',        rune: 'ᛏ' },
  { key: 'recent',      label: 'Recently Released', rune: 'ᚾ' },
]

const TYPE_FILTERS = [
  { key: 'Kdrama', label: 'Korean',   color: C.electric,   countries: ['KR'] },
  { key: 'Cdrama', label: 'Chinese',  color: C.violet,     countries: ['CN', 'TW', 'HK'] },
  { key: 'Jdrama', label: 'Japanese', color: C.goldBright, countries: ['JP'] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDramaType(item) {
  const countries = (item.origin_country || []).map(c => c.toUpperCase())
  const lang      = (item.original_language || '').toLowerCase()
  if (countries.includes('KR') || lang === 'ko') return 'Kdrama'
  if (['CN','TW','HK'].some(c => countries.includes(c)) || lang === 'zh') return 'Cdrama'
  if (countries.includes('JP') || lang === 'ja') return 'Jdrama'
  return null
}

function typeColor(type) {
  if (type === 'Kdrama') return C.electric
  if (type === 'Cdrama') return C.violet
  if (type === 'Jdrama') return C.goldBright
  return C.electric
}

function typeLabel(type) {
  if (type === 'Kdrama') return 'Korean'
  if (type === 'Cdrama') return 'Chinese'
  if (type === 'Jdrama') return 'Japanese'
  return type
}

function isValidItem(item, typeKey) {
  if (!item.poster_path) return false
  const type = getDramaType(item)
  if (!type) return false
  if (typeKey && type !== typeKey) return false
  if ((item.genre_ids || []).some(g => BLOCKED_GENRES.has(g))) return false
  if ((item.vote_count || 0) < 10) return false
  return true
}

function dedupeById(items) {
  const seen = new Set()
  return items.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function getSortParam(sortMode) {
  if (sortMode === 'toprated')    return 'vote_average.desc'
  if (sortMode === 'recent')      return 'first_air_date.desc'
  if (sortMode === 'mostwatched') return 'vote_count.desc'
  return 'popularity.desc'
}

function getExtraParams(sortMode) {
  if (sortMode === 'recent') {
    const cutoff = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    return `&first_air_date.gte=${cutoff}`
  }
  return ''
}

// ── FIXED: removed the double-? bug. URL is now properly constructed ──────────
async function fetchPagesForCountry(country, sortMode, startPage, count) {
  const sortParam  = getSortParam(sortMode)
  const extraParam = getExtraParams(sortMode)
  const end = Math.min(startPage + count - 1, MAX_TMDB_PAGES)
  if (startPage > end) return []

  const fetches = Array.from({ length: end - startPage + 1 }, (_, i) =>
    fetch(
      `${TMDB_BASE}?path=discover/tv` +
      `&with_origin_country=${country}` +
      `&sort_by=${sortParam}` +
      `${extraParam}` +
      `&page=${startPage + i}`
    )
      .then(r => r.json())
      .then(d => d.results || [])
      .catch(() => [])
  )
  const pages = await Promise.all(fetches)
  return pages.flat()
}

function sortPool(items, sortMode) {
  if (sortMode === 'toprated') {
    return [...items].sort((a, b) => {
      const diff = (b.vote_average || 0) - (a.vote_average || 0)
      return diff !== 0 ? diff : (b.vote_count || 0) - (a.vote_count || 0)
    })
  }
  if (sortMode === 'recent') {
    return [...items].sort((a, b) => {
      const diff = (b.first_air_date || '').localeCompare(a.first_air_date || '')
      return diff !== 0 ? diff : (b.popularity || 0) - (a.popularity || 0)
    })
  }
  // mostwatched / popularity — sort by vote_count desc, tiebreak by vote_average
  return [...items].sort((a, b) => {
    const diff = (b.vote_count || 0) - (a.vote_count || 0)
    return diff !== 0 ? diff : (b.vote_average || 0) - (a.vote_average || 0)
  })
}

async function buildPool(typeKey, sortMode) {
  const filterDef = TYPE_FILTERS.find(f => f.key === typeKey)
  if (!filterDef) return []

  const perCountryResults = await Promise.all(
    filterDef.countries.map(country =>
      fetchPagesForCountry(country, sortMode, 1, INITIAL_PAGES)
    )
  )

  const deduped = dedupeById(
    perCountryResults.flat().filter(item => isValidItem(item, typeKey))
  )
  return sortPool(deduped, sortMode)
}

// ── UI Components ─────────────────────────────────────────────────────────────
function Corners({ color = C.goldBright, size = 10, opacity = 0.6 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 6, left: 6,    borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 6, right: 6,   borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 6, left: 6,  borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 6, right: 6, borderBottom: b, borderRight: b }} />
    </>
  )
}

function SkeletonCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{
        height: '220px',
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

function DramaCard({ item, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const type   = getDramaType(item) || 'Kdrama'
  const tColor = typeColor(type)
  const year   = item.first_air_date ? item.first_air_date.split('-')[0] : null
  const rating = item.vote_average   ? item.vote_average.toFixed(1) : null

  return (
    <div
      onClick={() => onNavigate('Info', item.id)}
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
        position: 'relative', height: '220px',
        background: C.surface,
        border: `1px solid ${hovered ? tColor + '99' : C.borderGold}`,
        overflow: 'hidden',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${tColor}44`
          : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'all 0.25s ease',
      }}>
        <img
          src={`${IMG_BASE}/w300${item.poster_path}`}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px', background: 'rgba(8,13,26,0.92)',
          border: `1px solid ${tColor}66`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: tColor, fontFamily: '"Cinzel", serif',
        }}>{typeLabel(type)}</div>

        {rating && parseFloat(rating) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '3px 8px', background: 'rgba(8,13,26,0.92)',
            border: `1px solid ${C.gold}55`,
            fontSize: '10px', color: C.goldBright,
            fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>★ {rating}</div>
        )}

        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${tColor}33, transparent 60%)`,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.25s',
          pointerEvents: 'none',
        }} />

        {hovered && <Corners color={tColor} />}
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
          {item.vote_count > 0 && (
            <span style={{ fontSize: '10px', color: C.textDim }}>
              {item.vote_count.toLocaleString()} votes
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function SortTab({ mode, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? C.electric : hovered ? C.text : C.textMuted,
        background: active ? C.electricSoft : hovered ? C.surfaceHover : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? C.electric : 'transparent'}`,
        padding: '10px 20px', cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: active ? C.electric : C.gold + '66', fontSize: '13px' }}>
        {mode.rune}
      </span>
      {mode.label}
    </button>
  )
}

function TypePill({ filter, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  const c = filter.color
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? C.bg : hovered ? c : C.textMuted,
        background: active ? c : hovered ? `${c}18` : 'transparent',
        border: `1px solid ${active ? c : hovered ? `${c}66` : C.borderGold}`,
        padding: '6px 18px', cursor: 'pointer', transition: 'all 0.2s ease',
      }}
    >
      {filter.label}
    </button>
  )
}

// ── Infinite scroll sentinel ──────────────────────────────────────────────────
function ScrollSentinel({ onVisible }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) onVisible() },
      { rootMargin: '600px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onVisible])

  return <div ref={ref} style={{ height: '1px' }} />
}

// ── Main BrowsePage ───────────────────────────────────────────────────────────
export default function BrowsePage({ onNavigate }) {
  const [sortMode,   setSortMode]   = useState('popularity')
  const [typeFilter, setTypeFilter] = useState('Kdrama')

  const pool            = useRef([])
  const nextPageMap     = useRef({})
  const exhaustedMap    = useRef({})
  const currentKey      = useRef('')

  const [visibleCount,  setVisibleCount]  = useState(PAGE_SIZE)
  const [loading,       setLoading]       = useState(true)
  const [poolReady,     setPoolReady]     = useState(false)
  const [expanding,     setExpanding]     = useState(false)
  const [poolSize,      setPoolSize]      = useState(0)

  // ── Build initial pool ────────────────────────────────────────────────────
  useEffect(() => {
    const key = `${typeFilter}__${sortMode}`
    currentKey.current = key

    pool.current         = []
    nextPageMap.current  = {}
    exhaustedMap.current = {}
    setVisibleCount(PAGE_SIZE)
    setPoolReady(false)
    setPoolSize(0)
    setLoading(true)

    const filterDef = TYPE_FILTERS.find(f => f.key === typeFilter)
    if (!filterDef) { setLoading(false); return }

    filterDef.countries.forEach(c => {
      nextPageMap.current[c] = INITIAL_PAGES + 1
    })

    buildPool(typeFilter, sortMode)
      .then(sorted => {
        if (currentKey.current !== key) return
        pool.current = sorted
        setPoolSize(sorted.length)
        setPoolReady(true)
      })
      .catch(() => {
        if (currentKey.current !== key) return
        pool.current = []
        setPoolReady(true)
      })
      .finally(() => {
        if (currentKey.current === key) setLoading(false)
      })
  }, [sortMode, typeFilter])

  // ── Expand pool in background ─────────────────────────────────────────────
  const expandPool = useCallback(async () => {
    if (expanding) return

    const key = currentKey.current
    const filterDef = TYPE_FILTERS.find(f => f.key === typeFilter)
    if (!filterDef) return

    const allExhausted = filterDef.countries.every(c => exhaustedMap.current[c])
    if (allExhausted) return

    setExpanding(true)
    try {
      const fetches = filterDef.countries
        .filter(c => !exhaustedMap.current[c])
        .map(async country => {
          const startPage = nextPageMap.current[country] || INITIAL_PAGES + 1
          if (startPage > MAX_TMDB_PAGES) {
            exhaustedMap.current[country] = true
            return []
          }
          const results = await fetchPagesForCountry(country, sortMode, startPage, EXPAND_PAGES)
          if (results.length === 0) {
            exhaustedMap.current[country] = true
          } else {
            nextPageMap.current[country] = startPage + EXPAND_PAGES
          }
          return results
        })

      const batches = await Promise.all(fetches)
      if (currentKey.current !== key) return

      const newRaw      = batches.flat()
      const filtered    = newRaw.filter(item => isValidItem(item, typeFilter))
      const existingIds = new Set(pool.current.map(i => i.id))
      const fresh       = filtered.filter(item => !existingIds.has(item.id))

      if (fresh.length > 0) {
        const merged = sortPool([...pool.current, ...fresh], sortMode)
        pool.current = merged
        setPoolSize(merged.length)
      }
    } catch (err) {
      console.error('Pool expansion error:', err)
    } finally {
      if (currentKey.current === key) setExpanding(false)
    }
  }, [typeFilter, sortMode, expanding])

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const onSentinelVisible = useCallback(() => {
    if (!poolReady || loading) return
    setVisibleCount(prev => {
      const next = Math.min(prev + PAGE_SIZE, pool.current.length)
      if (next >= pool.current.length - 72) {
        expandPool()
      }
      return next
    })
  }, [poolReady, loading, expandPool])

  const filterDef  = TYPE_FILTERS.find(f => f.key === typeFilter)
  const tColor     = filterDef?.color || C.electric
  const displayed  = pool.current.slice(0, visibleCount)
  const allExhausted = filterDef
    ? filterDef.countries.every(c => exhaustedMap.current[c])
    : true
  const hasMore = poolReady && (visibleCount < poolSize || !allExhausted)

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      {/* ── Sort tabs ── */}
      <div style={{
        display: 'flex', marginBottom: '24px',
        borderBottom: `1px solid ${C.borderGold}`,
        overflowX: 'auto',
      }}>
        {SORT_MODES.map(mode => (
          <SortTab
            key={mode.key} mode={mode}
            active={sortMode === mode.key}
            onClick={() => setSortMode(mode.key)}
          />
        ))}
      </div>

      {/* ── Type filter row ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', marginRight: '4px', textTransform: 'uppercase' }}>Realm</span>
        <div style={{ width: '1px', height: '16px', background: C.borderGold }} />
        {TYPE_FILTERS.map(f => (
          <TypePill key={f.key} filter={f} active={typeFilter === f.key} onClick={() => setTypeFilter(f.key)} />
        ))}

        {/* Stats */}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px',
          fontSize: '11px', color: C.textDim,
          fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
        }}>
          {loading ? (
            <span style={{ color: C.textDim }}>Fetching realm…</span>
          ) : (
            <>
              <span><span style={{ color: tColor }}>{displayed.length}</span><span style={{ color: C.textDim }}> shown</span></span>
              <span style={{ color: C.borderGold }}>·</span>
              <span><span style={{ color: C.textMuted }}>{poolSize.toLocaleString()}</span><span style={{ color: C.textDim }}> loaded</span></span>
              {expanding && (
                <><span style={{ color: C.borderGold }}>·</span><span style={{ color: C.gold + '88' }}>expanding…</span></>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{
        height: '1px', marginBottom: '32px',
        background: `linear-gradient(to right, ${C.ember}66, ${tColor}44, transparent)`,
      }} />

      {/* ── Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
        gap: '20px 16px',
        marginBottom: '32px',
      }}>
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)
          : displayed.map(item => (
              <DramaCard key={item.id} item={item} onNavigate={onNavigate} />
            ))
        }
      </div>

      {/* ── Empty state ── */}
      {!loading && poolSize === 0 && (
        <div style={{
          padding: '64px 24px', textAlign: 'center',
          border: `1px dashed ${C.borderGold}`,
        }}>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '24px', color: C.gold + '33', letterSpacing: '0.4em', marginBottom: '16px' }}>ᛟ</div>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.25em', color: C.textMuted }}>
            No results found for this combination
          </div>
        </div>
      )}

      {/* ── Infinite scroll sentinel ── */}
      {!loading && hasMore && <ScrollSentinel onVisible={onSentinelVisible} />}

      {/* ── End of results ── */}
      {!loading && poolReady && !hasMore && poolSize > 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 0 64px',
          fontSize: '11px', letterSpacing: '0.3em',
          color: C.textDim, fontFamily: '"Cinzel", serif',
        }}>
          ᛟ · End of the Realm · ᛟ
        </div>
      )}
    </>
  )
}