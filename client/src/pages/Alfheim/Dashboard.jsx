import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import Counter from '../../components/Counter'

const JIKAN   = 'https://api.jikan.moe/v4'
const API     = 'http://localhost:5000/api/anime'
const TOP10   = 'http://localhost:5000/api/animetop10'

const C = {
  bg:           '#060B14',
  surface:      '#0B1220',
  surfaceHover: '#101A2E',
  input:        '#080F1C',
  primary:      '#7EB8F7',
  primarySoft:  'rgba(126,184,247,0.12)',
  aurora:       '#A78BFA',
  auroraSoft:   'rgba(167,139,250,0.15)',
  green:        '#34D399',
  greenSoft:    'rgba(52,211,153,0.12)',
  gold:         '#FCD34D',
  goldSoft:     'rgba(252,211,77,0.15)',
  red:          '#F87171',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderPrimary:'rgba(126,184,247,0.2)',
  borderAurora: 'rgba(167,139,250,0.15)',
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function formatColor(format) {
  if (format === 'Movie')   return C.gold
  if (format === 'OVA')     return C.aurora
  if (format === 'Special') return C.green
  return C.primary
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Corners({ color = C.gold, size = 12, opacity = 0.4 }) {
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
          fontFamily: '"Cinzel", serif', fontSize: '16px',
          color: C.primary + '88', letterSpacing: '0.1em',
        }}>{rune}</span>
        <h2 style={{
          fontFamily: '"Cinzel", serif', fontSize: '13px', fontWeight: 600,
          letterSpacing: '0.3em', color: C.text,
          margin: 0, textTransform: 'uppercase',
        }}>{title}</h2>
        {count > 0 && (
          <span style={{
            fontSize: '11px', color: C.primary,
            fontFamily: '"Cinzel", serif',
            border: `1px solid ${C.primary}44`,
            padding: '2px 8px', background: C.primarySoft,
          }}>{count}</span>
        )}
        {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
      </div>
      <div style={{
        height: '1px', marginTop: '14px',
        background: `linear-gradient(to right, ${C.primary}55, ${C.aurora}22, transparent)`,
      }} />
    </div>
  )
}

// ── 1. STATS ROW ──────────────────────────────────────────────────────────────
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
        flex: '1 1 150px', padding: '28px 20px 22px',
        background: hovered
          ? `linear-gradient(135deg, ${C.surfaceHover}, ${C.surface})`
          : `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
        border: `1px solid ${hovered ? color + '55' : C.borderPrimary}`,
        transition: 'all 0.35s ease',
        boxShadow: hovered ? `0 0 40px ${color}22, inset 0 0 30px rgba(0,0,0,0.3)` : 'none',
        cursor: 'default', position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}
    >
      <Corners color={hovered ? color : C.primary} size={10} opacity={hovered ? 0.8 : 0.3} />
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
            textColor={C.text} fontWeight={700}
            counterStyle={{ fontFamily: '"Cinzel", serif' }}
          />
        ) : (
          <span style={{
            fontSize: '36px', fontWeight: 700, color: C.text,
            fontFamily: '"Cinzel", serif', lineHeight: 1,
          }}>{value}</span>
        )}
      </div>
      <div style={{
        fontSize: '10px', letterSpacing: '0.25em', color: C.textMuted,
        textTransform: 'uppercase', fontFamily: '"Cinzel", serif',
      }}>{label}</div>
    </div>
  )
}

function StatsRow({ anime }) {
  const rated = anime.filter(a => a.rating)
  const stats = {
    total:       anime.length,
    watching:    anime.filter(a => a.status === 'Watching').length,
    completed:   anime.filter(a => a.status === 'Completed').length,
    planToWatch: anime.filter(a => a.status === 'Plan to Watch').length,
    avgRating:   rated.length
      ? (rated.reduce((s, a) => s + a.rating, 0) / rated.length).toFixed(1)
      : '—',
  }
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '52px' }}>
      <StatCard label="Total"         value={stats.total}       color={C.primary} rune="ᚨ" />
      <StatCard label="Watching"      value={stats.watching}    color={C.primary} rune="ᚹ" />
      <StatCard label="Completed"     value={stats.completed}   color={C.green}   rune="ᚲ" />
      <StatCard label="Plan to Watch" value={stats.planToWatch} color={C.aurora}  rune="ᛈ" />
      <StatCard label="Avg Rating"    value={stats.avgRating}   color={C.gold}    rune="★" />
    </div>
  )
}

// ── 2. TRENDING (Jikan) ───────────────────────────────────────────────────────
function TrendingCard({ item, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const cover  = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url
  const format = item.type === 'Movie' ? 'Movie' : item.type === 'OVA' ? 'OVA' : item.type === 'Special' ? 'Special' : 'Series'
  const fColor = formatColor(format)
  const year   = item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null)
  const rating = item.score ? item.score.toFixed(1) : null

  return (
    <div
      onClick={() => onNavigate('Info', item.mal_id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0, width: '160px', cursor: 'pointer',
        transform: hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div style={{
        width: '160px', height: '220px', background: C.surface,
        border: `1px solid ${hovered ? fColor + '99' : C.borderPrimary}`,
        overflow: 'hidden', position: 'relative',
        boxShadow: hovered
          ? `0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px ${fColor}44`
          : '0 4px 16px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease',
      }}>
        {cover
          ? <img src={cover} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '32px', background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>✦</div>
        }
        <div style={{
          position: 'absolute', top: '8px', left: '8px', padding: '3px 8px',
          background: 'rgba(6,11,20,0.9)', border: `1px solid ${fColor}66`,
          fontSize: '9px', letterSpacing: '0.15em', color: fColor, fontFamily: '"Cinzel", serif',
        }}>{format}</div>
        {rating && parseFloat(rating) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px', padding: '3px 8px',
            background: 'rgba(6,11,20,0.9)', border: `1px solid ${C.gold}55`,
            fontSize: '10px', color: C.gold, fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>★ {rating}</div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${fColor}33, transparent 60%)`,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
        }} />
        {hovered && <Corners color={fColor} size={10} opacity={0.7} />}
      </div>
      <div style={{ marginTop: '10px', padding: '0 2px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 600,
          color: hovered ? C.text : C.textMuted,
          transition: 'color 0.25s', lineHeight: 1.35,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{item.title}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
          {year && <span style={{ fontSize: '11px', color: C.textDim }}>{year}</span>}
          {item.episodes && (
            <span style={{ fontSize: '9px', color: fColor + 'aa', fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
              {item.episodes} eps
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
      {canLeft && (
        <button onClick={() => scroll(-1)} style={{
          position: 'absolute', left: '-16px', top: '50%',
          transform: 'translateY(-60%)', zIndex: 10,
          width: '36px', height: '36px',
          background: 'rgba(6,11,20,0.92)',
          border: `1px solid ${C.borderPrimary}`,
          color: C.gold, fontSize: '16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.borderPrimary}
        >‹</button>
      )}
      <div ref={ref} onScroll={check} style={{
        display: 'flex', gap: '14px', overflowX: 'auto',
        paddingBottom: '12px', scrollbarWidth: 'none', msOverflowStyle: 'none',
      }} className="hide-scroll">
        {children}
      </div>
      {canRight && (
        <button onClick={() => scroll(1)} style={{
          position: 'absolute', right: '-16px', top: '50%',
          transform: 'translateY(-60%)', zIndex: 10,
          width: '36px', height: '36px',
          background: 'rgba(6,11,20,0.92)',
          border: `1px solid ${C.borderPrimary}`,
          color: C.gold, fontSize: '16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.borderPrimary}
        >›</button>
      )}
    </div>
  )
}

function TrendingSection({ onNavigate }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        await sleep(300)
        const res = await fetch(`${JIKAN}/top/anime?filter=airing&limit=25`)
        const data = await res.json()
        setItems(data.data || [])
      } catch { setItems([]) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Trending This Season" rune="ᚦ" />
      <div style={{ display: 'flex', gap: '14px' }}>
        {Array(6).fill(0).map((_, i) => (
          <div key={i} style={{
            flexShrink: 0, width: '160px', height: '220px',
            background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
            backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
            border: `1px solid ${C.borderPrimary}`,
          }} />
        ))}
      </div>
    </div>
  )

  if (!items.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Trending This Season" rune="ᚦ" count={items.length} />
      <HorizontalScroll>
        {items.map(item => (
          <TrendingCard key={item.mal_id} item={item} onNavigate={onNavigate} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 3. CURRENTLY WATCHING ─────────────────────────────────────────────────────
function WatchingCard({ anime, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const progress = anime.episodes?.total
    ? (anime.episodes.current / anime.episodes.total) * 100
    : null

  return (
    <div
      onClick={() => anime.malId && onNavigate('Info', anime.malId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0, width: '150px',
        cursor: anime.malId ? 'pointer' : 'default',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div style={{
        width: '150px', height: '210px', background: C.surface,
        border: `1px solid ${hovered ? C.primary + '88' : C.borderPrimary}`,
        overflow: 'hidden', position: 'relative',
        boxShadow: hovered
          ? `0 12px 40px ${C.primarySoft}, 0 0 0 1px ${C.primary}33`
          : '0 4px 16px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease',
      }}>
        {anime.coverImage
          ? <img src={anime.coverImage} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '32px', background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>✦</div>
        }
        <div style={{
          position: 'absolute', top: '8px', left: '8px', padding: '3px 8px',
          background: 'rgba(6,11,20,0.9)', border: `1px solid ${C.gold}55`,
          fontSize: '9px', letterSpacing: '0.15em', color: C.gold, fontFamily: '"Cinzel", serif',
        }}>{anime.format}</div>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${C.primary}22, transparent)`,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
        }} />
        {hovered && <Corners color={C.primary} size={10} opacity={0.7} />}
      </div>
      {progress !== null && (
        <div style={{ height: '2px', background: C.borderPrimary, marginTop: '6px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: `linear-gradient(to right, ${C.aurora}, ${C.primary})`,
            boxShadow: `0 0 6px ${C.primary}`,
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
      }}>{anime.title}</div>
      {anime.episodes?.total && (
        <div style={{ fontSize: '11px', color: C.textDim, marginTop: '3px' }}>
          Ep {anime.episodes.current} / {anime.episodes.total}
        </div>
      )}
    </div>
  )
}

function CurrentlyWatchingSection({ anime, onNavigate }) {
  const watching = anime.filter(a => a.status === 'Watching')
  if (!watching.length) return null
  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Currently Watching" rune="ᚹ" count={watching.length} />
      <HorizontalScroll>
        {watching.map(a => (
          <WatchingCard key={a._id} anime={a} onNavigate={onNavigate} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 4. TOP 10 ─────────────────────────────────────────────────────────────────
function Top10SearchModal({ position, onClose, onSaved }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      await sleep(300)
      const res  = await fetch(`${JIKAN}/anime?q=${encodeURIComponent(query)}&limit=12&sfw=false`)
      const data = await res.json()
      setResults(data.data || [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }

  const select = async (item) => {
    const format = item.type === 'Movie' ? 'Movie'
      : item.type === 'OVA' ? 'OVA'
      : item.type === 'Special' ? 'Special' : 'Series'
    try {
      await axios.put(`${TOP10}/${position}`, {
        malId:      item.mal_id,
        title:      item.title || '',
        coverImage: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
        year:       item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null),
        format,
      })
      onSaved()
    } catch (err) { console.error(err) }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(4,8,16,0.92)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}
    >
      <div style={{
        background: C.surface, border: `1px solid ${C.borderPrimary}`,
        width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto',
        position: 'relative', boxShadow: '0 0 80px rgba(0,0,0,0.8)',
      }}>
        <Corners color={C.primary} size={12} opacity={0.4} />
        <div style={{
          padding: '18px 24px 14px', borderBottom: `1px solid ${C.borderPrimary}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: C.surface, zIndex: 10,
        }}>
          <span style={{ fontFamily: '"Cinzel", serif', fontSize: '12px', letterSpacing: '0.3em', color: C.primary }}>
            SELECT FOR SLOT #{position}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px 16px', display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '12px', top: '50%',
              transform: 'translateY(-50%)',
              color: focused ? C.primary : C.textDim, fontSize: '14px',
            }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search anime title..."
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                background: C.input,
                border: `1px solid ${focused ? C.primary + '88' : C.borderPrimary}`,
                color: C.text, fontSize: '13px', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
            />
          </div>
          <button onClick={search} disabled={loading} style={{
            fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.15em',
            color: C.primary, background: C.primarySoft,
            border: `1px solid ${C.primary}55`, padding: '0 20px',
            cursor: 'pointer', opacity: loading ? 0.6 : 1,
          }}>{loading ? '...' : 'Search'}</button>
        </div>
        <div style={{
          padding: '0 24px 24px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px',
        }}>
          {results.map(item => {
            const cover = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url
            return (
              <div key={item.mal_id} onClick={() => select(item)} style={{ cursor: 'pointer' }}>
                <div style={{
                  height: '150px', background: C.bg,
                  border: `1px solid ${C.borderPrimary}`, overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.borderPrimary}
                >
                  {cover
                    ? <img src={cover} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim }}>✦</div>
                  }
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: C.textMuted, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.title}
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
  const isEmpty  = !entry.malId
  const fColor   = entry.format ? formatColor(entry.format) : C.textDim
  const rankColor = index === 0 ? '#FFD700'
    : index === 1 ? '#E8C04A'
    : index === 2 ? '#C9963A'
    : index <= 5  ? C.primary
    : C.aurora

  return (
    <div
      style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}
      onMouseEnter={() => { setHovered(true); setShowActions(true) }}
      onMouseLeave={() => { setHovered(false); setShowActions(false) }}
    >
      {/* Big rank number */}
      <div style={{
        fontFamily: '"Cinzel Decorative", "Cinzel", serif',
        fontSize: 'clamp(100px, 12vw, 150px)', fontWeight: 900, lineHeight: 1,
        color: 'transparent',
        WebkitTextStroke: `3px ${isEmpty ? rankColor + '22' : rankColor + (hovered ? 'cc' : '66')}`,
        textShadow: hovered && !isEmpty ? `0 0 60px ${rankColor}44, 0 0 120px ${rankColor}22` : 'none',
        userSelect: 'none', marginRight: '-22px', zIndex: 1,
        transition: 'all 0.3s ease', letterSpacing: '-0.05em',
      }}>{String(index + 1)}</div>

      {/* Poster */}
      <div
        onClick={() => { if (isEmpty) onEdit(); else if (entry.malId) onNavigate('Info', entry.malId) }}
        style={{
          width: '140px', height: '200px', flexShrink: 0, position: 'relative', zIndex: 2,
          background: isEmpty ? C.surface : C.bg,
          border: `1px solid ${hovered
            ? isEmpty ? C.gold + '66' : fColor + '99'
            : isEmpty ? C.borderPrimary + '88' : C.borderPrimary}`,
          overflow: 'hidden', cursor: 'pointer',
          transform: hovered ? 'translateY(-10px) scale(1.03)' : 'translateY(0) scale(1)',
          transformOrigin: 'bottom center', transition: 'all 0.3s ease',
          boxShadow: hovered && !isEmpty
            ? `0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px ${fColor}44`
            : hovered && isEmpty ? `0 8px 24px rgba(0,0,0,0.5)` : '0 4px 16px rgba(0,0,0,0.5)',
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
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', fontFamily: '"Cinzel", serif', color: C.textDim + '88', textAlign: 'center', padding: '0 12px' }}>CLICK TO ADD</div>
          </div>
        ) : (
          <>
            {entry.coverImage
              ? <img src={entry.coverImage} alt={entry.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px' }}>✦</div>
            }
            <div style={{
              position: 'absolute', top: '6px', left: '6px', padding: '2px 7px',
              background: 'rgba(6,11,20,0.9)', border: `1px solid ${fColor}55`,
              fontSize: '9px', color: fColor, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
            }}>{entry.format}</div>
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(to top, ${fColor}44, transparent 60%)`,
              opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
            }} />
          </>
        )}
        {hovered && <Corners color={isEmpty ? C.gold : fColor} size={9} opacity={0.6} />}
      </div>

      {showActions && !isEmpty && (
        <div style={{
          position: 'absolute', bottom: '-34px', left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: '6px', zIndex: 10, whiteSpace: 'nowrap',
        }}>
          <button onClick={e => { e.stopPropagation(); onEdit() }} style={{
            fontFamily: '"Cinzel", serif', fontSize: '9px', letterSpacing: '0.1em',
            color: C.primary, background: 'rgba(6,11,20,0.95)',
            border: `1px solid ${C.primary}44`, padding: '4px 10px', cursor: 'pointer',
          }}>Edit</button>
          <button onClick={e => { e.stopPropagation(); onClear() }} style={{
            fontFamily: '"Cinzel", serif', fontSize: '9px', letterSpacing: '0.1em',
            color: C.red, background: 'rgba(6,11,20,0.95)',
            border: '1px solid rgba(248,113,113,0.3)', padding: '4px 10px', cursor: 'pointer',
          }}>Clear</button>
        </div>
      )}
    </div>
  )
}

function Top10Section({ onNavigate }) {
  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalSlot, setModalSlot] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res   = await axios.get(TOP10)
      const slots = Array.from({ length: 10 }, (_, i) => {
        const found = res.data.entries?.find(e => e.position === i + 1)
        return found || { position: i + 1, malId: null, title: '', coverImage: '', year: null, format: '' }
      })
      setEntries(slots)
    } catch {
      setEntries(Array.from({ length: 10 }, (_, i) => ({ position: i + 1, malId: null, title: '', coverImage: '', year: null, format: '' })))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const clearSlot = async (pos) => {
    try {
      await axios.delete(`${TOP10}/${pos}`)
      load()
    } catch (err) { console.error(err) }
  }

  return (
    <div style={{ marginBottom: '72px' }}>
      <SectionHeader title="Top 10 Anime" rune="ᛏ" />
      {loading ? (
        <div style={{ display: 'flex', gap: '4px' }}>
          {Array(10).fill(0).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '60px', height: '90px', background: C.surface, opacity: 0.3 }} />
              <div style={{ width: '140px', height: '200px', background: C.surface, border: `1px solid ${C.borderPrimary}` }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: '44px', paddingTop: '16px' }} className="hide-scroll">
          <div style={{ display: 'flex', gap: '4px', minWidth: 'max-content' }}>
            {entries.map((entry, i) => (
              <Top10Card
                key={entry.position} entry={entry} index={i}
                onEdit={() => setModalSlot(entry.position)}
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
          onClose={() => setModalSlot(null)}
          onSaved={() => { setModalSlot(null); load() }}
        />
      )}
    </div>
  )
}

// ── 5. RECENTLY RELEASED (Jikan) ──────────────────────────────────────────────
function RecentlyReleasedSection({ onNavigate }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        await sleep(600)
        const res  = await fetch(`${JIKAN}/seasons/now?limit=25`)
        const data = await res.json()
        setItems(data.data || [])
      } catch { setItems([]) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="This Season" rune="ᚾ" />
      <div style={{ display: 'flex', gap: '14px' }}>
        {Array(5).fill(0).map((_, i) => (
          <div key={i} style={{
            flexShrink: 0, width: '160px', height: '220px',
            background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
            backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
            border: `1px solid ${C.borderPrimary}`,
          }} />
        ))}
      </div>
    </div>
  )

  if (!items.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="This Season" rune="ᚾ" count={items.length} />
      <HorizontalScroll>
        {items.map(item => (
          <TrendingCard key={item.mal_id} item={item} onNavigate={onNavigate} />
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ── 6. EXPLORE NEW ───────────────────────────────────────────────────────────
function ExploreSection({ onNavigate }) {
  const [pool, setPool]         = useState([])
  const [shown, setShown]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [spinning, setSpinning] = useState(false)
  const shownIds = useRef(new Set())

  useEffect(() => {
    const load = async () => {
      try {
        await sleep(900)
        const pages = await Promise.allSettled([
          fetch(`${JIKAN}/top/anime?filter=bypopularity&limit=25`).then(r => r.json()),
          fetch(`${JIKAN}/top/anime?filter=favorite&limit=25`).then(r => r.json()),
        ])
        const seen = new Set()
        const all = pages
          .filter(p => p.status === 'fulfilled')
          .flatMap(p => p.value.data || [])
          .filter(item => {
            if (seen.has(item.mal_id)) return false
            seen.add(item.mal_id)
            return item.images?.jpg?.image_url
          })
        setPool(all)
        const initial = pick6(all, new Set())
        shownIds.current = new Set(initial.map(i => i.mal_id))
        setShown(initial)
      } catch { }
      finally { setLoading(false) }
    }
    load()
  }, [])

  function pick6(arr, excludeIds) {
    const available = arr.filter(i => !excludeIds.has(i.mal_id))
    const source = available.length >= 6 ? available : arr
    return [...source].sort(() => Math.random() - 0.5).slice(0, 6)
  }

  const refresh = () => {
    setSpinning(true)
    const next = pick6(pool, shownIds.current)
    shownIds.current = new Set(next.map(i => i.mal_id))
    setShown(next)
    setTimeout(() => setSpinning(false), 400)
  }

  const RefreshButton = (
    <button onClick={refresh} style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      fontFamily: '"Cinzel", serif', fontSize: '10px', letterSpacing: '0.2em',
      color: C.primary, background: 'transparent',
      border: `1px solid ${C.primary}44`, padding: '6px 14px',
      cursor: 'pointer', transition: 'all 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = C.primarySoft}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{
        display: 'inline-block',
        transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
        transition: 'transform 0.4s ease', fontSize: '13px',
      }}>↻</span>
      Refresh
    </button>
  )

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Explore" rune="ᚱ" right={RefreshButton} />
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} style={{
              height: '220px',
              background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
              backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
              border: `1px solid ${C.borderPrimary}`,
            }} />
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px',
          opacity: spinning ? 0.4 : 1, transition: 'opacity 0.2s',
        }}>
          {shown.map(item => (
            <TrendingCard key={item.mal_id} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 7. RECENTLY ADDED ─────────────────────────────────────────────────────────
function RecentlyAddedCard({ anime, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const sc = {
    'Watching': C.primary, 'Completed': C.green,
    'Dropped': C.red, 'Plan to Watch': C.aurora, 'On Hold': C.gold,
  }[anime.status] || C.textMuted

  return (
    <div
      onClick={() => anime.malId && onNavigate('Info', anime.malId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '14px 20px',
        background: hovered ? `linear-gradient(90deg, ${C.surfaceHover}, ${C.surface})` : 'transparent',
        border: `1px solid ${hovered ? C.borderAurora : 'transparent'}`,
        borderLeft: `2px solid ${hovered ? sc : C.textDim + '33'}`,
        cursor: anime.malId ? 'pointer' : 'default',
        transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden',
      }}
    >
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(90deg, ${sc}08, transparent)`,
        }} />
      )}
      <div style={{
        width: '42px', height: '60px', flexShrink: 0, background: C.surface,
        border: `1px solid ${hovered ? C.borderAurora : C.borderPrimary}`,
        overflow: 'hidden', transition: 'border-color 0.25s',
      }}>
        {anime.coverImage
          ? <img src={anime.coverImage} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '16px' }}>✦</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 600,
          color: hovered ? C.text : '#9BAEC8',
          transition: 'color 0.25s', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{anime.title}</div>
        <div style={{
          fontSize: '11px', color: C.textDim, marginTop: '4px',
          display: 'flex', gap: '10px', letterSpacing: '0.05em',
        }}>
          <span style={{ color: C.primary + 'aa', fontFamily: '"Cinzel", serif' }}>{anime.format}</span>
          {anime.year && <span>{anime.year}</span>}
          {anime.genres?.[0] && <span>{anime.genres[0]}</span>}
        </div>
      </div>
      <div style={{
        fontSize: '10px', letterSpacing: '0.1em', color: sc,
        padding: '4px 10px', border: `1px solid ${sc}44`,
        background: `${sc}0f`, whiteSpace: 'nowrap', fontFamily: '"Cinzel", serif',
      }}>{anime.status}</div>
      {anime.rating && (
        <div style={{
          fontSize: '14px', fontWeight: 700, color: C.gold,
          minWidth: '36px', textAlign: 'right',
          textShadow: `0 0 10px ${C.gold}`, fontFamily: '"Cinzel", serif',
        }}>
          {anime.rating}<span style={{ fontSize: '9px', color: C.textDim, fontWeight: 400 }}>/10</span>
        </div>
      )}
    </div>
  )
}

function RecentlyAddedSection({ onNavigate }) {
  const [anime, setAnime]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(API)
      .then(r => setAnime(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const recent = [...anime]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)

  if (!recent.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Recently Added to My List" rune="ᛊ" count={recent.length} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {recent.map(a => (
          <RecentlyAddedCard key={a._id} anime={a} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  )
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const [anime, setAnime]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(API)
      .then(r => setAnime(r.data))
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

      <StatsRow anime={anime} />
      <TrendingSection onNavigate={onNavigate} />
      {!loading && <CurrentlyWatchingSection anime={anime} onNavigate={onNavigate} />}
      <Top10Section onNavigate={onNavigate} />
      <RecentlyReleasedSection onNavigate={onNavigate} />
      <ExploreSection onNavigate={onNavigate} />
      <RecentlyAddedSection onNavigate={onNavigate} />
    </div>
  )
}