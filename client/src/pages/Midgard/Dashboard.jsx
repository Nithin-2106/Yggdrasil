import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { searchDramas } from '../../utils/tmdbSearch'
import { useAuth }      from '../../context/AuthContext'
import Counter          from '../../components/Counter'

const TMDB_BASE  = '/api/tmdb'
const IMG_BASE   = 'https://image.tmdb.org/t/p'
const API        = '/api/media/drama'
const TOP10_API  = '/api/top10'

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:           '#0B0710',
  surface:      '#181227',
  surfaceHover: '#221B33',
  input:        '#120C1C',
  ember:        '#7A3B12',
  emberSoft:    'rgba(122,59,18,0.18)',
  gold:         '#F0B429',
  goldSoft:     'rgba(240,180,41,0.14)',
  goldBright:   '#FFCB57',
  electric:     '#38BDF8', // Korean
  electricSoft: 'rgba(56,189,248,0.12)',
  violet:       '#F5468C', // Chinese
  violetSoft:   'rgba(245,70,140,0.15)',
  indigo:       '#FF9F45', // Japanese
  indigoSoft:   'rgba(255,159,69,0.15)',
  green:        '#22C55E',
  red:          '#EF4444',
  text:         '#EDEAF5',
  textMuted:    '#9C93B4',
  textDim:      '#453D5C',
  borderGold:   'rgba(240,180,41,0.2)',
  borderElec:   'rgba(56,189,248,0.15)',
}

// ── Drama type helpers ────────────────────────────────────────────────────────
const ALLOWED_COUNTRIES = new Set(['KR', 'CN', 'TW', 'HK', 'JP'])
const ALLOWED_LANGUAGES = new Set(['ko', 'zh', 'ja'])
// 16 = Animation (TMDB TV genre) — this is what keeps anime out of Midgard.
// Every fetch in this file (and the Top 10 search modal) runs through
// isValidDrama() instead of duplicating this check inline, so there's
// exactly one place to adjust if TMDB ever mis-tags something.
const BLOCKED_GENRES = new Set([16, 10764, 10767, 10763, 10766])

function isValidDrama(item) {
  const countries = (item.origin_country || []).map(c => c.toUpperCase())
  const lang      = (item.original_language || '').toLowerCase()
  const genres    = item.genre_ids || []
  const validOrigin =
    countries.some(c => ALLOWED_COUNTRIES.has(c)) || ALLOWED_LANGUAGES.has(lang)
  return (
    validOrigin &&
    !!item.poster_path &&
    !genres.some(g => BLOCKED_GENRES.has(g))
  )
}

function getDramaType(item) {
  const countries = (item.origin_country || []).map(c => c.toUpperCase())
  const lang      = (item.original_language || '').toLowerCase()
  if (countries.includes('KR') || lang === 'ko') return 'Kdrama'
  if (['CN', 'TW', 'HK'].some(c => countries.includes(c)) || lang === 'zh') return 'Cdrama'
  if (countries.includes('JP') || lang === 'ja') return 'Jdrama'
  return 'Drama'
}

// `compact` gives a short code (KR/CN/JP) for tight mobile card corners
// where the full word would collide with an adjacent badge.
function typeLabel(type, compact = false) {
  if (compact) {
    if (type === 'Kdrama') return 'KR'
    if (type === 'Cdrama') return 'CN'
    if (type === 'Jdrama') return 'JP'
    return type
  }
  if (type === 'Kdrama') return 'Korean'
  if (type === 'Cdrama') return 'Chinese'
  if (type === 'Jdrama') return 'Japanese'
  return type
}

function typeColor(type) {
  if (type === 'Kdrama') return C.electric
  if (type === 'Cdrama') return C.violet
  if (type === 'Jdrama') return C.indigo
  return C.electric
}

// Maps a Top 10 region tab to the drama "type" it's allowed to contain.
const REGION_TYPE = { Korean: 'Kdrama', Chinese: 'Cdrama', Japanese: 'Jdrama' }

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Corners({ color = C.goldBright, size = 12, opacity = 0.4 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 8,    left:  8,  borderTop:    b, borderLeft:  b }} />
      <div style={{ ...s, top: 8,    right: 8,  borderTop:    b, borderRight: b }} />
      <div style={{ ...s, bottom: 8, left:  8,  borderBottom: b, borderLeft:  b }} />
      <div style={{ ...s, bottom: 8, right: 8,  borderBottom: b, borderRight: b }} />
    </>
  )
}

// Title + optional right-side content, always on one row (wraps only if the
// viewport is genuinely too narrow) so region tabs / refresh buttons sit
// next to the title on mobile instead of stacking below it.
function SectionHeader({ title, rune, count, right, isCompact }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: right ? 'space-between' : 'flex-start',
        flexWrap:       'wrap',
        gap:            isCompact ? '10px' : '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? '10px' : '14px', minWidth: 0 }}>
          <span style={{
            fontFamily:    '"Cinzel", serif',
            fontSize:      '16px',
            color:         C.gold + '88',
            letterSpacing: '0.1em',
          }}>{rune}</span>
          <h2 style={{
            fontFamily:    '"Cinzel", serif',
            fontSize:      isCompact ? '12px' : '13px',
            fontWeight:    600,
            letterSpacing: isCompact ? '0.18em' : '0.3em',
            color:         C.text,
            margin:        0,
            textTransform: 'uppercase',
            whiteSpace:    'nowrap',
          }}>{title}</h2>
          {count > 0 && (
            <span style={{
              fontSize:   '11px',
              color:      C.electric,
              fontFamily: '"Cinzel", serif',
              border:     `1px solid ${C.electric}44`,
              padding:    '2px 8px',
              background: C.electricSoft,
            }}>{count}</span>
          )}
        </div>
        {right && <div>{right}</div>}
      </div>
      <div style={{
        height:     '1px',
        marginTop:  '14px',
        background: `linear-gradient(to right, ${C.gold}55, ${C.electric}22, transparent)`,
      }} />
    </div>
  )
}

// ── Horizontal scroll container ───────────────────────────────────────────────
function HorizontalScroll({
  children,
  isCompact,
  scrollAmount  = 520,
  gap           = '14px',
  paddingTop    = '12px',
  paddingBottom = '12px',
}) {
  const ref                     = useRef(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(false)

  const check = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }, [])

  // Runs on mount and whenever content changes size — fixes the arrow that
  // used to linger (or fail to appear) because it only recalculated on scroll.
  useEffect(() => {
    check()
    const el = ref.current
    if (!el) return
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null
    ro?.observe(el)
    window.addEventListener('resize', check)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [check, children])

  const scroll = dir => {
    ref.current?.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' })
  }

  // Arrows are desktop-only; on mobile the strip is swipeable directly.
  const showArrows = !isCompact

  const arrowStyle = {
    position:       'absolute',
    top:            '50%',
    transform:      'translateY(-50%)',
    zIndex:         10,
    width:          '32px',
    height:         '32px',
    borderRadius:   '8px',
    background:     'rgba(11,7,16,0.85)',
    backdropFilter: 'blur(6px)',
    border:         `1px solid ${C.borderGold}`,
    color:          C.gold,
    fontSize:       '14px',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    boxShadow:      '0 4px 14px rgba(0,0,0,0.6)',
    transition:     'border-color 0.2s ease, transform 0.2s ease, color 0.2s ease',
  }

  return (
    <div style={{ position: 'relative', overflow: 'visible' }}>
      {showArrows && canLeft && (
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          style={{ ...arrowStyle, left: '8px' }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = C.gold
            e.currentTarget.style.color       = C.goldBright
            e.currentTarget.style.transform   = 'translateY(-50%) translateX(-2px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = C.borderGold
            e.currentTarget.style.color       = C.gold
            e.currentTarget.style.transform   = 'translateY(-50%)'
          }}
        >❮</button>
      )}
      <div
        ref={ref}
        onScroll={check}
        className="hide-scroll"
        style={{
          display:         'flex',
          gap,
          overflowX:       'auto',
          overflowY:       'hidden',
          paddingBottom,
          paddingTop,
          paddingLeft:     showArrows && canLeft  ? '44px' : 0,
          paddingRight:    showArrows && canRight ? '44px' : 0,
          width:           '100%',
          boxSizing:       'border-box',
          scrollbarWidth:  'none',
          msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>
      {showArrows && canRight && (
        <button
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          style={{ ...arrowStyle, right: '8px' }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = C.gold
            e.currentTarget.style.color       = C.goldBright
            e.currentTarget.style.transform   = 'translateY(-50%) translateX(2px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = C.borderGold
            e.currentTarget.style.color       = C.gold
            e.currentTarget.style.transform   = 'translateY(-50%)'
          }}
        >❯</button>
      )}
    </div>
  )
}

// ── Trending / generic drama card ─────────────────────────────────────────────
// This is the canonical poster card size for the whole dashboard — Top10Card
// mirrors these exact dimensions so every horizontal rail feels consistent.
const CARD_W = { compact: 96,  full: 160 }
const CARD_H = { compact: 134, full: 220 }

function TrendingCard({ item, onNavigate, isCompact }) {
  const [hovered, setHovered] = useState(false)
  const type   = getDramaType(item)
  const tColor = typeColor(type)
  const year   = item.first_air_date ? item.first_air_date.split('-')[0] : null
  const rating = item.vote_average   ? item.vote_average.toFixed(1)       : null

  const w = isCompact ? CARD_W.compact : CARD_W.full
  const h = isCompact ? CARD_H.compact : CARD_H.full

  return (
    <div
      onClick={() => onNavigate('Info', item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width:      `${w}px`,
        cursor:     'pointer',
        transform:  hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div style={{
        width:      `${w}px`,
        height:     `${h}px`,
        background: C.surface,
        border:     `1px solid ${hovered ? tColor + '99' : C.borderGold}`,
        overflow:   'hidden',
        position:   'relative',
        boxShadow:  hovered
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
            width:          '100%',
            height:         '100%',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            color:          C.textDim,
            fontSize:       '32px',
            background:     `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
          }}>📺</div>
        )}

        <div style={{
          position:      'absolute',
          top:           '8px',
          left:          '8px',
          padding:       isCompact ? '2px 6px' : '3px 8px',
          background:    'rgba(11,7,16,0.5)',
          backdropFilter:'blur(3px)',
          border:        `1px solid ${tColor}66`,
          fontSize:      isCompact ? '8px' : '9px',
          letterSpacing: '0.15em',
          color:         tColor,
          fontFamily:    '"Cinzel", serif',
        }}>{typeLabel(type, isCompact)}</div>

        {rating && parseFloat(rating) > 0 && (
          <div style={{
            position:      'absolute',
            top:           '8px',
            right:         '8px',
            padding:       isCompact ? '2px 6px' : '3px 8px',
            background:    'rgba(11,7,16,0.5)',
            backdropFilter:'blur(3px)',
            border:        `1px solid ${C.gold}55`,
            fontSize:      isCompact ? '9px' : '10px',
            color:         C.goldBright,
            fontFamily:    '"Cinzel", serif',
            fontWeight:    700,
          }}>★ {rating}</div>
        )}

        <div style={{
          position:   'absolute',
          inset:      0,
          background: `linear-gradient(to top, ${tColor}33, transparent 60%)`,
          opacity:    hovered ? 1 : 0,
          transition: 'opacity 0.3s',
        }} />

        {hovered && <Corners color={tColor} size={10} opacity={0.7} />}
      </div>

      <div style={{ marginTop: '10px', padding: '0 2px' }}>
        <div style={{
          fontSize:        isCompact ? '11px' : '13px',
          fontWeight:      600,
          color:           hovered ? C.text : C.textMuted,
          transition:      'color 0.25s',
          lineHeight:      1.35,
          overflow:        'hidden',
          display:         '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>{item.name || item.original_name}</div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
          {year && <span style={{ fontSize: isCompact ? '10px' : '11px', color: C.textDim }}>{year}</span>}
          {item.origin_country?.[0] && (
            <span style={{
              fontSize:      '9px',
              color:         tColor + 'aa',
              fontFamily:    '"Cinzel", serif',
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

// ── 1. STATS ROW ─────────────────────────────────────────────────────────────
function StatCard({ label, value, color, rune }) {
  const [hovered, setHovered] = useState(false)
  const isNumeric    = typeof value === 'number' ||
    (typeof value === 'string' && !isNaN(parseFloat(value)) && value !== '—')
  const numericValue = isNumeric ? parseFloat(value) : 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex:       '1 1 140px',
        padding:    '28px 20px 22px',
        background: hovered
          ? `linear-gradient(135deg, ${C.surfaceHover}, ${C.surface})`
          : `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
        border:     `1px solid ${hovered ? color + '55' : C.borderGold}`,
        transition: 'all 0.35s ease',
        boxShadow:  hovered
          ? `0 0 40px ${color}22, inset 0 0 30px rgba(0,0,0,0.3)`
          : 'none',
        cursor:   'default',
        position: 'relative',
        overflow: 'hidden',
        textAlign:'center',
      }}
    >
      <Corners color={hovered ? color : C.gold} size={10} opacity={hovered ? 0.8 : 0.3} />

      <div style={{
        position:   'absolute',
        top:        0,
        left:       '15%',
        right:      '15%',
        height:     '1px',
        background: `linear-gradient(to right, transparent, ${color}, transparent)`,
        opacity:    hovered ? 0.8 : 0.25,
        transition: 'opacity 0.35s',
      }} />

      <div style={{
        fontFamily:    '"Cinzel", serif',
        fontSize:      '14px',
        color:         hovered ? color : C.textDim,
        marginBottom:  '10px',
        transition:    'color 0.35s',
        letterSpacing: '0.1em',
      }}>{rune}</div>

      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'baseline' }}>
        {isNumeric ? (
          <Counter
            value={numericValue}
            fontSize={36}
            padding={4}
            gap={1}
            horizontalPadding={0}
            borderRadius={0}
            gradientHeight={0}
            textColor={hovered ? color : C.text}
            fontWeight={700}
            counterStyle={{ fontFamily: '"Cinzel", serif', transition: 'color 0.35s' }}
          />
        ) : (
          <span style={{
            fontSize:   '36px',
            fontWeight: 700,
            color:      hovered ? color : C.text,
            fontFamily: '"Cinzel", serif',
            lineHeight: 1,
            transition: 'color 0.35s',
          }}>{value}</span>
        )}
      </div>

      <div style={{
        fontSize:      '10px',
        letterSpacing: '0.25em',
        color:         hovered ? color : C.textMuted,
        textTransform: 'uppercase',
        fontFamily:    '"Cinzel", serif',
        transition:    'color 0.35s',
      }}>{label}</div>
    </div>
  )
}

function StatsRow({ dramas }) {
  const rated   = dramas.filter(d => d.rating)
  const avgRating = rated.length
    ? (rated.reduce((s, d) => s + d.rating, 0) / rated.length).toFixed(1)
    : '—'

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '52px' }}>
      <StatCard label="Total"         value={dramas.length}                                          color={C.electric}   rune="ᛏ" />
      <StatCard label="Watching"      value={dramas.filter(d => d.status === 'Watching').length}      color={C.electric}   rune="ᚹ" />
      <StatCard label="Completed"     value={dramas.filter(d => d.status === 'Completed').length}     color={C.green}      rune="ᚲ" />
      <StatCard label="Plan to Watch" value={dramas.filter(d => d.status === 'Plan to Watch').length} color={C.violet}     rune="ᛈ" />
      <StatCard label="On Hold"       value={dramas.filter(d => d.status === 'On Hold').length}       color={C.indigo}     rune="ᚺ" />
      <StatCard label="Dropped"       value={dramas.filter(d => d.status === 'Dropped').length}       color={C.red}        rune="ᛞ" />
      <StatCard label="Avg Rating"    value={avgRating}                                                color={C.goldBright} rune="★" />
    </div>
  )
}

// ── 2. TRENDING ───────────────────────────────────────────────────────────────
function TrendingSection({ onNavigate, isCompact }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const countries = ['KR', 'CN', 'JP', 'TW']
    const fetches   = countries.flatMap(country =>
      [1, 2, 3].map(page =>
        fetch(`${TMDB_BASE}?path=discover/tv&with_origin_country=${country}&sort_by=popularity.desc&page=${page}`)
          .then(r => r.json())
          .then(d => d.results || [])
          .catch(() => [])
      )
    )

    Promise.all(fetches).then(pages => {
      const seen     = new Set()
      const filtered = pages.flat().filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return isValidDrama(item)
      }).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 45)
      setItems(filtered)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Trending This Week" rune="ᚦ" isCompact={isCompact} />
      <div style={{ display: 'flex', gap: isCompact ? '8px' : '14px', overflow: 'hidden' }}>
        {Array.from({ length: isCompact ? 4 : 6 }).map((_, i) => (
          <div key={i} style={{
            flexShrink:     0,
            width:          `${isCompact ? CARD_W.compact : CARD_W.full}px`,
            height:         `${isCompact ? CARD_H.compact : CARD_H.full}px`,
            background:     `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
            backgroundSize: '200% 100%',
            animation:      'shimmer 1.4s infinite',
            border:         `1px solid ${C.borderGold}`,
          }} />
        ))}
      </div>
    </div>
  )

  if (!items.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Trending This Week" rune="ᚦ" count={items.length} isCompact={isCompact} />
      <HorizontalScroll isCompact={isCompact} gap={isCompact ? '8px' : '14px'}>
        {items.map(item => (
          <TrendingCard key={item.id} item={item} onNavigate={onNavigate} isCompact={isCompact} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 3. CURRENTLY WATCHING ─────────────────────────────────────────────────────
function WatchingCard({ drama, onNavigate, isCompact }) {
  const [hovered, setHovered] = useState(false)
  const tColor = typeColor(drama.type)
  const progress = drama.episodes?.total
    ? (drama.episodes.current / drama.episodes.total) * 100
    : null

  const w = isCompact ? 96 : 150
  const h = isCompact ? 134 : 210

  return (
    <div
      onClick={() => drama.tmdbId && onNavigate('Info', drama.tmdbId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width:      `${w}px`,
        cursor:     drama.tmdbId ? 'pointer' : 'default',
        transform:  hovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div style={{
        width:      `${w}px`,
        height:     `${h}px`,
        background: C.surface,
        border:     `1px solid ${hovered ? tColor + '88' : C.borderGold}`,
        overflow:   'hidden',
        position:   'relative',
        boxShadow:  hovered
          ? `0 12px 40px ${tColor}22, 0 0 0 1px ${tColor}33`
          : '0 4px 16px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease',
      }}>
        {drama.coverImage ? (
          <img
            src={drama.coverImage}
            alt={drama.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width:          '100%',
            height:         '100%',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            color:          C.textDim,
            fontSize:       '32px',
            background:     `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
          }}>📺</div>
        )}

        <div style={{
          position:      'absolute',
          top:           '8px',
          left:          '8px',
          padding:       isCompact ? '2px 6px' : '3px 8px',
          background:    'rgba(11,7,16,0.5)',
          backdropFilter:'blur(3px)',
          border:        `1px solid ${tColor}66`,
          fontSize:      isCompact ? '8px' : '9px',
          letterSpacing: '0.15em',
          color:         tColor,
          fontFamily:    '"Cinzel", serif',
        }}>{typeLabel(drama.type, isCompact)}</div>

        <div style={{
          position:   'absolute',
          inset:      0,
          background: `linear-gradient(to top, ${tColor}33, transparent)`,
          opacity:    hovered ? 1 : 0,
          transition: 'opacity 0.3s',
        }} />

        {hovered && <Corners color={tColor} size={10} opacity={0.7} />}
      </div>

      {progress !== null && (
        <div style={{ height: '2px', background: C.borderGold, marginTop: '6px', overflow: 'hidden' }}>
          <div style={{
            height:     '100%',
            width:      `${progress}%`,
            background: `linear-gradient(to right, ${C.ember}, ${tColor})`,
            boxShadow:  `0 0 6px ${tColor}`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}

      <div style={{
        marginTop:       '8px',
        fontSize:        isCompact ? '11px' : '12px',
        fontWeight:      600,
        color:           hovered ? C.text : C.textMuted,
        transition:      'color 0.3s',
        lineHeight:      1.3,
        overflow:        'hidden',
        display:         '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>{drama.title}</div>

      {drama.episodes?.total && (
        <div style={{ fontSize: '11px', color: C.textDim, marginTop: '3px' }}>
          Ep {drama.episodes.current} / {drama.episodes.total}
        </div>
      )}
    </div>
  )
}

function CurrentlyWatchingSection({ dramas, onNavigate, isCompact }) {
  const watching = dramas.filter(d => d.status === 'Watching')
  if (!watching.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Currently Watching" rune="ᚹ" count={watching.length} isCompact={isCompact} />
      <HorizontalScroll isCompact={isCompact} gap={isCompact ? '8px' : '14px'}>
        {watching.map(d => (
          <WatchingCard key={d._id} drama={d} onNavigate={onNavigate} isCompact={isCompact} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 4. TOP 10 ─────────────────────────────────────────────────────────────────
function Top10SearchModal({ position, region, existingIds, onClose, onSaved, isCompact }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  const targetType = REGION_TYPE[region]

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)
    try {
      const res = await searchDramas(q)
      // Region-locked: Korean Top 10 can only ever surface Kdrama results,
      // same for Chinese/Japanese. isValidDrama is still the shared guard
      // that keeps anime and non-drama TV out entirely.
      setResults(
        res.filter(isValidDrama)
           .filter(item => getDramaType(item) === targetType)
           .slice(0, 12)
      )
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [targetType])

  // Debounced search-as-you-type, so results appear without needing to hit
  // the button every time. Manual Search button / Enter still work instantly.
  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 350)
    return () => clearTimeout(t)
  }, [query, runSearch])

  useEffect(() => { inputRef.current?.focus() }, [])

  const select = async (item) => {
    if (saving || existingIds.includes(item.id)) return
    setSaving(true)
    try {
      const { data } = await axios.put(`${TOP10_API}/${region}/${position}`, {
        tmdbId:     item.id,
        title:      item.name || item.original_name || '',
        coverImage: item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : '',
        year:       item.first_air_date ? parseInt(item.first_air_date.split('-')[0]) : null,
        type:       getDramaType(item),
      })
      onSaved(data.entries)
      onClose()
    } catch (err) {
      console.error('Top10 save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         600,
        background:     'rgba(11,7,16,0.92)',
        backdropFilter: 'blur(8px)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        isCompact ? '12px' : '24px',
      }}
    >
      <div style={{
        background: C.surface,
        border:     `1px solid ${C.borderGold}`,
        width:      '100%',
        maxWidth:   '600px',
        maxHeight:  '85vh',
        overflowY:  'auto',
        position:   'relative',
        boxShadow:  '0 0 80px rgba(0,0,0,0.8)',
      }}>
        <Corners color={C.goldBright} size={12} opacity={0.4} />

        <div style={{
          padding:        isCompact ? '16px 18px 12px' : '18px 24px 14px',
          borderBottom:   `1px solid ${C.borderGold}`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          position:       'sticky',
          top:            0,
          background:     C.surface,
          zIndex:         10,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{
              fontFamily:    '"Cinzel", serif',
              fontSize:      isCompact ? '11px' : '12px',
              letterSpacing: '0.3em',
              color:         C.goldBright,
            }}>SELECT FOR SLOT #{position}</span>
            <span style={{
              fontFamily:    '"Cinzel", serif',
              fontSize:      '9px',
              letterSpacing: '0.15em',
              color:         typeColor(targetType),
            }}>{typeLabel(targetType)} ONLY</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.textDim, fontSize: '20px', cursor: 'pointer', padding: '4px' }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.textDim}
          >×</button>
        </div>

        <div style={{ padding: isCompact ? '16px 18px 14px' : '20px 24px 16px', display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{
              position:  'absolute',
              left:      '12px',
              top:       '50%',
              transform: 'translateY(-50%)',
              color:     focused ? C.electric : C.textDim,
              fontSize:  '14px',
            }}>⌕</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch(query)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={`Search ${typeLabel(targetType).toLowerCase()} dramas...`}
              style={{
                width:       '100%',
                padding:     '10px 34px 10px 36px',
                background:  C.input,
                border:      `1px solid ${focused ? C.electric + '88' : C.borderGold}`,
                color:       C.text,
                fontSize:    '13px',
                fontFamily:  'inherit',
                outline:     'none',
                boxSizing:   'border-box',
                transition:  'border-color 0.2s',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{
                  position:  'absolute',
                  right:     '10px',
                  top:       '50%',
                  transform: 'translateY(-50%)',
                  background:'none',
                  border:    'none',
                  color:     C.textDim,
                  fontSize:  '15px',
                  cursor:    'pointer',
                  padding:   '2px 4px',
                }}
              >×</button>
            )}
          </div>
          <button
            onClick={() => runSearch(query)}
            disabled={loading || saving}
            style={{
              fontFamily:    '"Cinzel", serif',
              fontSize:      '11px',
              letterSpacing: '0.15em',
              color:         C.electric,
              background:    C.electricSoft,
              border:        `1px solid ${C.electric}55`,
              padding:       '0 20px',
              cursor:        loading || saving ? 'wait' : 'pointer',
              opacity:       loading || saving ? 0.6 : 1,
              whiteSpace:    'nowrap',
            }}
          >{loading ? 'Searching…' : saving ? 'Saving…' : 'Search'}</button>
        </div>

        {!loading && query.trim() && results.length === 0 && (
          <div style={{
            padding:       '0 24px 28px',
            textAlign:     'center',
            color:         C.textDim,
            fontSize:      '12px',
            letterSpacing: '0.05em',
          }}>
            No {typeLabel(targetType).toLowerCase()} dramas found for "{query}"
          </div>
        )}

        <div style={{
          padding:             `0 ${isCompact ? '18px' : '24px'} 24px`,
          display:             'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${isCompact ? 92 : 110}px, 1fr))`,
          gap:                 '12px',
        }}>
          {results.map(item => {
            const tc  = typeColor(getDramaType(item))
            const dup = existingIds.includes(item.id)
            return (
              <div
                key={item.id}
                onClick={() => select(item)}
                style={{ cursor: dup || saving ? 'not-allowed' : 'pointer', opacity: saving && !dup ? 0.6 : 1 }}
              >
                <div
                  style={{
                    height:     '150px',
                    background: C.bg,
                    border:     `1px solid ${C.borderGold}`,
                    overflow:   'hidden',
                    position:   'relative',
                    transition: 'border-color 0.2s',
                    filter:     dup ? 'grayscale(0.6) brightness(0.5)' : 'none',
                  }}
                  onMouseEnter={e => { if (!saving && !dup) e.currentTarget.style.borderColor = tc }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderGold }}
                >
                  {item.poster_path ? (
                    <img
                      src={`${IMG_BASE}/w185${item.poster_path}`}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.textDim,
                    }}>📺</div>
                  )}
                  {dup && (
                    <div style={{
                      position:       'absolute',
                      inset:          0,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      background:     'rgba(11,7,16,0.55)',
                    }}>
                      <span style={{
                        fontFamily:    '"Cinzel", serif',
                        fontSize:      '9px',
                        letterSpacing: '0.12em',
                        color:         C.goldBright,
                        border:        `1px solid ${C.gold}66`,
                        padding:       '3px 7px',
                        background:    'rgba(11,7,16,0.8)',
                      }}>IN TOP 10</span>
                    </div>
                  )}
                </div>
                <div style={{
                  marginTop:       '6px',
                  fontSize:        '11px',
                  color:           dup ? C.textDim : C.textMuted,
                  lineHeight:      1.3,
                  overflow:        'hidden',
                  display:         '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
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

function Top10Card({ entry, index, onEdit, onClear, onNavigate, isCompact }) {
  const [hovered,     setHovered]     = useState(false)
  const [showActions, setShowActions] = useState(false)
  const isEmpty = !entry.tmdbId

  const wrapperRef     = useRef(null)
  const longPressTimer = useRef(null)
  const longPressFired = useRef(false)

  const rankColor =
    index === 0 ? '#FFD700' :
    index === 1 ? '#E8C04A' :
    index === 2 ? '#C9963A' :
    index <= 5  ? C.electric :
    C.violet

  const posterW = isCompact ? CARD_W.compact : CARD_W.full
  const posterH = isCompact ? CARD_H.compact : CARD_H.full
  const rankFontSize = isCompact ? '120px' : '240px'
  const rankStroke    = isCompact ? '3.5px' : '5px'
  const actionsGap    = isCompact ? '34px' : '38px'

  // Long press (mobile) — reveals the action buttons without triggering navigation.
  const startLongPress = () => {
    if (isEmpty) return
    longPressFired.current = false
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      setShowActions(true)
    }, 450)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
  const handlePosterClick = () => {
    if (longPressFired.current) { longPressFired.current = false; return }
    if (isEmpty) onEdit()
    else if (entry.tmdbId) onNavigate('Info', entry.tmdbId)
  }

  // Tap outside closes the buttons once they're shown via long-press.
  useEffect(() => {
    if (!showActions) return
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowActions(false)
      }
    }
    document.addEventListener('touchstart', handleOutside)
    return () => document.removeEventListener('touchstart', handleOutside)
  }, [showActions])

  return (
    <div
      ref={wrapperRef}
      style={{
        position:      'relative',
        flexShrink:    0,
        display:       'flex',
        alignItems:    'flex-end',
        paddingBottom: actionsGap, // buffer so the cursor never leaves the hoverable box before reaching the buttons
      }}
      onMouseEnter={() => { setHovered(true); setShowActions(true) }}
      onMouseLeave={() => { setHovered(false); setShowActions(false) }}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
    >
      <div style={{
        height:        `${posterH}px`,
        display:       'flex',
        alignItems:    'flex-end',
        overflow:      'hidden',
        marginRight:   isCompact ? '-16px' : '-24px',
        zIndex:        1,
      }}>
        <div style={{
          fontFamily:      '"Cinzel Decorative", "Cinzel", serif',
          fontSize:        rankFontSize,
          fontWeight:      900,
          lineHeight:      1,
          color:           'transparent',
          WebkitTextStroke:`${rankStroke} ${isEmpty ? rankColor + '22' : rankColor + (hovered ? 'cc' : '66')}`,
          filter: hovered && !isEmpty
  ? `drop-shadow(0 0 8px ${rankColor}) drop-shadow(0 0 16px ${rankColor})`
  : 'none',
          userSelect:      'none',
          transition:      'all 0.3s ease',
          letterSpacing:   '-0.05em',
        }}>{index + 1}</div>
      </div>

      <div
        onClick={handlePosterClick}
        style={{
          width:        `${posterW}px`,
          height:       `${posterH}px`,
          flexShrink:   0,
          position:     'relative',
          zIndex:       2,
          background:   isEmpty ? C.surface : C.bg,
          border:       `1px solid ${
            hovered
              ? isEmpty ? C.gold + '66' : C.goldBright + '66'
              : C.borderGold
          }`,
          overflow:     'hidden',
          cursor:       'pointer',
          transform:    hovered ? 'translateY(-10px) scale(1.03)' : 'translateY(0) scale(1)',
          transformOrigin: 'bottom center',
          transition:   'all 0.3s ease',
          boxShadow:    hovered && !isEmpty
            ? '0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(240,180,41,0.3)'
            : hovered && isEmpty
              ? '0 8px 24px rgba(0,0,0,0.5)'
              : '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        {isEmpty ? (
          <div style={{
            width:          '100%',
            height:         '100%',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '10px',
            color:          C.textDim,
          }}>
            <div style={{ fontSize: '28px', opacity: 0.4 }}>+</div>
            <div style={{
              fontSize:      '9px',
              letterSpacing: '0.2em',
              fontFamily:    '"Cinzel", serif',
              color:         C.textDim + '88',
              textAlign:     'center',
              padding:       '0 12px',
            }}>CLICK TO ADD</div>
          </div>
        ) : (
          <>
            {entry.coverImage ? (
              <img
                src={entry.coverImage}
                alt={entry.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.textDim, fontSize: '28px',
              }}>📺</div>
            )}

            <div style={{
              position:   'absolute',
              inset:      0,
              background: `linear-gradient(to top, ${C.gold}33, transparent 60%)`,
              opacity:    hovered ? 1 : 0,
              transition: 'opacity 0.3s',
            }} />
          </>
        )}
        {hovered && <Corners color={C.gold} size={9} opacity={0.6} />}
      </div>

      {/* Action buttons — now sit inside the padded hoverable area (bottom: 0
          of the padding buffer), so the mouse never exits the wrapper on the
          way down to them. On mobile they're revealed by long-press. */}
      {showActions && !isEmpty && (
        <div style={{
          position:  'absolute',
          bottom:    '0px',
          left:      '50%',
          transform: 'translateX(-50%)',
          display:   'flex',
          gap:       '6px',
          zIndex:    10,
          whiteSpace:'nowrap',
        }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(); setShowActions(false) }}
            style={{
              fontFamily:    '"Cinzel", serif',
              fontSize:      '9px',
              letterSpacing: '0.1em',
              color:         C.electric,
              background:    'rgba(11,7,16,0.95)',
              border:        `1px solid ${C.electric}44`,
              padding:       '6px 12px',
              cursor:        'pointer',
            }}
          >Edit</button>
          <button
            onClick={e => { e.stopPropagation(); onClear(); setShowActions(false) }}
            style={{
              fontFamily:    '"Cinzel", serif',
              fontSize:      '9px',
              letterSpacing: '0.1em',
              color:         C.red,
              background:    'rgba(11,7,16,0.95)',
              border:        `1px solid ${C.red}44`,
              padding:       '6px 12px',
              cursor:        'pointer',
            }}
          >Clear</button>
        </div>
      )}
    </div>
  )
}

const REGIONS       = ['Korean', 'Chinese', 'Japanese']
const EMPTY_ENTRIES = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1, tmdbId: null, title: '', coverImage: '', year: null, type: '',
  }))

function normaliseEntries(rawEntries) {
  return Array.from({ length: 10 }, (_, i) => {
    const found = (rawEntries || []).find(e => e.position === i + 1)
    return found || { position: i + 1, tmdbId: null, title: '', coverImage: '', year: null, type: '' }
  })
}

// Skeleton mirrors the real number+poster geometry (with shimmer) so switching
// regions or loading fresh no longer feels like a broken/static state.
function Top10Skeleton({ isCompact }) {
  const posterW = isCompact ? CARD_W.compact : CARD_W.full
  const posterH = isCompact ? CARD_H.compact : CARD_H.full
  const rankW   = isCompact ? 48 : 64

  return (
    <div style={{ display: 'flex', gap: '4px', paddingTop: '16px', overflow: 'hidden' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-end', flexShrink: 0 }}>
          <div style={{
            width:          `${rankW}px`,
            height:         `${posterH * 0.6}px`,
            marginRight:    isCompact ? '-16px' : '-24px',
            zIndex:         1,
            background:     `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
            backgroundSize: '200% 100%',
            animation:      'shimmer 1.4s infinite',
            opacity:        0.5,
          }} />
          <div style={{
            width:          `${posterW}px`,
            height:         `${posterH}px`,
            position:       'relative',
            zIndex:         2,
            background:     `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
            backgroundSize: '200% 100%',
            animation:      'shimmer 1.4s infinite',
            border:         `1px solid ${C.borderGold}`,
          }} />
        </div>
      ))}
    </div>
  )
}

function Top10Section({ onNavigate, isCompact }) {
  const [region,    setRegion]    = useState('Korean')
  const [entries,   setEntries]   = useState(EMPTY_ENTRIES)
  const [loading,   setLoading]   = useState(true)
  const [modalSlot, setModalSlot] = useState(null)
  const { user }  = useAuth()
  const navigate  = useNavigate()

  // load() accepts an explicit region string so it's always correct even
  // when called right after a region switch.
  const load = useCallback(async (r) => {
    setLoading(true)
    try {
      const res = await axios.get(`${TOP10_API}/${r}`)
      setEntries(normaliseEntries(res.data.entries))
    } catch {
      setEntries(EMPTY_ENTRIES())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(region) }, [region, load])

  const clearSlot = async (pos) => {
    if (!user) { navigate('/profile'); return }
    try {
      await axios.delete(`${TOP10_API}/${region}/${pos}`)
      load(region)
    } catch (err) {
      console.error('Top10 clear error:', err)
    }
  }

  const regionTabColor = { Korean: C.electric, Chinese: C.violet, Japanese: C.indigo }

  // tmdbIds already occupying a different slot in this region — used to
  // block duplicate dramas in the search modal.
  const existingIdsForSlot = (pos) =>
    entries.filter(e => e.position !== pos && e.tmdbId).map(e => e.tmdbId)

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader
        title="Top 10"
        rune="ᛏ"
        isCompact={isCompact}
        right={
          <div style={{ display: 'flex', gap: '6px' }}>
            {REGIONS.map(r => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                style={{
                  fontFamily:    '"Cinzel", serif',
                  fontSize:      isCompact ? '9px' : '10px',
                  letterSpacing: isCompact ? '0.08em' : '0.15em',
                  color:         region === r ? regionTabColor[r] : C.textDim,
                  background:    region === r ? `${regionTabColor[r]}15` : 'transparent',
                  border:        `1px solid ${region === r ? regionTabColor[r] + '55' : C.borderGold}`,
                  padding:       isCompact ? '5px 9px' : '6px 14px',
                  cursor:        'pointer',
                  transition:    'all 0.2s',
                  whiteSpace:    'nowrap',
                }}
              >{r}</button>
            ))}
          </div>
        }
      />

      {loading ? (
        <Top10Skeleton isCompact={isCompact} />
      ) : (
        <HorizontalScroll
          isCompact={isCompact}
          scrollAmount={isCompact ? 380 : 460}
          gap="4px"
          paddingTop="16px"
          paddingBottom="60px"
        >
          {entries.map((entry, i) => (
            <Top10Card
              key={entry.position}
              entry={entry}
              index={i}
              isCompact={isCompact}
              onEdit={() => {
                if (!user) { navigate('/profile'); return }
                setModalSlot(entry.position)
              }}
              onClear={() => clearSlot(entry.position)}
              onNavigate={onNavigate}
            />
          ))}
        </HorizontalScroll>
      )}

      {modalSlot !== null && (
        <Top10SearchModal
          position={modalSlot}
          region={region}
          existingIds={existingIdsForSlot(modalSlot)}
          isCompact={isCompact}
          onClose={() => setModalSlot(null)}
          onSaved={updatedEntries => {
            setEntries(normaliseEntries(updatedEntries))
            setModalSlot(null)
          }}
        />
      )}
    </div>
  )
}

// ── 5. RECENTLY RELEASED ──────────────────────────────────────────────────────
function RecentlyReleasedSection({ onNavigate, isCompact }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    const countries = ['KR', 'CN', 'JP', 'TW']

    const fetches = countries.flatMap(country =>
      [1, 2, 3].map(page =>
        fetch(`${TMDB_BASE}?path=discover/tv&with_origin_country=${country}&first_air_date.gte=${threeMonthsAgo}&sort_by=first_air_date.desc&page=${page}`)
          .then(r => r.json())
          .then(d => d.results || [])
          .catch(() => [])
      )
    )

    Promise.all(fetches).then(pages => {
      const seen     = new Set()
      const filtered = pages.flat().filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return isValidDrama(item)
      }).sort((a, b) =>
        (b.first_air_date || '').localeCompare(a.first_air_date || '')
      ).slice(0, 45)
      setItems(filtered)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Recently Released" rune="ᚾ" isCompact={isCompact} />
      <div style={{ display: 'flex', gap: isCompact ? '8px' : '14px', overflow: 'hidden' }}>
        {Array.from({ length: isCompact ? 4 : 5 }).map((_, i) => (
          <div key={i} style={{
            flexShrink:     0,
            width:          `${isCompact ? CARD_W.compact : CARD_W.full}px`,
            height:         `${isCompact ? CARD_H.compact : CARD_H.full}px`,
            background:     `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
            backgroundSize: '200% 100%',
            animation:      'shimmer 1.4s infinite',
            border:         `1px solid ${C.borderGold}`,
          }} />
        ))}
      </div>
    </div>
  )

  if (!items.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Recently Released" rune="ᚾ" count={items.length} isCompact={isCompact} />
      <HorizontalScroll isCompact={isCompact} gap={isCompact ? '8px' : '14px'}>
        {items.map(item => (
          <TrendingCard key={item.id} item={item} onNavigate={onNavigate} isCompact={isCompact} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 6. EXPLORE (random 10 with shuffle) ──────────────────────────────────────
const EXPLORE_COUNT = 10

function ExploreSection({ onNavigate, isCompact }) {
  const [pool,     setPool]     = useState([])
  const [shown,    setShown]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [spinning, setSpinning] = useState(false)
  const shownIds               = useRef(new Set())

  function pickN(arr, excludeIds, n) {
    const available = arr.filter(i => !excludeIds.has(i.id))
    const source    = available.length >= n ? available : arr
    return [...source].sort(() => Math.random() - 0.5).slice(0, n)
  }

  useEffect(() => {
    let cancelled = false

    const countries = ['KR', 'CN', 'TW', 'JP']
    const sorts = [
      'popularity.desc',
      'vote_average.desc&vote_count.gte=100',
      'first_air_date.desc',
    ]

    // Cross product of country × sort — each combo hits a random page (1–8)
    // instead of always the same top-of-catalog pages, so the pool varies.
    const fetches = countries.flatMap(country =>
      sorts.map(sort => {
        const randomPage = Math.floor(Math.random() * 8) + 1
        return fetch(`${TMDB_BASE}?path=discover/tv&with_origin_country=${country}&sort_by=${sort}&page=${randomPage}`)
          .then(r => r.json())
          .then(d => d.results || [])
          .catch(() => [])
      })
    )

    Promise.all(fetches).then(pages => {
      if (cancelled) return
      const seen = new Set()
      const all  = pages.flat().filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return isValidDrama(item)
      })
      setPool(all)
      const initial = pickN(all, new Set(), EXPLORE_COUNT)
      shownIds.current = new Set(initial.map(i => i.id))
      setShown(initial)
    }).catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const refresh = () => {
    setSpinning(true)
    const next = pickN(pool, shownIds.current, EXPLORE_COUNT)
    shownIds.current = new Set(next.map(i => i.id))
    setShown(next)
    setTimeout(() => setSpinning(false), 400)
  }

  const RefreshButton = (
    <button
      onClick={refresh}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '6px',
        fontFamily:    '"Cinzel", serif',
        fontSize:      '10px',
        letterSpacing: '0.2em',
        color:         C.electric,
        background:    'transparent',
        border:        `1px solid ${C.electric}44`,
        padding:       '6px 14px',
        cursor:        'pointer',
        transition:    'all 0.2s',
        whiteSpace:    'nowrap',
      }}
      onMouseEnter={e => e.currentTarget.style.background = C.electricSoft}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{
        display:    'inline-block',
        transform:  spinning ? 'rotate(360deg)' : 'rotate(0deg)',
        transition: 'transform 0.4s ease',
        fontSize:   '13px',
      }}>↻</span>
      Refresh
    </button>
  )

  const shimmerBox = (i) => (
    <div key={i} style={{
      flexShrink:     0,
      width:          `${isCompact ? CARD_W.compact : CARD_W.full}px`,
      height:         `${isCompact ? CARD_H.compact : CARD_H.full}px`,
      background:     `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
      backgroundSize: '200% 100%',
      animation:      'shimmer 1.4s infinite',
      border:         `1px solid ${C.borderGold}`,
    }} />
  )

  // Unified with every other section: HorizontalScroll gives desktop real
  // scroll arrows (the old grid just wrapped to a new row with no way to
  // scroll), and mobile keeps its swipeable strip.
  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Explore New" rune="ᚱ" right={RefreshButton} isCompact={isCompact} />

      <div style={{ opacity: spinning ? 0.4 : 1, transition: 'opacity 0.2s' }}>
        <HorizontalScroll isCompact={isCompact} gap={isCompact ? '8px' : '14px'}>
          {loading
            ? Array.from({ length: EXPLORE_COUNT }).map((_, i) => shimmerBox(i))
            : shown.map(item => (
                <TrendingCard key={item.id} item={item} onNavigate={onNavigate} isCompact={isCompact} />
              ))
          }
        </HorizontalScroll>
      </div>
    </div>
  )
}

// ── 7. RECENTLY ADDED (my list) ───────────────────────────────────────────────
function RecentlyAddedCard({ drama, onNavigate, isCompact }) {
  const [hovered, setHovered] = useState(false)
  const sc = {
    'Watching':      C.electric,
    'Completed':     C.green,
    'Dropped':       C.red,
    'Plan to Watch': C.violet,
    'On Hold':       C.indigo,
  }[drama.status] || C.textMuted
  const typeC = typeColor(drama.type)

  return (
    <div
      onClick={() => drama.tmdbId && onNavigate('Info', drama.tmdbId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        isCompact ? '8px' : '16px',
        padding:    isCompact ? '10px' : '14px 20px',
        background: hovered
          ? `linear-gradient(90deg, ${C.surfaceHover}, ${C.surface})`
          : 'transparent',
        border:     `1px solid ${hovered ? C.borderElec : 'transparent'}`,
        borderLeft: `2px solid ${hovered ? sc : C.textDim + '33'}`,
        cursor:     drama.tmdbId ? 'pointer' : 'default',
        transition: 'all 0.25s ease',
        position:   'relative',
        overflow:   'hidden',
        minWidth:   0,
      }}
    >
      {hovered && (
        <div style={{
          position:      'absolute',
          inset:         0,
          pointerEvents: 'none',
          background:    `linear-gradient(90deg, ${sc}08, transparent)`,
        }} />
      )}

      {/* Thumbnail */}
      <div style={{
        width:      isCompact ? '32px' : '42px',
        height:     isCompact ? '46px' : '60px',
        flexShrink: 0,
        background: C.surface,
        border:     `1px solid ${hovered ? C.borderElec : C.borderGold}`,
        overflow:   'hidden',
        transition: 'border-color 0.25s',
      }}>
        {drama.coverImage ? (
          <img
            src={drama.coverImage}
            alt={drama.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.textDim, fontSize: '16px',
          }}>📺</div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:      isCompact ? '12px' : '14px',
          fontWeight:    600,
          color:         hovered ? C.text : C.textMuted,
          transition:    'color 0.25s',
          whiteSpace:    'nowrap',
          overflow:      'hidden',
          textOverflow:  'ellipsis',
        }}>{drama.title}</div>
        <div style={{
          fontSize:      '11px',
          color:         C.textDim,
          marginTop:     '4px',
          display:       'flex',
          gap:           '10px',
          letterSpacing: '0.05em',
        }}>
          {/* Now colored per drama type (Korean/Chinese/Japanese) instead of
              always rendering gold regardless of type. */}
          <span style={{ color: typeC + 'cc', fontFamily: '"Cinzel", serif' }}>
            {typeLabel(drama.type, isCompact)}
          </span>
          {drama.year && <span>{drama.year}</span>}
          {!isCompact && drama.genres?.[0] && <span>{drama.genres[0]}</span>}
        </div>
      </div>

      {/* Rating — comes before status, fixed width so ratings line up in a
          straight column regardless of the status label's length */}
      {drama.rating && (
        <div style={{
          fontSize:   isCompact ? '12px' : '14px',
          fontWeight: 700,
          color:      C.goldBright,
          minWidth:   isCompact ? '24px' : '36px',
          textAlign:  'right',
          textShadow: `0 0 10px ${C.gold}`,
          fontFamily: '"Cinzel", serif',
          flexShrink: 0,
        }}>
          {drama.rating}
          <span style={{ fontSize: '9px', color: C.textDim, fontWeight: 400 }}>/10</span>
        </div>
      )}

      {/* Status badge — fixed width, sits last */}
      <div style={{
        fontSize:      isCompact ? '8px' : '10px',
        letterSpacing: '0.1em',
        color:         sc,
        padding:       isCompact ? '3px 5px' : '4px 10px',
        border:        `1px solid ${sc}44`,
        background:    `${sc}0f`,
        minWidth:      isCompact ? '58px' : '108px',
        textAlign:     'center',
        boxSizing:     'border-box',
        whiteSpace:    'nowrap',
        overflow:      'hidden',
        textOverflow:  'ellipsis',
        flexShrink:    0,
        fontFamily:    '"Cinzel", serif',
      }}>{drama.status}</div>
    </div>
  )
}

function RecentlyAddedSection({ onNavigate, isCompact }) {
  const [dramas,  setDramas]  = useState([])
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
      <SectionHeader title="Recently Added to My List" rune="ᛊ" count={recent.length} isCompact={isCompact} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {recent.map(d => (
          <RecentlyAddedCard key={d._id} drama={d} onNavigate={onNavigate} isCompact={isCompact} />
        ))}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate, isCompact = false }) {
  const [dramas,  setDramas]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(API)
      .then(r => setDramas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <StatsRow dramas={dramas} />

      <TrendingSection onNavigate={onNavigate} isCompact={isCompact} />

      {!loading && (
        <CurrentlyWatchingSection dramas={dramas} onNavigate={onNavigate} isCompact={isCompact} />
      )}

      <Top10Section onNavigate={onNavigate} isCompact={isCompact} />

      <RecentlyReleasedSection onNavigate={onNavigate} isCompact={isCompact} />

      <ExploreSection onNavigate={onNavigate} isCompact={isCompact} />

      <RecentlyAddedSection onNavigate={onNavigate} isCompact={isCompact} />
    </div>
  )
}