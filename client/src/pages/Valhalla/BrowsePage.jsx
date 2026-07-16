import { useState, useEffect, useRef, useCallback } from 'react'
import { useIsCompact } from '../../hooks/useMediaQuery'

const ANILIST  = 'https://graphql.anilist.co'
const PER_PAGE = 25
const PAGE_SIZE = 24

const C = {
  bg:            '#0D0514',
  surface:       '#130920',
  surfaceHover:  '#1A0F2A',
  input:         '#0A0410',
  primary:       '#A855F7',
  primarySoft:   'rgba(168,85,247,0.12)',
  crimson:       '#DC2626',
  gold:          '#D97706',
  goldBright:    '#F59E0B',
  rose:          '#FB7185',
  green:         '#34D399',
  text:          '#F3E8FF',
  textMuted:     '#B08EC2',
  textDim:       '#4A3560',
  borderPrimary: 'rgba(168,85,247,0.2)',
}

const SORT_MODES = [
  { key: 'trending', label: 'Trending',         rune: 'ᚦ', sort: 'TRENDING_DESC'   },
  { key: 'toprated', label: 'Top Rated',         rune: '★', sort: 'SCORE_DESC'      },
  { key: 'popular',  label: 'Most Popular',      rune: 'ᚠ', sort: 'POPULARITY_DESC' },
  { key: 'recent',   label: 'Recently Released', rune: 'ᚾ', sort: 'START_DATE_DESC' },
]

const TYPE_FILTERS = [
  { key: 'all',    label: 'All',    color: C.primary, country: null },
  { key: 'manhwa', label: 'Manhwa', color: C.rose,    country: 'KR' },
  { key: 'manga',  label: 'Manga',  color: C.primary, country: 'JP' },
  { key: 'manhua', label: 'Manhua', color: C.gold,    country: 'CN' },
]

const MEDIA_FIELDS = `
  id
  title { english romaji native }
  coverImage { large extraLarge }
  format
  status
  countryOfOrigin
  averageScore
  popularity
  chapters
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

function buildQuery(sortKey, typeKey, page) {
  const mode    = SORT_MODES.find(m => m.key === sortKey)
  const filter  = TYPE_FILTERS.find(f => f.key === typeKey)
  const sort    = mode?.sort || 'TRENDING_DESC'
  const country = filter?.country || null
  const countryFilter = country ? `countryOfOrigin: "${country}"` : ''

  return {
    query: `
      query ($page: Int) {
        Page(page: $page, perPage: ${PER_PAGE}) {
          pageInfo { hasNextPage }
          media(
            type: MANGA
            format_not_in: [NOVEL, MUSIC]
            sort: [${sort}]
            status_not: NOT_YET_RELEASED
            isAdult: false
            ${countryFilter}
          ) { ${MEDIA_FIELDS} }
        }
      }
    `,
    variables: { page },
  }
}

function detectType(item) {
  const c = item.countryOfOrigin || ''
  if (c === 'KR') return 'Manhwa'
  if (c === 'CN') return 'Manhua'
  return 'Manga'
}

function typeColor(item) {
  const t = detectType(item)
  if (t === 'Manhwa') return C.rose
  if (t === 'Manhua') return C.gold
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

function MangaCard({ item, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const tColor = typeColor(item)
  const type   = detectType(item)
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
        position: 'relative', height: '220px',
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
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.textDim, fontSize: '32px',
              background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
            }}>᛭</div>
        }

        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px', background: 'rgba(13,5,20,0.92)',
          border: `1px solid ${tColor}66`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: tColor, fontFamily: '"Cinzel", serif',
        }}>{type}</div>

        {score && parseFloat(score) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '3px 8px', background: 'rgba(13,5,20,0.92)',
            border: `1px solid ${C.goldBright}55`,
            fontSize: '10px', color: C.goldBright,
            fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>★ {score}</div>
        )}

        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${tColor}33, transparent 60%)`,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.25s',
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
        }}>{title}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
          {year && <span style={{ fontSize: '11px', color: C.textDim }}>{year}</span>}
          {item.chapters && (
            <span style={{ fontSize: '10px', color: tColor + 'aa', fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
              {item.chapters} ch
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
        fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? C.primary : hovered ? C.text : C.textMuted,
        background: active ? C.primarySoft : hovered ? C.surfaceHover : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? C.primary : 'transparent'}`,
        padding: isCompact ? '13px 20px' : '10px 20px', cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: active ? C.primary : C.goldBright + '66', fontSize: '13px' }}>
        {mode.rune}
      </span>
      {mode.label}
    </button>
  )
}

function TypePill({ filter, active, onClick, isCompact }) {
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
        padding: isCompact ? '11px 18px' : '6px 18px',minHeight: isCompact ? '44px' : 'auto',
display: isCompact ? 'inline-flex' : undefined,
alignItems: isCompact ? 'center' : undefined, cursor: 'pointer', transition: 'all 0.2s ease',
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
  const [sortMode,   setSortMode]   = useState('trending')
  const [typeFilter, setTypeFilter] = useState('all')
  const isCompact = useIsCompact()

  const pool        = useRef([])
  const nextPage    = useRef(1)
  const exhausted   = useRef(false)
  const currentKey  = useRef('')
  const fetching    = useRef(false)

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loading,      setLoading]      = useState(true)
  const [poolReady,    setPoolReady]    = useState(false)
  const [expanding,    setExpanding]    = useState(false)
  const [poolSize,     setPoolSize]     = useState(0)

  useEffect(() => {
    const key = `${sortMode}__${typeFilter}`
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
        const { query, variables } = buildQuery(sortMode, typeFilter, p)
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
        seen.add(i.id)
        return getCover(i) !== ''
      })

      setPoolSize(pool.current.length)
      setPoolReady(true)
      setLoading(false)
    }

    run()
  }, [sortMode, typeFilter])

  const expandPool = useCallback(async () => {
    if (fetching.current || exhausted.current) return
    const key = currentKey.current
    fetching.current = true
    setExpanding(true)

    const { query, variables } = buildQuery(sortMode, typeFilter, nextPage.current)
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
  }, [sortMode, typeFilter])

  const onSentinelVisible = useCallback(() => {
    if (!poolReady || loading) return
    setVisibleCount(prev => {
      const next = Math.min(prev + PAGE_SIZE, pool.current.length)
      if (!exhausted.current && pool.current.length - prev < 48) expandPool()
      return next
    })
  }, [poolReady, loading, expandPool])

  const displayed   = pool.current.slice(0, visibleCount)
  const activeType  = TYPE_FILTERS.find(f => f.key === typeFilter)
  const activeColor = activeType?.color || C.primary
  const hasMore     = poolReady && (visibleCount < poolSize || !exhausted.current)

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      {/* Sort tabs */}
      <div style={{
        display: 'flex', marginBottom: '24px',
        borderBottom: `1px solid ${C.borderPrimary}`,
        overflowX: 'auto',
      }}>
        {SORT_MODES.map(mode => (
          <SortTab key={mode.key} mode={mode} active={sortMode === mode.key} onClick={() => setSortMode(mode.key)} isCompact={isCompact}/>
        ))}
      </div>

      {/* Type filter row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '10px', letterSpacing: '0.25em', color: C.textDim,
          fontFamily: '"Cinzel", serif', marginRight: '4px', textTransform: 'uppercase',
        }}>Realm</span>
        <div style={{ width: '1px', height: '16px', background: C.borderPrimary }} />
        {TYPE_FILTERS.map(f => (
          <TypePill key={f.key} filter={f} active={typeFilter === f.key} onClick={() => setTypeFilter(f.key)} isCompact={isCompact}/>
        ))}

        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px',
          fontSize: '11px', color: C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
        }}>
          {loading ? (
            <span>Consulting the runes…</span>
          ) : (
            <>
              <span><span style={{ color: activeColor }}>{displayed.length}</span> shown</span>
              <span style={{ color: C.borderPrimary }}>·</span>
              <span><span style={{ color: C.textMuted }}>{poolSize.toLocaleString()}</span> loaded</span>
              {expanding && (
                <><span style={{ color: C.borderPrimary }}>·</span><span style={{ color: C.goldBright + '88' }}>expanding…</span></>
              )}
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: '1px', marginBottom: '32px',
        background: `linear-gradient(to right, ${C.crimson}66, ${C.primary}44, transparent)`,
      }} />

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
        gap: '20px 16px', marginBottom: '32px',
      }}>
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)
          : displayed.map(item => <MangaCard key={item.id} item={item} onNavigate={onNavigate} />)
        }
      </div>

      {/* Empty state */}
{!loading && poolReady && displayed.length === 0 && (
  <div
    style={{
      padding: '64px 24px',
      textAlign: 'center',
      border: `1px dashed ${C.borderPrimary}`,
      position: 'relative',
    }}
  >
    {[
      { top: 10, left: 10, borderTop: `1px solid ${C.primary}44`, borderLeft: `1px solid ${C.primary}44` },
      { top: 10, right: 10, borderTop: `1px solid ${C.primary}44`, borderRight: `1px solid ${C.primary}44` },
      { bottom: 10, left: 10, borderBottom: `1px solid ${C.primary}44`, borderLeft: `1px solid ${C.primary}44` },
      { bottom: 10, right: 10, borderBottom: `1px solid ${C.primary}44`, borderRight: `1px solid ${C.primary}44` },
    ].map((s, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: 12,
          height: 12,
          ...s,
        }}
      />
    ))}

    <div
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '24px',
        color: C.primary + '33',
        letterSpacing: '0.4em',
        marginBottom: '16px',
      }}
    >
      ᛭
    </div>

    <div
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '13px',
        letterSpacing: '0.25em',
        color: C.textMuted,
      }}
    >
      No titles found for this combination
    </div>
  </div>
)}

      {/* Infinite scroll sentinel */}
      {!loading && hasMore && <ScrollSentinel onVisible={onSentinelVisible} />}

      {/* End of results */}
      {!loading && poolReady && !hasMore && displayed.length > 0 && (
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