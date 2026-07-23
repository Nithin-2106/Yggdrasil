// client/src/pages/Alfheim/BrowsePage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useIsCompact } from '../../hooks/useMediaQuery'

const ANILIST   = 'https://graphql.anilist.co'
const PER_PAGE  = 25
const PAGE_SIZE = 24

const C = {
  bg:            '#050C10',
  surface:       '#0A1A20',
  surfaceHover:  '#0E2228',
  input:         '#071318',
  primary:       '#5EEAD4',
  primarySoft:   'rgba(94,234,212,0.12)',
  aurora:        '#C084FC',
  green:         '#34D399',
  gold:          '#A3E635',
  text:          '#E0F7F4',
  textMuted:     '#7ABFB8',
  textDim:       '#2E5A56',
  borderPrimary: 'rgba(94,234,212,0.2)',
}

const SORT_MODES = [
  { key: 'airing',     label: 'Currently Airing', rune: 'ᚹ', sort: 'POPULARITY_DESC', status: 'RELEASING' },
  { key: 'toprated',   label: 'Top Rated',         rune: '★', sort: 'SCORE_DESC',      statusNot: 'NOT_YET_RELEASED' },
  { key: 'popularity', label: 'Most Popular',      rune: 'ᚦ', sort: 'POPULARITY_DESC', statusNot: 'NOT_YET_RELEASED' },
  { key: 'upcoming',   label: 'Upcoming',          rune: 'ᚾ', sort: 'POPULARITY_DESC', status: 'NOT_YET_RELEASED' },
]

const FORMAT_FILTERS = [
  { key: 'all',     label: 'All',     color: C.primary, formats: null },
  { key: 'tv',      label: 'Series',  color: C.primary, formats: ['TV', 'TV_SHORT'] },
  { key: 'movie',   label: 'Movie',   color: C.gold,     formats: ['MOVIE'] },
  { key: 'ova',     label: 'OVA',     color: C.aurora,   formats: ['OVA'] },
  { key: 'special', label: 'Special', color: C.green,    formats: ['SPECIAL', 'ONA'] },
]

const MEDIA_FIELDS = `
  id
  title { english romaji native }
  coverImage { large extraLarge }
  format
  status
  averageScore
  popularity
  episodes
  genres
  startDate { year }
`

async function anilistFetch(query, variables = {}) {
  try {
    const res = await fetch(ANILIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.errors) throw new Error(json.errors[0].message)
    return json.data
  } catch (err) {
    console.error('AniList fetch error:', err)
    return null
  }
}

function buildQuery(sortKey, formatKey, page) {
  const mode    = SORT_MODES.find(m => m.key === sortKey)
  const filter  = FORMAT_FILTERS.find(f => f.key === formatKey)
  const sort    = mode?.sort || 'POPULARITY_DESC'
  const formats = filter?.formats || null
  const formatClause = formats ? `format_in: [${formats.join(',')}]` : ''
  const statusClause = mode?.status
    ? `status: ${mode.status}`
    : mode?.statusNot
      ? `status_not: ${mode.statusNot}`
      : ''

  return {
    query: `
      query ($page: Int) {
        Page(page: $page, perPage: ${PER_PAGE}) {
          pageInfo { hasNextPage }
          media(
            type: ANIME
            format_not_in: [MUSIC]
            sort: [${sort}]
            isAdult: false
            ${statusClause}
            ${formatClause}
          ) { ${MEDIA_FIELDS} }
        }
      }
    `,
    variables: { page },
  }
}

function detectFormat(item) {
  const f = (item.format || '').toUpperCase()
  if (f === 'MOVIE')   return 'Movie'
  if (f === 'OVA')     return 'OVA'
  if (f === 'SPECIAL' || f === 'ONA') return 'Special'
  return 'Series'
}

function formatColor(item) {
  const t = detectFormat(item)
  if (t === 'Movie')   return C.gold
  if (t === 'OVA')     return C.aurora
  if (t === 'Special') return C.green
  return C.primary
}

function getTitle(item) {
  return item.title?.english || item.title?.romaji || item.title?.native || ''
}

function getCover(item) {
  return item.coverImage?.extraLarge || item.coverImage?.large || ''
}

function formatScore(score) {
  if (!score) return null
  return (score / 10).toFixed(1)
}

// ── UI atoms ──────────────────────────────────────────────────────────────────

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
        aspectRatio: '2 / 3',
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
  const fColor = formatColor(item)
  const format = detectFormat(item)
  const title  = getTitle(item)
  const cover  = getCover(item)
  const score  = formatScore(item.averageScore)
  const year   = item.startDate?.year || null

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
        position: 'relative', aspectRatio: '2 / 3',
        background: C.surface,
        border: `1px solid ${hovered ? fColor + '99' : C.borderPrimary}`,
        overflow: 'hidden',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${fColor}44`
          : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'all 0.25s ease',
      }}>
        {cover
          ? <img
              src={cover}
              alt={title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          : <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.textDim, fontSize: '32px',
              background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
            }}>✦</div>
        }

        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px', background: 'rgba(5,12,16,0.92)',
          border: `1px solid ${fColor}66`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: fColor, fontFamily: '"Cinzel", serif',
        }}>{format}</div>

        {score && parseFloat(score) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '3px 8px', background: 'rgba(5,12,16,0.92)',
            border: `1px solid ${C.gold}55`,
            fontSize: '10px', color: C.gold,
            fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>★ {score}</div>
        )}

        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${fColor}33, transparent 60%)`,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.25s',
          pointerEvents: 'none',
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
        }}>{title}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
          {year && <span style={{ fontSize: '11px', color: C.textDim }}>{year}</span>}
          {item.episodes && (
            <span style={{ fontSize: '10px', color: fColor + 'aa', fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
              {item.episodes} ep
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function SortTab({ mode, active, onClick, isCompact }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: isCompact ? '10px' : '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? C.primary : hovered ? C.text : C.textMuted,
        background: active ? C.primarySoft : hovered ? C.surfaceHover : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? C.primary : 'transparent'}`,
        padding: isCompact ? '13px 16px' : '10px 20px', cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span style={{ color: active ? C.primary : C.gold + '66', fontSize: '13px' }}>
        {mode.rune}
      </span>
      {mode.label}
    </button>
  )
}

function FormatPill({ filter, active, onClick, isCompact }) {
  const [hovered, setHovered] = useState(false)
  const c = filter.color
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: isCompact ? '9px' : '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? C.bg : hovered ? c : C.textMuted,
        background: active ? c : hovered ? `${c}18` : 'transparent',
        border: `1px solid ${active ? c : hovered ? `${c}66` : C.borderPrimary}`,
        padding: isCompact ? '7px 12px' : '6px 18px',
        minHeight: isCompact ? '30px' : 'auto',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >{filter.label}</button>
  )
}

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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BrowsePage({ onNavigate }) {
  const [sortMode,     setSortMode]     = useState('airing')
  const [formatFilter, setFormatFilter] = useState('all')
  const isCompact = useIsCompact()

  const pool       = useRef([])
  const nextPage   = useRef(1)
  const exhausted  = useRef(false)
  const currentKey = useRef('')
  const fetching   = useRef(false)

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loading,      setLoading]      = useState(true)
  const [poolReady,    setPoolReady]    = useState(false)
  const [expanding,    setExpanding]    = useState(false)
  const [poolSize,     setPoolSize]     = useState(0)

  useEffect(() => {
    const key = `${sortMode}__${formatFilter}`
    currentKey.current = key

    pool.current      = []
    nextPage.current  = 1
    exhausted.current = false
    fetching.current  = false
    setVisibleCount(PAGE_SIZE)
    setPoolReady(false)
    setPoolSize(0)
    setLoading(true)

    const run = async () => {
      const results = []
      for (let p = 1; p <= 2; p++) {
        if (currentKey.current !== key) return
        const { query, variables } = buildQuery(sortMode, formatFilter, p)
        const data = await anilistFetch(query, variables)
        if (!data) break
        const items   = data.Page?.media || []
        const hasNext = data.Page?.pageInfo?.hasNextPage ?? false
        results.push(...items)
        nextPage.current = p + 1
        if (!hasNext) { exhausted.current = true; break }
      }

      if (currentKey.current !== key) return

      const seen = new Set()
      pool.current = results.filter(i => {
        if (seen.has(i.id)) return false
        if (getCover(i) === '') return false
        seen.add(i.id)
        return true
      })

      setPoolSize(pool.current.length)
      setPoolReady(true)
      setLoading(false)
    }

    run()
  }, [sortMode, formatFilter])

  const expandPool = useCallback(async () => {
    if (fetching.current || exhausted.current) return
    const key = currentKey.current
    fetching.current = true
    setExpanding(true)

    const { query, variables } = buildQuery(sortMode, formatFilter, nextPage.current)
    const data = await anilistFetch(query, variables)

    if (currentKey.current !== key) { fetching.current = false; setExpanding(false); return }

    if (!data) {
      exhausted.current = true
    } else {
      const items   = data.Page?.media || []
      const hasNext = data.Page?.pageInfo?.hasNextPage ?? false
      const existingIds = new Set(pool.current.map(i => i.id))
      const fresh = items.filter(i => !existingIds.has(i.id) && getCover(i) !== '')
      if (fresh.length > 0) {
        pool.current = [...pool.current, ...fresh]
        nextPage.current += 1
        setPoolSize(pool.current.length)
      }
      if (!hasNext) exhausted.current = true
    }

    fetching.current = false
    setExpanding(false)
  }, [sortMode, formatFilter])

  const onSentinelVisible = useCallback(() => {
    if (!poolReady || loading) return
    setVisibleCount(prev => {
      const next = Math.min(prev + PAGE_SIZE, pool.current.length)
      if (!exhausted.current && pool.current.length - prev < 48) expandPool()
      return next
    })
  }, [poolReady, loading, expandPool])

  const displayed   = pool.current.slice(0, visibleCount)
  const activeFilter = FORMAT_FILTERS.find(f => f.key === formatFilter)
  const activeColor  = activeFilter?.color || C.primary
  const hasMore      = poolReady && (visibleCount < poolSize || !exhausted.current)

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── Sort tabs ── */}
      <div
        className="hide-scroll"
        style={{
          display: 'flex', marginBottom: isCompact ? '18px' : '24px',
          borderBottom: `1px solid ${C.borderPrimary}`,
          overflowX: 'auto',
        }}
      >
        {SORT_MODES.map(mode => (
          <SortTab
            key={mode.key} mode={mode}
            active={sortMode === mode.key}
            onClick={() => setSortMode(mode.key)}
            isCompact={isCompact}
          />
        ))}
      </div>

      {/* ── Format filter row — single scrollable line on mobile ── */}
      <div
        className={isCompact ? 'hide-scroll' : undefined}
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: isCompact ? '12px' : '16px',
          alignItems: 'center',
          flexWrap: isCompact ? 'nowrap' : 'wrap',
          overflowX: isCompact ? 'auto' : 'visible',
          paddingBottom: isCompact ? '2px' : 0,
        }}
      >
        <span style={{
          fontSize: '10px', letterSpacing: '0.25em', color: C.textDim,
          fontFamily: '"Cinzel", serif', marginRight: '4px', textTransform: 'uppercase',
          flexShrink: 0,
        }}>Format</span>
        <div style={{ width: '1px', height: '16px', background: C.borderPrimary, flexShrink: 0 }} />
        {FORMAT_FILTERS.map(f => (
          <FormatPill key={f.key} filter={f} active={formatFilter === f.key} onClick={() => setFormatFilter(f.key)} isCompact={isCompact} />
        ))}
      </div>

      {/* ── Stats row — own line, so it never crowds the filter row on mobile ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        justifyContent: isCompact ? 'flex-start' : 'flex-end',
        marginBottom: '20px',
        fontSize: '11px', color: C.textDim,
        fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
        flexWrap: 'wrap',
      }}>
        {loading ? (
          <span style={{ color: C.textDim }}>Fetching realm…</span>
        ) : (
          <>
            <span><span style={{ color: activeColor }}>{displayed.length}</span><span style={{ color: C.textDim }}> shown</span></span>
            <span style={{ color: C.borderPrimary }}>·</span>
            <span><span style={{ color: C.textMuted }}>{poolSize.toLocaleString()}</span><span style={{ color: C.textDim }}> loaded</span></span>
            {expanding && (
              <><span style={{ color: C.borderPrimary }}>·</span><span style={{ color: C.gold + '88' }}>expanding…</span></>
            )}
          </>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{
        height: '1px', marginBottom: isCompact ? '24px' : '32px',
        background: `linear-gradient(to right, ${C.primary}66, ${activeColor}44, transparent)`,
      }} />

      {/* ── Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${isCompact ? '108px' : '155px'}, 1fr))`,
        gap: isCompact ? '14px 10px' : '20px 16px',
        marginBottom: '32px',
      }}>
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)
          : displayed.map(item => <AnimeCard key={item.id} item={item} onNavigate={onNavigate} />)
        }
      </div>

      {/* ── Empty state ── */}
      {!loading && poolSize === 0 && (
        <div style={{
          padding: '64px 24px', textAlign: 'center',
          border: `1px dashed ${C.borderPrimary}`,
        }}>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '24px', color: C.primary + '33', letterSpacing: '0.4em', marginBottom: '16px' }}>ᚨ</div>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.25em', color: C.textMuted }}>
            No titles found for this combination
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
          ᚨ · End of the Realm · ᚨ
        </div>
      )}
    </>
  )
}