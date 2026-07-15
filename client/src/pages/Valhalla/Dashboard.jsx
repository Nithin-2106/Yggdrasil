import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import Counter from '../../components/Counter'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  fetchTrending,
  fetchRecentlyReleased,
  fetchBySort,
  searchManga,
  detectMangaType,
  detectMangaFormat,
  getTitle,
  getYear,
  getCover,
  formatScore,
} from '../../utils/anilistSearch'

const API    = '/api/media/manga'
const TOP10  = '/api/mangatop10'

const C = {
  bg:           '#0A0810',
  surface:      '#120F1E',
  surfaceHover: '#17132A',
  input:        '#0D0A18',
  primary:      '#A78BFA',
  primarySoft:  'rgba(167,139,250,0.12)',
  crimson:      '#F43F5E',
  crimsonSoft:  'rgba(244,63,94,0.15)',
  gold:         '#FCD34D',
  goldSoft:     'rgba(252,211,77,0.15)',
  green:        '#34D399',
  greenSoft:    'rgba(52,211,153,0.12)',
  silver:       '#94A3B8',
  red:          '#F87171',
  text:         '#EDE9FE',
  textMuted:    '#A89BC2',
  textDim:      '#4A3F6B',
  borderPrimary:'rgba(167,139,250,0.2)',
  borderCrimson:'rgba(244,63,94,0.18)',
}

const TYPE_COLOR = {
  'Manhwa': C.primary,
  'Manga':  C.gold,
  'Manhua': C.crimson,
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Corners({ color = C.gold, size = 12, opacity = 0.4 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 8,    left: 8,   borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 8,    right: 8,  borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 8, left: 8,   borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 8, right: 8,  borderBottom: b, borderRight: b }} />
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
        background: `linear-gradient(to right, ${C.primary}55, ${C.crimson}22, transparent)`,
      }} />
    </div>
  )
}

// ── Horizontal scroll row ─────────────────────────────────────────────────────
function HorizontalScroll({ children }) {
  const ref = useRef(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(false)

  const check = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }, [])

  // Check after children mount / resize
  useEffect(() => {
    const el = ref.current
    if (!el) return
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [check])

  const scroll = (dir) => {
    ref.current?.scrollBy({ left: dir * 520, behavior: 'smooth' })
  }

  const arrowStyle = {
    position: 'absolute', top: '50%', transform: 'translateY(-60%)', zIndex: 10,
    width: '36px', height: '36px',
    background: 'rgba(10,8,16,0.92)',
    border: `1px solid ${C.borderPrimary}`,
    color: C.gold, fontSize: '16px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ position: 'relative' }}>
      {canLeft && (
        <button
          onClick={() => scroll(-1)}
          style={{ ...arrowStyle, left: '-16px' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.borderPrimary}
        >‹</button>
      )}
      <div
        ref={ref}
        onScroll={check}
        className="hide-scroll"
        style={{
          display: 'flex', gap: '14px', overflowX: 'auto',
          paddingBottom: '12px', paddingTop: '12px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>
      {canRight && (
        <button
          onClick={() => scroll(1)}
          style={{ ...arrowStyle, right: '-16px' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.borderPrimary}
        >›</button>
      )}
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
        border: `1px solid ${hovered ? color + 'cc' : C.borderPrimary}`,
        transition: 'border-color 0.35s ease, box-shadow 0.35s ease, background 0.35s ease',
        boxShadow: hovered
          ? `0 0 40px ${color}55, 0 0 120px ${color}22, inset 0 0 30px rgba(0,0,0,0.3)`
          : 'none',
        cursor: 'default', position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}
    >
      <Corners color={hovered ? color : C.primary} size={10} opacity={hovered ? 0.8 : 0.3} />
      <div style={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px',
        background: `linear-gradient(to right, transparent, ${color}, transparent)`,
        opacity: hovered ? 1 : 0.25, transition: 'opacity 0.35s',
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
            textColor={hovered ? color : C.text} fontWeight={700}
            counterStyle={{ fontFamily: '"Cinzel", serif', transition: 'color 0.35s' }}
          />
        ) : (
          <span style={{
            fontSize: '36px', fontWeight: 700,
            color: hovered ? color : C.text,
            fontFamily: '"Cinzel", serif', lineHeight: 1, transition: 'color 0.35s',
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

function StatsRow({ manga }) {
  const rated = manga.filter(m => m.rating)
  const avgRating = rated.length
    ? (rated.reduce((s, m) => s + m.rating, 0) / rated.length).toFixed(1)
    : '—'

  const stats = [
    { label: 'Total',        value: manga.length,                                   color: C.primary, rune: '⚔' },
    { label: 'Reading',      value: manga.filter(m => m.status === 'Reading').length, color: C.primary, rune: 'ᚹ' },
    { label: 'Completed',    value: manga.filter(m => m.status === 'Completed').length, color: C.green,   rune: 'ᚲ' },
    { label: 'Plan to Read', value: manga.filter(m => m.status === 'Plan to Read').length, color: C.crimson, rune: 'ᛈ' },
    { label: 'Avg Rating',   value: avgRating,                                       color: C.gold,    rune: '★' },
  ]

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '52px' }}>
      {stats.map(s => <StatCard key={s.label} {...s} />)}
    </div>
  )
}

// ── 2. SHARED MANGA CARD ──────────────────────────────────────────────────────
function MangaCard({ item, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const type   = detectMangaType(item)
  const tColor = TYPE_COLOR[type] || C.primary
  const cover  = getCover(item)
  const year   = getYear(item)
  const score  = formatScore(item.averageScore)
  const title  = getTitle(item)

  return (
    <div
      onClick={() => onNavigate('Info', item.id)}
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
        border: `1px solid ${hovered ? tColor + '99' : C.borderPrimary}`,
        overflow: 'hidden', position: 'relative',
        boxShadow: hovered
          ? `0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px ${tColor}44`
          : '0 4px 16px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease',
      }}>
        {cover
          ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.textDim, fontSize: '32px',
              background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
            }}>⚔</div>
          )
        }
        {/* Type badge */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px', padding: '3px 8px',
          background: 'rgba(10,8,16,0.9)', border: `1px solid ${tColor}66`,
          fontSize: '9px', letterSpacing: '0.15em', color: tColor, fontFamily: '"Cinzel", serif',
        }}>{type}</div>
        {/* Score badge */}
        {score && parseFloat(score) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px', padding: '3px 8px',
            background: 'rgba(10,8,16,0.9)', border: `1px solid ${C.gold}55`,
            fontSize: '10px', color: C.gold, fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>★ {score}</div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${tColor}33, transparent 60%)`,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
        }} />
        {hovered && <Corners color={tColor} size={10} opacity={0.7} />}
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
            <span style={{
              fontSize: '9px', color: tColor + 'aa',
              fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
            }}>{item.chapters} ch</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 3. TRENDING ───────────────────────────────────────────────────────────────
function TrendingSection({ onNavigate }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrending(25)
      .then(data => setItems(data.filter(item => ['KR', 'CN'].includes(item.countryOfOrigin))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Trending Now" rune="ᚦ" />
      <div style={{ display: 'flex', gap: '14px' }}>
        {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  if (!items.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Trending Now" rune="ᚦ" count={items.length} />
      <HorizontalScroll>
        {items.map(item => <MangaCard key={item.id} item={item} onNavigate={onNavigate} />)}
      </HorizontalScroll>
    </div>
  )
}

// ── 4. CURRENTLY READING ──────────────────────────────────────────────────────
function ReadingCard({ manga, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const type    = manga.type || 'Manga'
  const tColor  = TYPE_COLOR[type] || C.primary
  const progress = manga.chapters?.total
    ? (manga.chapters.current / manga.chapters.total) * 100
    : null

  return (
    <div
      onClick={() => manga.anilistId && onNavigate('Info', manga.anilistId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0, width: '150px',
        cursor: manga.anilistId ? 'pointer' : 'default',
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
        {manga.coverImage
          ? <img src={manga.coverImage} alt={manga.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.textDim, fontSize: '32px',
              background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
            }}>⚔</div>
          )
        }
        <div style={{
          position: 'absolute', top: '8px', left: '8px', padding: '3px 8px',
          background: 'rgba(10,8,16,0.9)', border: `1px solid ${tColor}55`,
          fontSize: '9px', letterSpacing: '0.15em', color: tColor, fontFamily: '"Cinzel", serif',
        }}>{type}</div>
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
            background: `linear-gradient(to right, ${C.crimson}, ${C.primary})`,
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
      }}>{manga.title}</div>
      {manga.chapters?.total > 0 && (
        <div style={{ fontSize: '11px', color: C.textDim, marginTop: '3px' }}>
          Ch {manga.chapters.current} / {manga.chapters.total}
        </div>
      )}
    </div>
  )
}

function CurrentlyReadingSection({ manga, onNavigate }) {
  const reading = manga.filter(m => m.status === 'Reading')
  if (!reading.length) return null
  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Currently Reading" rune="ᚹ" count={reading.length} />
      <HorizontalScroll>
        {reading.map(m => <ReadingCard key={m._id} manga={m} onNavigate={onNavigate} />)}
      </HorizontalScroll>
    </div>
  )
}

// ── 5. TOP 10 ─────────────────────────────────────────────────────────────────
function Top10SearchModal({ position, onClose, onSaved }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await searchManga(query)
      setResults(res.slice(0, 12))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') search()
  }

  const select = async (item) => {
    try {
      await axios.put(`${TOP10}/${position}`, {
        anilistId:  item.id,
        title:      getTitle(item),
        coverImage: getCover(item),
        year:       getYear(item),
        type:       detectMangaType(item),
        format:     detectMangaFormat(item),
      })
      onSaved()
    } catch (err) {
      console.error('Top10 select error:', err)
    }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(8,6,14,0.92)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}
    >
      <div style={{
        background: C.surface, border: `1px solid ${C.borderPrimary}`,
        width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto',
        position: 'relative', boxShadow: '0 0 80px rgba(0,0,0,0.8)',
      }}>
        <Corners color={C.primary} size={12} opacity={0.4} />

        {/* Header */}
        <div style={{
          padding: '18px 24px 14px', borderBottom: `1px solid ${C.borderPrimary}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: C.surface, zIndex: 10,
        }}>
          <span style={{
            fontFamily: '"Cinzel", serif', fontSize: '12px',
            letterSpacing: '0.3em', color: C.primary,
          }}>SELECT FOR SLOT #{position}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.textDim, fontSize: '20px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.textDim}
          >×</button>
        </div>

        {/* Search row */}
        <div style={{ padding: '20px 24px 16px', display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '12px', top: '50%',
              transform: 'translateY(-50%)',
              color: focused ? C.primary : C.textDim, fontSize: '14px', pointerEvents: 'none',
            }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search manga / manhwa / manhua..."
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                background: C.input,
                border: `1px solid ${focused ? C.primary + '88' : C.borderPrimary}`,
                color: C.text, fontSize: '13px', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
            />
          </div>
          <button
            onClick={search}
            disabled={loading}
            style={{
              fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.15em',
              color: C.primary, background: C.primarySoft,
              border: `1px solid ${C.primary}55`, padding: '0 20px',
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >{loading ? '...' : 'Search'}</button>
        </div>

        {/* Results grid */}
        <div style={{
          padding: '0 24px 24px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px',
        }}>
          {results.map(item => {
            const tColor = TYPE_COLOR[detectMangaType(item)] || C.primary
            return (
              <div
                key={item.id}
                onClick={() => select(item)}
                style={{ cursor: 'pointer' }}
              >
                <div
                  style={{
                    height: '150px', background: C.bg,
                    border: `1px solid ${C.borderPrimary}`, overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = tColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.borderPrimary}
                >
                  {getCover(item)
                    ? <img src={getCover(item)} alt={getTitle(item)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim }}>⚔</div>
                  }
                </div>
                <div style={{
                  marginTop: '6px', fontSize: '11px', color: C.textMuted, lineHeight: 1.3,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>{getTitle(item)}</div>
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

  const isEmpty   = !entry.anilistId
  const tColor    = entry.type ? (TYPE_COLOR[entry.type] || C.primary) : C.textDim
  const rankColor = index === 0 ? '#FFD700'
    : index === 1 ? '#E8C04A'
    : index === 2 ? '#C9963A'
    : index <= 5  ? C.primary
    : C.crimson

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

      {/* Card */}
      <div
        onClick={() => { if (isEmpty) onEdit(); else if (entry.anilistId) onNavigate('Info', entry.anilistId) }}
        style={{
          width: '140px', height: '200px', flexShrink: 0, position: 'relative', zIndex: 2,
          background: isEmpty ? C.surface : C.bg,
          border: `1px solid ${hovered
            ? isEmpty ? C.gold + '66' : tColor + '99'
            : isEmpty ? C.borderPrimary + '88' : C.borderPrimary}`,
          overflow: 'hidden', cursor: 'pointer',
          transform: hovered ? 'translateY(-10px) scale(1.03)' : 'translateY(0) scale(1)',
          transformOrigin: 'bottom center', transition: 'all 0.3s ease',
          boxShadow: hovered && !isEmpty
            ? `0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px ${tColor}44`
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
            <div style={{
              fontSize: '9px', letterSpacing: '0.2em', fontFamily: '"Cinzel", serif',
              color: C.textDim + '88', textAlign: 'center', padding: '0 12px',
            }}>CLICK TO ADD</div>
          </div>
        ) : (
          <>
            {entry.coverImage
              ? <img src={entry.coverImage} alt={entry.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px' }}>⚔</div>
            }
            <div style={{
              position: 'absolute', top: '6px', left: '6px', padding: '2px 7px',
              background: 'rgba(10,8,16,0.9)', border: `1px solid ${tColor}55`,
              fontSize: '9px', color: tColor, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
            }}>{entry.type}</div>
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(to top, ${tColor}44, transparent 60%)`,
              opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
            }} />
          </>
        )}
        {hovered && <Corners color={isEmpty ? C.gold : tColor} size={9} opacity={0.6} />}
      </div>

      {/* Edit / Clear actions */}
      {showActions && !isEmpty && (
        <div style={{
          position: 'absolute', bottom: '-34px', left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: '6px', zIndex: 10, whiteSpace: 'nowrap',
        }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            style={{
              fontFamily: '"Cinzel", serif', fontSize: '9px', letterSpacing: '0.1em',
              color: C.primary, background: 'rgba(10,8,16,0.95)',
              border: `1px solid ${C.primary}44`, padding: '4px 10px', cursor: 'pointer',
            }}
          >Edit</button>
          <button
            onClick={e => { e.stopPropagation(); onClear() }}
            style={{
              fontFamily: '"Cinzel", serif', fontSize: '9px', letterSpacing: '0.1em',
              color: C.red, background: 'rgba(10,8,16,0.95)',
              border: '1px solid rgba(248,113,113,0.3)', padding: '4px 10px', cursor: 'pointer',
            }}
          >Clear</button>
        </div>
      )}
    </div>
  )
}

function Top10Section({ onNavigate }) {
  const [entries,   setEntries]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modalSlot, setModalSlot] = useState(null)
  const { user } = useAuth()
  const navigate  = useNavigate()

  const EMPTY_SLOT = (i) => ({
    position: i + 1, anilistId: null, title: '', coverImage: '', year: null, type: '', format: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res   = await axios.get(`${TOP10}/list`)
      const slots = Array.from({ length: 10 }, (_, i) => {
        const found = res.data.entries?.find(e => e.position === i + 1)
        return found || EMPTY_SLOT(i)
      })
      setEntries(slots)
    } catch {
      setEntries(Array.from({ length: 10 }, (_, i) => EMPTY_SLOT(i)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const guardAuth = (fn) => {
    if (!user) { navigate('/profile'); return }
    fn()
  }

  const clearSlot = async (pos) => {
    guardAuth(async () => {
      try {
        await axios.delete(`${TOP10}/${pos}`)
        load()
      } catch (err) {
        console.error('Clear slot error:', err)
      }
    })
  }

  return (
    <div style={{ marginBottom: '72px' }}>
      <SectionHeader title="Top 10" rune="ᛏ" />
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
        <div
          className="hide-scroll"
          style={{ overflowX: 'auto', paddingBottom: '44px', paddingTop: '16px' }}
        >
          <div style={{ display: 'flex', gap: '4px', minWidth: 'max-content' }}>
            {entries.map((entry, i) => (
              <Top10Card
                key={entry.position}
                entry={entry}
                index={i}
                onEdit={() => guardAuth(() => setModalSlot(entry.position))}
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

// ── 6. RECENTLY RELEASED ──────────────────────────────────────────────────────
function RecentlyReleasedSection({ onNavigate }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecentlyReleased(50)
        .then(data => setItems(data.filter(item => ['KR', 'CN'].includes(item.countryOfOrigin))))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  if (loading) return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Recently Released" rune="ᚾ" />
      <div style={{ display: 'flex', gap: '14px' }}>
        {Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  if (!items.length) return null

  return (
    <div style={{ marginBottom: '52px' }}>
      <SectionHeader title="Recently Released" rune="ᚾ" count={items.length} />
      <HorizontalScroll>
        {items.map(item => <MangaCard key={item.id} item={item} onNavigate={onNavigate} />)}
      </HorizontalScroll>
    </div>
  )
}

// ── 7. EXPLORE ────────────────────────────────────────────────────────────────
function ExploreSection({ onNavigate }) {
  const [pool,     setPool]     = useState([])
  const [shown,    setShown]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [spinning, setSpinning] = useState(false)
  const shownIds = useRef(new Set())

  function pick6(arr, excludeIds) {
    const available = arr.filter(i => !excludeIds.has(i.id))
    const source    = available.length >= 6 ? available : arr
    return [...source].sort(() => Math.random() - 0.5).slice(0, 6)
  }

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      // Rotate through several sort modes at random pages instead of always
      // POPULARITY_DESC page 1, so the pool actually varies between loads.
      const sorts = ['POPULARITY_DESC', 'SCORE_DESC', 'TRENDING_DESC', 'FAVOURITES_DESC']
      const fetches = sorts.map(sort => {
        const randomPage = Math.floor(Math.random() * 5) + 1
        return fetchBySort(sort, randomPage, 40).catch(() => [])
      })
      const results = await Promise.all(fetches)
      if (cancelled) return
      const seen = new Set()
      const valid = results.flat().filter(item => {
        if (!getCover(item)) return false
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })
      setPool(valid)
      const initial = pick6(valid, new Set())
      shownIds.current = new Set(initial.map(i => i.id))
      setShown(initial)
      setLoading(false)
    }, 1200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  const refresh = () => {
    if (!pool.length) return
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
        display: 'flex', alignItems: 'center', gap: '6px',
        fontFamily: '"Cinzel", serif', fontSize: '10px', letterSpacing: '0.2em',
        color: C.primary, background: 'transparent',
        border: `1px solid ${C.primary}44`, padding: '6px 14px',
        cursor: 'pointer', transition: 'background 0.2s',
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
          {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px',
          opacity: spinning ? 0.4 : 1, transition: 'opacity 0.2s',
        }}>
          {shown.map(item => <MangaCard key={item.id} item={item} onNavigate={onNavigate} />)}
        </div>
      )}
    </div>
  )
}

// ── 8. RECENTLY ADDED ─────────────────────────────────────────────────────────
function RecentlyAddedCard({ manga, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const type   = manga.type || 'Manga'
  const tColor = TYPE_COLOR[type] || C.primary
  const sc = {
    'Reading':      C.primary,
    'Completed':    C.green,
    'Dropped':      C.red,
    'Plan to Read': C.crimson,
    'On Hold':      C.gold,
  }[manga.status] || C.textMuted

  return (
    <div
      onClick={() => manga.anilistId && onNavigate('Info', manga.anilistId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '14px 20px',
        background: hovered ? `linear-gradient(90deg, ${C.surfaceHover}, ${C.surface})` : 'transparent',
        border: `1px solid ${hovered ? C.borderCrimson : 'transparent'}`,
        borderLeft: `2px solid ${hovered ? sc : C.textDim + '33'}`,
        cursor: manga.anilistId ? 'pointer' : 'default',
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
        border: `1px solid ${hovered ? C.borderCrimson : C.borderPrimary}`,
        overflow: 'hidden', transition: 'border-color 0.25s',
      }}>
        {manga.coverImage
          ? <img src={manga.coverImage} alt={manga.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '16px' }}>⚔</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 600,
          color: hovered ? C.text : '#A89BC2',
          transition: 'color 0.25s', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{manga.title}</div>
        <div style={{
          fontSize: '11px', color: C.textDim, marginTop: '4px',
          display: 'flex', gap: '10px', letterSpacing: '0.05em',
        }}>
          <span style={{ color: tColor + 'aa', fontFamily: '"Cinzel", serif' }}>{type}</span>
          {manga.year && <span>{manga.year}</span>}
          {manga.genres?.[0] && <span>{manga.genres[0]}</span>}
        </div>
      </div>
      <div style={{
        fontSize: '10px', letterSpacing: '0.1em', color: sc,
        padding: '4px 10px', border: `1px solid ${sc}44`,
        background: `${sc}0f`, whiteSpace: 'nowrap', fontFamily: '"Cinzel", serif',
      }}>{manga.status}</div>
      {manga.rating && (
        <div style={{
          fontSize: '14px', fontWeight: 700, color: C.gold,
          minWidth: '36px', textAlign: 'right',
          textShadow: `0 0 10px ${C.gold}`, fontFamily: '"Cinzel", serif',
        }}>
          {manga.rating}<span style={{ fontSize: '9px', color: C.textDim, fontWeight: 400 }}>/10</span>
        </div>
      )}
    </div>
  )
}

// ── Skeleton card (shared) ────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ flexShrink: 0, width: '160px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{
        width: '160px', height: '220px',
        background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
        backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
        border: `1px solid ${C.borderPrimary}`,
      }} />
      <div style={{ height: '12px', width: '80%', background: C.surface, borderRadius: '2px' }} />
      <div style={{ height: '10px', width: '50%', background: C.surface, borderRadius: '2px' }} />
    </div>
  )
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const [manga,   setManga]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(API)
      .then(r => setManga(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])
  throw new Error("Testing Sentry");

  // Slice recent 10 from already-fetched manga — no second API call needed
  const recentManga = [...manga]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)

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

      {/* Stats always render (shows zeros while loading) */}
      <StatsRow manga={manga} />

      <TrendingSection onNavigate={onNavigate} />

      {!loading && <CurrentlyReadingSection manga={manga} onNavigate={onNavigate} />}

      <Top10Section onNavigate={onNavigate} />

      <RecentlyReleasedSection onNavigate={onNavigate} />

      <ExploreSection onNavigate={onNavigate} />

      {/* Recently Added — uses manga already fetched above, no extra API call */}
      {!loading && recentManga.length > 0 && (
        <div style={{ marginBottom: '52px' }}>
          <SectionHeader title="Recently Added to My List" rune="ᛊ" count={recentManga.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {recentManga.map(m => (
              <RecentlyAddedCard key={m._id} manga={m} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}