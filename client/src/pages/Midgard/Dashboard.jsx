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
// Derived from the requested #020066 #0500ff #3733ff #33b7ff #00a5ff #004266.
// electric/violet/indigo carry the three drama-type identities (Kdrama/Cdrama/
// Jdrama), gold carries ratings + top highlights, ember is the muted secondary.
// green (Completed) and red (Dropped) are kept as semantic status colors.
const C = {
  bg:           '#03040f',
  surface:      '#0A0F3D',
  surfaceHover: '#101a52',
  input:        '#060a2e',
  ember:        '#004266',
  emberSoft:    'rgba(0,66,102,0.18)',
  gold:         '#00a5ff',
  goldSoft:     'rgba(0,165,255,0.14)',
  goldBright:   '#33b7ff',
  electric:     '#33b7ff',
  electricSoft: 'rgba(51,183,255,0.12)',
  violet:       '#3733ff',
  violetSoft:   'rgba(55,51,255,0.15)',
  indigo:       '#0500ff',
  indigoSoft:   'rgba(5,0,255,0.15)',
  green:        '#22C55E',
  red:          '#EF4444',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderGold:   'rgba(0,165,255,0.2)',
  borderElec:   'rgba(51,183,255,0.15)',
}



// ── Drama type helpers ────────────────────────────────────────────────────────
const ALLOWED_COUNTRIES = new Set(['KR', 'CN', 'TW', 'HK', 'JP'])
const ALLOWED_LANGUAGES = new Set(['ko', 'zh', 'ja'])
// 16 = Animation — this is what keeps anime out of Midgard. Every fetch below
// now runs through isValidDrama() instead of duplicating this check inline.
const BLOCKED_GENRES    = new Set([16, 10764, 10767, 10763, 10766])

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

function typeLabel(type) {
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

function SectionHeader({ title, rune, count, right, isCompact }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display:       'flex',
        alignItems:    isCompact ? 'flex-start' : 'center',
        flexDirection: isCompact && right ? 'column' : 'row',
        gap:           isCompact ? '12px' : '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
        {right && (
          <div style={{ marginLeft: isCompact ? 0 : 'auto' }}>{right}</div>
        )}
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
  scrollAmount = 520,
  gap          = '14px',
  paddingTop   = '12px',
  paddingBottom = '12px',
}) {
  const ref                     = useRef(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [hovered,  setHovered]  = useState(false)

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

  const showArrows = !isCompact
  const arrowVisible = (dir) => showArrows && (dir === -1 ? canLeft : canRight) && hovered

  const arrowStyle = {
    position:        'absolute',
    top:             '50%',
    transform:       'translateY(-50%)',
    zIndex:          10,
    width:           '34px',
    height:          '34px',
    borderRadius:    '50%',
    background:      'rgba(3,4,15,0.75)',
    backdropFilter:  'blur(6px)',
    border:          `1px solid ${C.borderElec}`,
    color:           C.electric,
    fontSize:        '15px',
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    boxShadow:       '0 4px 14px rgba(0,0,0,0.5)',
    transition:      'opacity 0.25s ease, border-color 0.2s ease, transform 0.2s ease',
  }

  return (
    <div
      style={{ position: 'relative', overflow: 'visible' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showArrows && canLeft && (
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          style={{
            ...arrowStyle,
            left:          '-16px',
            opacity:       arrowVisible(-1) ? 1 : 0,
            pointerEvents: arrowVisible(-1) ? 'auto' : 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.electric}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.borderElec}
        >‹</button>
      )}
      <div
        ref={ref}
        onScroll={check}
        className="hide-scroll"
        style={{
          display:         'flex',
          gap,
          overflowX:       'auto',
          paddingBottom,
          paddingTop,
          minWidth:        'max-content',
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
          style={{
            ...arrowStyle,
            right:         '-16px',
            opacity:       arrowVisible(1) ? 1 : 0,
            pointerEvents: arrowVisible(1) ? 'auto' : 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.electric}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.borderElec}
        >›</button>
      )}
    </div>
  )
}

// ── Trending / generic drama card ─────────────────────────────────────────────
function TrendingCard({ item, onNavigate, isCompact }) {
  const [hovered, setHovered] = useState(false)
  const type   = getDramaType(item)
  const tColor = typeColor(type)
  const year   = item.first_air_date ? item.first_air_date.split('-')[0] : null
  const rating = item.vote_average   ? item.vote_average.toFixed(1)       : null

  const w = isCompact ? 104 : 160
  const h = isCompact ? 145 : 220

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

        {/* Type badge — background made more transparent per polish pass */}
        <div style={{
          position:      'absolute',
          top:           '8px',
          left:          '8px',
          padding:       isCompact ? '2px 6px' : '3px 8px',
          background:    'rgba(3,4,15,0.45)',
          backdropFilter:'blur(3px)',
          border:        `1px solid ${tColor}66`,
          fontSize:      isCompact ? '8px' : '9px',
          letterSpacing: '0.15em',
          color:         tColor,
          fontFamily:    '"Cinzel", serif',
        }}>{typeLabel(type)}</div>

        {/* Rating badge */}
        {rating && parseFloat(rating) > 0 && (
          <div style={{
            position:      'absolute',
            top:           '8px',
            right:         '8px',
            padding:       isCompact ? '2px 6px' : '3px 8px',
            background:    'rgba(3,4,15,0.45)',
            backdropFilter:'blur(3px)',
            border:        `1px solid ${C.gold}55`,
            fontSize:      isCompact ? '9px' : '10px',
            color:         C.goldBright,
            fontFamily:    '"Cinzel", serif',
            fontWeight:    700,
          }}>★ {rating}</div>
        )}

        {/* Hover glow */}
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
        color:         C.textMuted,
        textTransform: 'uppercase',
        fontFamily:    '"Cinzel", serif',
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
      <StatCard label="Total"         value={dramas.length}                                            color={C.electric}   rune="ᛏ" />
      <StatCard label="Watching"      value={dramas.filter(d => d.status === 'Watching').length}        color={C.electric}   rune="ᚹ" />
      <StatCard label="Completed"     value={dramas.filter(d => d.status === 'Completed').length}       color={C.green}      rune="ᚲ" />
      <StatCard label="Plan to Watch" value={dramas.filter(d => d.status === 'Plan to Watch').length}   color={C.violet}     rune="ᛈ" />
      <StatCard label="On Hold"       value={dramas.filter(d => d.status === 'On Hold').length}         color={C.indigo}     rune="ᚺ" />
      <StatCard label="Dropped"       value={dramas.filter(d => d.status === 'Dropped').length}         color={C.red}        rune="ᛞ" />
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
      <div style={{ display: 'flex', gap: '14px', overflow: 'hidden' }}>
        {Array.from({ length: isCompact ? 4 : 6 }).map((_, i) => (
          <div key={i} style={{
            flexShrink:     0,
            width:          isCompact ? '104px' : '160px',
            height:         isCompact ? '145px' : '220px',
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
      <HorizontalScroll isCompact={isCompact}>
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
  const progress = drama.episodes?.total
    ? (drama.episodes.current / drama.episodes.total) * 100
    : null

  const w = isCompact ? 104 : 150
  const h = isCompact ? 145 : 210

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
        border:     `1px solid ${hovered ? C.electric + '88' : C.borderGold}`,
        overflow:   'hidden',
        position:   'relative',
        boxShadow:  hovered
          ? `0 12px 40px ${C.electricSoft}, 0 0 0 1px ${C.electric}33`
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
          background:    'rgba(3,4,15,0.45)',
          backdropFilter:'blur(3px)',
          border:        `1px solid ${C.gold}55`,
          fontSize:      isCompact ? '8px' : '9px',
          letterSpacing: '0.15em',
          color:         C.gold,
          fontFamily:    '"Cinzel", serif',
        }}>{typeLabel(drama.type)}</div>

        <div style={{
          position:   'absolute',
          inset:      0,
          background: `linear-gradient(to top, ${C.electric}22, transparent)`,
          opacity:    hovered ? 1 : 0,
          transition: 'opacity 0.3s',
        }} />

        {hovered && <Corners color={C.electric} size={10} opacity={0.7} />}
      </div>

      {progress !== null && (
        <div style={{ height: '2px', background: C.borderGold, marginTop: '6px', overflow: 'hidden' }}>
          <div style={{
            height:     '100%',
            width:      `${progress}%`,
            background: `linear-gradient(to right, ${C.ember}, ${C.electric})`,
            boxShadow:  `0 0 6px ${C.electric}`,
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
      <HorizontalScroll isCompact={isCompact}>
        {watching.map(d => (
          <WatchingCard key={d._id} drama={d} onNavigate={onNavigate} isCompact={isCompact} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 4. TOP 10 ─────────────────────────────────────────────────────────────────
function Top10SearchModal({ position, region, onClose, onSaved }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [focused, setFocused] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await searchDramas(query)
      setResults(res.slice(0, 12))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const select = async (item) => {
    if (saving) return
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
        background:     'rgba(3,4,15,0.92)',
        backdropFilter: 'blur(8px)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '24px',
      }}
    >
      <div style={{
        background: C.surface,
        border:     `1px solid ${C.borderGold}`,
        width:      '100%',
        maxWidth:   '600px',
        maxHeight:  '80vh',
        overflowY:  'auto',
        position:   'relative',
        boxShadow:  '0 0 80px rgba(0,0,0,0.8)',
      }}>
        <Corners color={C.goldBright} size={12} opacity={0.4} />

        {/* Header */}
        <div style={{
          padding:        '18px 24px 14px',
          borderBottom:   `1px solid ${C.borderGold}`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          position:       'sticky',
          top:            0,
          background:     C.surface,
          zIndex:         10,
        }}>
          <span style={{
            fontFamily:    '"Cinzel", serif',
            fontSize:      '12px',
            letterSpacing: '0.3em',
            color:         C.goldBright,
          }}>SELECT FOR SLOT #{position}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.textDim, fontSize: '20px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.textDim}
          >×</button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '20px 24px 16px', display: 'flex', gap: '10px' }}>
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
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search drama title..."
              style={{
                width:       '100%',
                padding:     '10px 12px 10px 36px',
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
          </div>
          <button
            onClick={search}
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
            }}
          >{loading ? 'Searching…' : saving ? 'Saving…' : 'Search'}</button>
        </div>

        {/* Results grid */}
        <div style={{
          padding:             '0 24px 24px',
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap:                 '12px',
        }}>
          {results.map(item => {
            const tc = typeColor(getDramaType(item))
            return (
              <div
                key={item.id}
                onClick={() => !saving && select(item)}
                style={{ cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                <div
                  style={{
                    height:     '150px',
                    background: C.bg,
                    border:     `1px solid ${C.borderGold}`,
                    overflow:   'hidden',
                    position:   'relative',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => { if (!saving) e.currentTarget.style.borderColor = tc }}
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
                </div>
                <div style={{
                  marginTop:       '6px',
                  fontSize:        '11px',
                  color:           C.textMuted,
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

function Top10Card({ entry, index, onEdit, onClear, onNavigate }) {
  const [hovered,     setHovered]     = useState(false)
  const [showActions, setShowActions] = useState(false)
  const isEmpty = !entry.tmdbId
  const tColor  = entry.type ? typeColor(entry.type) : C.textDim

  const rankColor =
    index === 0 ? '#FFD700' :
    index === 1 ? '#E8C04A' :
    index === 2 ? '#C9963A' :
    index <= 5  ? C.electric :
    C.violet

  return (
    <div
      style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}
      onMouseEnter={() => { setHovered(true); setShowActions(true) }}
      onMouseLeave={() => { setHovered(false); setShowActions(false) }}
    >
      {/* Big rank number — sized up per polish pass, row height stays fixed
          because every slot uses the same font size and flex-end alignment */}
      <div style={{
        fontFamily:      '"Cinzel Decorative", "Cinzel", serif',
        fontSize:        'clamp(120px, 14vw, 180px)',
        fontWeight:      900,
        lineHeight:      1,
        color:           'transparent',
        WebkitTextStroke:`3px ${isEmpty ? rankColor + '22' : rankColor + (hovered ? 'cc' : '66')}`,
        textShadow:      hovered && !isEmpty
          ? `0 0 60px ${rankColor}44, 0 0 120px ${rankColor}22`
          : 'none',
        userSelect:      'none',
        marginRight:     '-24px',
        zIndex:          1,
        transition:      'all 0.3s ease',
        letterSpacing:   '-0.05em',
      }}>{index + 1}</div>

      {/* Poster */}
      <div
        onClick={() => {
          if (isEmpty)           onEdit()
          else if (entry.tmdbId) onNavigate('Info', entry.tmdbId)
        }}
        style={{
          width:        '140px',
          height:       '200px',
          flexShrink:   0,
          position:     'relative',
          zIndex:       2,
          background:   isEmpty ? C.surface : C.bg,
          border:       `1px solid ${
            hovered
              ? isEmpty ? C.gold + '66' : tColor + '99'
              : C.borderGold
          }`,
          overflow:     'hidden',
          cursor:       'pointer',
          transform:    hovered ? 'translateY(-10px) scale(1.03)' : 'translateY(0) scale(1)',
          transformOrigin: 'bottom center',
          transition:   'all 0.3s ease',
          boxShadow:    hovered && !isEmpty
            ? `0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px ${tColor}44`
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
            {/* Type badge — more transparent background */}
            <div style={{
              position:      'absolute',
              top:           '6px',
              left:          '6px',
              padding:       '2px 7px',
              background:    'rgba(3,4,15,0.45)',
              backdropFilter:'blur(3px)',
              border:        `1px solid ${tColor}55`,
              fontSize:      '9px',
              color:         tColor,
              fontFamily:    '"Cinzel", serif',
              letterSpacing: '0.1em',
            }}>{typeLabel(entry.type)}</div>

            <div style={{
              position:   'absolute',
              inset:      0,
              background: `linear-gradient(to top, ${tColor}44, transparent 60%)`,
              opacity:    hovered ? 1 : 0,
              transition: 'opacity 0.3s',
            }} />
          </>
        )}
        {hovered && <Corners color={isEmpty ? C.gold : tColor} size={9} opacity={0.6} />}
      </div>

      {/* Action buttons */}
      {showActions && !isEmpty && (
        <div style={{
          position:  'absolute',
          bottom:    '-34px',
          left:      '50%',
          transform: 'translateX(-50%)',
          display:   'flex',
          gap:       '6px',
          zIndex:    10,
          whiteSpace:'nowrap',
        }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            style={{
              fontFamily:    '"Cinzel", serif',
              fontSize:      '9px',
              letterSpacing: '0.1em',
              color:         C.electric,
              background:    'rgba(3,4,15,0.95)',
              border:        `1px solid ${C.electric}44`,
              padding:       '4px 10px',
              cursor:        'pointer',
            }}
          >Edit</button>
          <button
            onClick={e => { e.stopPropagation(); onClear() }}
            style={{
              fontFamily:    '"Cinzel", serif',
              fontSize:      '9px',
              letterSpacing: '0.1em',
              color:         C.red,
              background:    'rgba(3,4,15,0.95)',
              border:        `1px solid ${C.red}44`,
              padding:       '4px 10px',
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
function Top10Skeleton() {
  return (
    <div style={{ display: 'flex', gap: '4px', paddingTop: '16px', overflow: 'hidden' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-end', flexShrink: 0 }}>
          <div style={{
            width:          '70px',
            height:         '120px',
            marginRight:    '-24px',
            zIndex:         1,
            background:     `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
            backgroundSize: '200% 100%',
            animation:      'shimmer 1.4s infinite',
            opacity:        0.5,
          }} />
          <div style={{
            width:          '140px',
            height:         '200px',
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

  return (
    <div style={{ marginBottom: '72px' }}>
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
        <Top10Skeleton />
      ) : (
        <div style={{ paddingBottom: '44px' }}>
          <HorizontalScroll isCompact={isCompact} scrollAmount={460} gap="4px" paddingTop="16px" paddingBottom="0px">
            {entries.map((entry, i) => (
              <Top10Card
                key={entry.position}
                entry={entry}
                index={i}
                onEdit={() => {
                  if (!user) { navigate('/profile'); return }
                  setModalSlot(entry.position)
                }}
                onClear={() => clearSlot(entry.position)}
                onNavigate={onNavigate}
              />
            ))}
          </HorizontalScroll>
        </div>
      )}

      {modalSlot !== null && (
        <Top10SearchModal
          position={modalSlot}
          region={region}
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
      <div style={{ display: 'flex', gap: '14px', overflow: 'hidden' }}>
        {Array.from({ length: isCompact ? 4 : 5 }).map((_, i) => (
          <div key={i} style={{
            flexShrink:     0,
            width:          isCompact ? '104px' : '160px',
            height:         isCompact ? '145px' : '220px',
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
      <HorizontalScroll isCompact={isCompact}>
        {items.map(item => (
          <TrendingCard key={item.id} item={item} onNavigate={onNavigate} isCompact={isCompact} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 6. EXPLORE (random 6 with shuffle) ───────────────────────────────────────
function ExploreSection({ onNavigate, isCompact }) {
  const [pool,     setPool]     = useState([])
  const [shown,    setShown]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [spinning, setSpinning] = useState(false)
  const shownIds               = useRef(new Set())

  function pick6(arr, excludeIds) {
    const available = arr.filter(i => !excludeIds.has(i.id))
    const source    = available.length >= 6 ? available : arr
    return [...source].sort(() => Math.random() - 0.5).slice(0, 6)
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
      const initial = pick6(all, new Set())
      shownIds.current = new Set(initial.map(i => i.id))
      setShown(initial)
    }).catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

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
      flexShrink:     isCompact ? 0 : undefined,
      width:          isCompact ? '104px' : undefined,
      height:         isCompact ? '145px' : '220px',
      background:     `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
      backgroundSize: '200% 100%',
      animation:      'shimmer 1.4s infinite',
      border:         `1px solid ${C.borderGold}`,
    }} />
  )

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Explore New" rune="ᚱ" right={RefreshButton} isCompact={isCompact} />

      {isCompact ? (
        // Mobile: horizontal scroll (manual swipe, no scrollbar, no arrows)
        <div className="hide-scroll" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => shimmerBox(i))
            : shown.map(item => (
                <TrendingCard key={item.id} item={item} onNavigate={onNavigate} isCompact />
              ))
          }
        </div>
      ) : (
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap:                 '14px',
          opacity:             spinning ? 0.4 : 1,
          transition:          'opacity 0.2s',
        }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => shimmerBox(i))
            : shown.map(item => (
                <TrendingCard key={item.id} item={item} onNavigate={onNavigate} />
              ))
          }
        </div>
      )}
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

  return (
    <div
      onClick={() => drama.tmdbId && onNavigate('Info', drama.tmdbId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        isCompact ? '10px' : '16px',
        padding:    isCompact ? '10px 12px' : '14px 20px',
        background: hovered
          ? `linear-gradient(90deg, ${C.surfaceHover}, ${C.surface})`
          : 'transparent',
        border:     `1px solid ${hovered ? C.borderElec : 'transparent'}`,
        borderLeft: `2px solid ${hovered ? sc : C.textDim + '33'}`,
        cursor:     drama.tmdbId ? 'pointer' : 'default',
        transition: 'all 0.25s ease',
        position:   'relative',
        overflow:   'hidden',
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
        width:      isCompact ? '34px' : '42px',
        height:     isCompact ? '48px' : '60px',
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
          color:         hovered ? C.text : '#9BAEC8',
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
          <span style={{ color: C.gold + 'aa', fontFamily: '"Cinzel", serif' }}>
            {typeLabel(drama.type)}
          </span>
          {drama.year && <span>{drama.year}</span>}
          {!isCompact && drama.genres?.[0] && <span>{drama.genres[0]}</span>}
        </div>
      </div>

      {/* Rating — comes before status now, and has a fixed width so it lines
          up straight down the column regardless of the status label's length */}
      {drama.rating && (
        <div style={{
          fontSize:   isCompact ? '12px' : '14px',
          fontWeight: 700,
          color:      C.goldBright,
          minWidth:   isCompact ? '28px' : '36px',
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
        fontSize:      isCompact ? '9px' : '10px',
        letterSpacing: '0.1em',
        color:         sc,
        padding:       isCompact ? '3px 6px' : '4px 10px',
        border:        `1px solid ${sc}44`,
        background:    `${sc}0f`,
        minWidth:      isCompact ? '76px' : '108px',
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
    <div>
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