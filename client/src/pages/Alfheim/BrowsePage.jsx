import { useState, useEffect, useRef, useCallback } from 'react'

const JIKAN    = 'https://api.jikan.moe/v4'
const PAGE_SIZE = 24   // cards revealed per scroll step

const C = {
  bg:           '#050C10',
  surface:      '#0A1A20',
  surfaceHover: '#0E2228',
  input:        '#071318',
  primary:      '#5EEAD4',
  primarySoft:  'rgba(94,234,212,0.12)',
  aurora:       '#C084FC',
  auroraSoft:   'rgba(192,132,252,0.15)',
  crystal:      '#67E8F9',
  crystalSoft:  'rgba(103,232,249,0.12)',
  green:        '#34D399',
  greenSoft:    'rgba(52,211,153,0.12)',
  gold:         '#A3E635',
  goldSoft:     'rgba(163,230,53,0.15)',
  red:          '#F87171',
  text:         '#E0F7F4',
  textMuted:    '#7ABFB8',
  textDim:      '#2E5A56',
  borderPrimary:'rgba(94,234,212,0.2)',
  borderAurora: 'rgba(192,132,252,0.18)',
}

// ── Sort modes ────────────────────────────────────────────────────────────────
// Each maps to a Jikan endpoint/filter combo
const SORT_MODES = [
  { key: 'airing',     label: 'Currently Airing', rune: 'ᚹ', filter: 'airing'        },
  { key: 'toprated',   label: 'Top Rated',         rune: '★', filter: 'bypopularity'   },
  { key: 'popularity', label: 'Most Popular',      rune: 'ᚦ', filter: 'bypopularity'   },
  { key: 'upcoming',   label: 'Upcoming',          rune: 'ᚾ', filter: 'upcoming'       },
]

// ── Format filters ────────────────────────────────────────────────────────────
const FORMAT_FILTERS = [
  { key: 'all',     label: 'All',     color: C.primary, type: null    },
  { key: 'tv',      label: 'Series',  color: C.primary, type: 'tv'    },
  { key: 'movie',   label: 'Movie',   color: C.gold,    type: 'movie' },
  { key: 'ova',     label: 'OVA',     color: C.aurora,  type: 'ova'   },
  { key: 'special', label: 'Special', color: C.green,   type: 'special'},
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatColor(type) {
  const t = (type || '').toLowerCase()
  if (t === 'movie')                           return C.gold
  if (t === 'ova')                             return C.aurora
  if (t === 'special' || t === 'ona')          return C.green
  return C.primary
}

function normaliseFormat(item) {
  const t = (item.type || '').toLowerCase()
  if (t === 'movie')                  return 'Movie'
  if (t === 'ova')                    return 'OVA'
  if (t === 'special' || t === 'ona') return 'Special'
  return 'Series'
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Single Jikan fetch with retry on 429
async function jikanGet(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(1500 * attempt)
    try {
      const res = await fetch(url)
      if (res.status === 429) { await sleep(2000); continue }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      return json
    } catch { if (attempt === 3) return null }
  }
  return null
}

// Build the endpoint URL for the given sort + page
function buildUrl(sortMode, page) {
  // "Top Rated" uses /top/anime ordered by score
  if (sortMode === 'toprated') {
    return `${JIKAN}/top/anime?type=tv&page=${page}`
  }
  const mode = SORT_MODES.find(m => m.key === sortMode)
  const filter = mode?.filter || 'bypopularity'
  return `${JIKAN}/top/anime?filter=${filter}&page=${page}`
}

// Filter pool items by the selected format key
function applyFormatFilter(items, formatKey) {
  if (formatKey === 'all') return items
  const fmt = FORMAT_FILTERS.find(f => f.key === formatKey)
  if (!fmt || !fmt.type) return items
  return items.filter(item => (item.type || '').toLowerCase() === fmt.type)
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Corners({ color = C.primary, size = 10, opacity = 0.6 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 6,    left: 6,    borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 6,    right: 6,   borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 6, left: 6,    borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 6, right: 6,   borderBottom: b, borderRight: b }} />
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
        border: `1px solid ${C.borderPrimary}`,
      }} />
      <div style={{ height: '12px', width: '80%', background: C.surface, borderRadius: '2px' }} />
      <div style={{ height: '10px', width: '40%', background: C.surface, borderRadius: '2px' }} />
    </div>
  )
}

function AnimeCard({ item, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const format = normaliseFormat(item)
  const fColor = formatColor(item.type)
  const year   = item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null)
  const rating = item.score ? item.score.toFixed(1) : null
  const cover  = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url

  return (
    <div
      onClick={() => onNavigate('Info', item.mal_id)}
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
        border: `1px solid ${hovered ? fColor + '99' : C.borderPrimary}`,
        overflow: 'hidden',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${fColor}44`
          : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'all 0.25s ease',
      }}>
        {cover
          ? <img src={cover} alt={item.title_english || item.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.textDim, fontSize: '32px',
              background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
            }}>✦</div>
        }

        {/* Format badge */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px', background: 'rgba(5,12,16,0.92)',
          border: `1px solid ${fColor}66`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: fColor, fontFamily: '"Cinzel", serif',
        }}>{format}</div>

        {/* Score badge */}
        {rating && parseFloat(rating) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '3px 8px', background: 'rgba(5,12,16,0.92)',
            border: `1px solid ${C.gold}55`,
            fontSize: '10px', color: C.gold,
            fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>★ {rating}</div>
        )}

        {/* Hover glow overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${fColor}33, transparent 60%)`,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.25s',
        }} />

        {hovered && <Corners color={fColor} />}
      </div>

      <div style={{ marginTop: '10px', padding: '0 2px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 600,
          color: hovered ? C.text : C.textMuted,
          transition: 'color 0.25s', lineHeight: 1.35,
          overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{item.title_english || item.title}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
          {year && <span style={{ fontSize: '11px', color: C.textDim }}>{year}</span>}
          {item.members > 0 && (
            <span style={{ fontSize: '10px', color: C.textDim }}>
              {(item.members / 1000).toFixed(0)}k members
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
        color: active ? C.primary : hovered ? C.text : C.textMuted,
        background: active ? C.primarySoft : hovered ? C.surfaceHover : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? C.primary : 'transparent'}`,
        padding: '10px 20px', cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: active ? C.primary : C.gold + '66', fontSize: '13px' }}>
        {mode.rune}
      </span>
      {mode.label}
    </button>
  )
}

function FormatPill({ filter, active, onClick }) {
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
        border: `1px solid ${active ? c : hovered ? `${c}66` : C.borderPrimary}`,
        padding: '6px 18px', cursor: 'pointer', transition: 'all 0.2s ease',
      }}
    >
      {filter.label}
    </button>
  )
}

// Infinite scroll sentinel — same pattern as Midgard
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
  const [sortMode,     setSortMode]     = useState('airing')
  const [formatFilter, setFormatFilter] = useState('all')

  // Pool — ref so scroll callbacks don't go stale
  const pool         = useRef([])
  const nextPage     = useRef(1)
  const exhausted    = useRef(false)
  const currentKey   = useRef('')
  const fetching     = useRef(false)   // mutex: only one Jikan request at a time

  const [visibleCount,  setVisibleCount]  = useState(PAGE_SIZE)
  const [loading,       setLoading]       = useState(true)
  const [poolReady,     setPoolReady]     = useState(false)
  const [expanding,     setExpanding]     = useState(false)
  const [poolSize,      setPoolSize]      = useState(0)

  // ── Reset + initial load whenever sort changes ────────────────────────────
  useEffect(() => {
    const key = `${sortMode}`
    currentKey.current = key

    pool.current     = []
    nextPage.current = 1
    exhausted.current = false
    fetching.current  = false
    setVisibleCount(PAGE_SIZE)
    setPoolReady(false)
    setPoolSize(0)
    setLoading(true)

    const run = async () => {
      // Fetch first 2 pages to give a good initial grid
      const results = []
      for (let p = 1; p <= 2; p++) {
        if (currentKey.current !== key) return
        const json = await jikanGet(buildUrl(sortMode, p))
        if (!json) break
        const items = json.data || []
        if (items.length === 0) { exhausted.current = true; break }
        results.push(...items)
        nextPage.current = p + 1
        // Respect Jikan: 400ms between pages
        if (p < 2) await sleep(400)
      }

      if (currentKey.current !== key) return

      pool.current = results.filter(i => i.images?.jpg?.image_url)
      setPoolSize(pool.current.length)
      setPoolReady(true)
      setLoading(false)
    }

    run()
  }, [sortMode])

  // ── Expand pool: fetch one more Jikan page ────────────────────────────────
  const expandPool = useCallback(async () => {
    if (fetching.current || exhausted.current) return
    const key = currentKey.current
    fetching.current = true
    setExpanding(true)

    await sleep(400) // always respect rate limit before firing

    const json = await jikanGet(buildUrl(sortMode, nextPage.current))

    if (currentKey.current !== key) { fetching.current = false; return }

    if (!json) {
      exhausted.current = true
    } else {
      const items = (json.data || []).filter(i => i.images?.jpg?.image_url)
      if (items.length === 0) {
        exhausted.current = true
      } else {
        // Dedupe by mal_id before pushing
        const existingIds = new Set(pool.current.map(i => i.mal_id))
        const fresh = items.filter(i => !existingIds.has(i.mal_id))
        pool.current = [...pool.current, ...fresh]
        nextPage.current += 1
        setPoolSize(pool.current.length)
      }
    }

    fetching.current = false
    setExpanding(false)
  }, [sortMode])

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const onSentinelVisible = useCallback(() => {
    if (!poolReady || loading) return

    setVisibleCount(prev => {
      const filtered = applyFormatFilter(pool.current, formatFilter)
      const next = Math.min(prev + PAGE_SIZE, filtered.length)
      // Trigger expansion if within 48 cards of pool end
      if (!exhausted.current && pool.current.length - prev < 48) {
        expandPool()
      }
      return next
    })
  }, [poolReady, loading, formatFilter, expandPool])

  // Reset visible count when format filter changes (pool itself stays)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [formatFilter])

  const filtered   = applyFormatFilter(pool.current, formatFilter)
  const displayed  = filtered.slice(0, visibleCount)
  const activeColor = FORMAT_FILTERS.find(f => f.key === formatFilter)?.color || C.primary
  const hasMore    = poolReady && (visibleCount < filtered.length || !exhausted.current)

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
        borderBottom: `1px solid ${C.borderPrimary}`,
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

      {/* ── Format filter row ── */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '28px',
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: '10px', letterSpacing: '0.25em', color: C.textDim,
          fontFamily: '"Cinzel", serif', marginRight: '4px', textTransform: 'uppercase',
        }}>Format</span>
        <div style={{ width: '1px', height: '16px', background: C.borderPrimary }} />
        {FORMAT_FILTERS.map(f => (
          <FormatPill
            key={f.key} filter={f}
            active={formatFilter === f.key}
            onClick={() => setFormatFilter(f.key)}
          />
        ))}

        {/* Stats — mirrors Midgard */}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px',
          fontSize: '11px', color: C.textDim,
          fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
        }}>
          {loading ? (
            <span style={{ color: C.textDim }}>Fetching realm…</span>
          ) : (
            <>
              <span>
                <span style={{ color: activeColor }}>{displayed.length}</span>
                <span style={{ color: C.textDim }}> shown</span>
              </span>
              <span style={{ color: C.borderPrimary }}>·</span>
              <span>
                <span style={{ color: C.textMuted }}>{poolSize.toLocaleString()}</span>
                <span style={{ color: C.textDim }}> loaded</span>
              </span>
              {expanding && (
                <>
                  <span style={{ color: C.borderPrimary }}>·</span>
                  <span style={{ color: C.gold + '88' }}>expanding…</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{
        height: '1px', marginBottom: '32px',
        background: `linear-gradient(to right, ${C.primary}66, ${C.aurora}33, transparent)`,
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
              <AnimeCard key={item.mal_id} item={item} onNavigate={onNavigate} />
            ))
        }
      </div>

      {/* ── Empty state ── */}
      {!loading && poolReady && filtered.length === 0 && (
        <div style={{
          padding: '64px 24px', textAlign: 'center',
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
          }}>ᚨ</div>
          <div style={{
            fontFamily: '"Cinzel", serif', fontSize: '13px',
            letterSpacing: '0.25em', color: C.textMuted,
          }}>No results for this format</div>
        </div>
      )}

      {/* ── Infinite scroll sentinel ── */}
      {!loading && hasMore && (
        <ScrollSentinel onVisible={onSentinelVisible} />
      )}

      {/* ── End of results ── */}
      {!loading && poolReady && !hasMore && displayed.length > 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 0 64px',
          fontSize: '11px', letterSpacing: '0.3em',
          color: C.textDim, fontFamily: '"Cinzel", serif',
        }}>
          ᚨ · End of the Realm · ᚨ
        </div>
      )}
    </>
  )
}