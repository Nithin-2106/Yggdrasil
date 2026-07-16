import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useIsCompact } from '../../hooks/useMediaQuery'
import ProfileIcon from '../../components/ProfileIcon'
import Counter from '../../components/Counter'

const API = { anime: '/api/media/anime', manga: '/api/media/manga', drama: '/api/media/drama' }

// Rough, clearly-labeled watch/read-time estimates — not exact.
const AVG_MINUTES = { anime: 24, manga: 5, drama: 65 }

const C = {
  bg:           '#050C14',
  surface:      '#0D1420',
  surfaceHover: '#121B2C',
  input:        '#0A121F',
  gold:         '#C9A84C',
  goldSoft:     'rgba(201,168,76,0.13)',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  border:       'rgba(201,168,76,0.2)',
  green:        '#22C55E',
}

const REALMS = [
  { key: 'all',   type: null,    label: 'All Realms', rune: 'ᛟ', color: C.gold },
  { key: 'anime', type: 'anime', label: 'Alfheim',     rune: 'ᚨ', color: '#5EEAD4' },
  { key: 'manga', type: 'manga', label: 'Valhalla',    rune: 'ᚹ', color: '#A78BFA' },
  { key: 'drama', type: 'drama', label: 'Midgard',     rune: 'ᛗ', color: '#38BDF8' },
]

// ── Shared ornament ───────────────────────────────────────────────────────────
function Corners({ color = C.gold, size = 12, opacity = 0.4 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 8, left: 8,     borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 8, right: 8,    borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 8, left: 8,  borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 8, right: 8, borderBottom: b, borderRight: b }} />
    </>
  )
}

function SectionHeader({ title, rune, right }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '16px', color: C.gold + '88' }}>{rune}</span>
        <h2 style={{
          fontFamily: '"Cinzel", serif', fontSize: '13px', fontWeight: 600,
          letterSpacing: '0.3em', color: C.text, margin: 0, textTransform: 'uppercase',
        }}>{title}</h2>
        {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
      </div>
      <div style={{
        height: '1px', marginTop: '14px',
        background: `linear-gradient(to right, ${C.gold}55, transparent)`,
      }} />
    </div>
  )
}

function SkeletonBlock({ h = '80px', style = {} }) {
  return (
    <div style={{
      height: h,
      background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
      border: `1px solid ${C.border}`, ...style,
    }} />
  )
}

// ── Realm filter tabs ─────────────────────────────────────────────────────────
function RealmTab({ realm, active, onClick, isCompact }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? realm.color : hovered ? C.text : C.textMuted,
        background: active ? `${realm.color}18` : 'transparent',
        border: `1px solid ${active ? realm.color + '66' : C.border}`,
        padding: isCompact ? '11px 16px' : '9px 18px',
        minHeight: isCompact ? '44px' : 'auto',
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: '13px', opacity: 0.8 }}>{realm.rune}</span>
      {realm.label}
    </button>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, rune, suffix }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 150px', padding: '26px 20px 20px',
        background: hovered
          ? `linear-gradient(135deg, ${C.surfaceHover}, ${C.surface})`
          : `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
        border: `1px solid ${hovered ? color + 'cc' : C.border}`,
        boxShadow: hovered ? `0 0 40px ${color}33` : 'none',
        transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}
    >
      <Corners color={hovered ? color : C.gold} size={9} opacity={hovered ? 0.8 : 0.3} />
      <div style={{
        fontFamily: '"Cinzel", serif', fontSize: '13px', color: hovered ? color : C.textDim,
        marginBottom: '10px', transition: 'color 0.3s',
      }}>{rune}</div>
      <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '4px' }}>
        <Counter
          value={value} fontSize={32} padding={4} gap={1}
          horizontalPadding={0} borderRadius={0} gradientHeight={0}
          textColor={hovered ? color : C.text} fontWeight={700}
          counterStyle={{ fontFamily: '"Cinzel", serif' }}
        />
        {suffix && <span style={{ fontSize: '13px', color: C.textDim }}>{suffix}</span>}
      </div>
      <div style={{
        fontSize: '10px', letterSpacing: '0.22em', color: C.textMuted,
        textTransform: 'uppercase', fontFamily: '"Cinzel", serif',
      }}>{label}</div>
    </div>
  )
}

// ── Genre breakdown (hand-rolled horizontal bars) ─────────────────────────────
function GenreBreakdown({ genreCounts, accent }) {
  const top = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const max = top.length ? top[0][1] : 1

  if (!top.length) {
    return <div style={{ color: C.textDim, fontSize: '13px', fontFamily: '"Cinzel", serif', padding: '24px 0' }}>No genre data yet.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {top.map(([genre, count]) => (
        <div key={genre} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '110px', flexShrink: 0, fontSize: '12px', color: C.textMuted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{genre}</div>
          <div style={{ flex: 1, height: '16px', background: C.input, position: 'relative' }}>
            <div style={{
              height: '100%', width: `${(count / max) * 100}%`,
              background: `linear-gradient(to right, ${accent}66, ${accent})`,
              boxShadow: `0 0 10px ${accent}55`,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{
            width: '28px', flexShrink: 0, textAlign: 'right', fontSize: '12px',
            color: accent, fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>{count}</div>
        </div>
      ))}
    </div>
  )
}

// ── Activity heatmap ──────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function buildHeatmapWeeks(countsByDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today.getTime() - 370 * DAY_MS)
  start.setDate(start.getDate() - start.getDay()) // snap back to Sunday

  const weeks = []
  const cur = new Date(start)
  while (cur <= today) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().split('T')[0]
      week.push({
        date: new Date(cur),
        dateStr,
        count: countsByDate[dateStr] || 0,
        future: cur > today,
      })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function levelFor(count) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

function ActivityHeatmap({ countsByDate, accent }) {
  const weeks = useMemo(() => buildHeatmapWeeks(countsByDate), [countsByDate])
  const [tooltip, setTooltip] = useState(null)

  const levelColor = (level) => {
    if (level === 0) return 'transparent'
    const opacity = [0, 0.28, 0.5, 0.75, 1][level]
    return accent + Math.round(opacity * 255).toString(16).padStart(2, '0')
  }

  let lastMonth = null
  const monthLabels = weeks.map((week) => {
    const firstOfMonth = week.find(d => d.date.getDate() <= 7)
    if (!firstOfMonth) return null
    const m = firstOfMonth.date.getMonth()
    if (m === lastMonth) return null
    lastMonth = m
    return MONTH_ABBR[m]
  })

  return (
    <div>
      <div style={{ overflowX: 'auto', paddingBottom: '4px' }} className="hide-scroll">
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px', minWidth: 'max-content' }}>
          <div style={{ display: 'flex', gap: '3px', marginLeft: '2px' }}>
            {weeks.map((_, i) => (
              <div key={i} style={{
                width: '11px', fontSize: '9px', color: C.textDim,
                fontFamily: '"Cinzel", serif',
              }}>{monthLabels[i] || ''}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {week.map((day, di) => {
                  const level = levelFor(day.count)
                  return (
                    <div
                      key={di}
                      onMouseEnter={() => !day.future && setTooltip(day)}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        width: '11px', height: '11px',
                        background: day.future ? 'transparent' : (level === 0 ? C.input : levelColor(level)),
                        border: `1px solid ${level === 0 ? C.border : accent + '33'}`,
                        cursor: day.future ? 'default' : 'pointer',
                        transition: 'transform 0.1s',
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
        <span style={{ fontSize: '10px', color: C.textDim, fontFamily: '"Cinzel", serif' }}>Less</span>
        {[0, 1, 2, 3, 4].map(l => (
          <div key={l} style={{
            width: '11px', height: '11px',
            background: l === 0 ? C.input : levelColor(l),
            border: `1px solid ${l === 0 ? C.border : accent + '33'}`,
          }} />
        ))}
        <span style={{ fontSize: '10px', color: C.textDim, fontFamily: '"Cinzel", serif' }}>More</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: C.textDim, fontFamily: '"Cinzel", serif' }}>
          {tooltip
            ? `${tooltip.count} added · ${tooltip.dateStr}`
            : 'entries added, last 12 months'}
        </span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const isCompact = useIsCompact()

  const [data, setData]       = useState({ anime: [], manga: [], drama: [] })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    if (!user) return
    Promise.all([
      axios.get(API.anime).catch(() => ({ data: [] })),
      axios.get(API.manga).catch(() => ({ data: [] })),
      axios.get(API.drama).catch(() => ({ data: [] })),
    ]).then(([a, m, d]) => {
      setData({ anime: a.data, manga: m.data, drama: d.data })
    }).finally(() => setLoading(false))
  }, [user])

  const activeRealm = REALMS.find(r => r.key === filter)

  const entries = useMemo(() => {
    const types = filter === 'all' ? ['anime', 'manga', 'drama'] : [filter]
    return types.flatMap(t => data[t].map(e => ({ ...e, __type: t })))
  }, [data, filter])

  const stats = useMemo(() => {
    const rated = entries.filter(e => e.rating)
    const completed = entries.filter(e => e.status === 'Completed')
    const totalMinutes = entries.reduce((sum, e) => {
      const units = e.__type === 'manga' ? (e.chapters?.current || 0) : (e.episodes?.current || 0)
      return sum + units * AVG_MINUTES[e.__type]
    }, 0)
    return {
      total: entries.length,
      hours: Math.round(totalMinutes / 60),
      avgRating: rated.length ? +(rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1) : 0,
      completed: completed.length,
    }
  }, [entries])

  const genreCounts = useMemo(() => {
    const counts = {}
    entries.forEach(e => (e.genres || []).forEach(g => { counts[g] = (counts[g] || 0) + 1 }))
    return counts
  }, [entries])

  const countsByDate = useMemo(() => {
    const counts = {}
    entries.forEach(e => {
      if (!e.createdAt) return
      const key = e.createdAt.split('T')[0]
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }, [entries])

  if (authLoading) return null

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '28px', color: C.gold + '55', letterSpacing: '0.3em', marginBottom: '18px' }}>ᛟ</div>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '14px', letterSpacing: '0.15em', color: C.text, marginBottom: '10px' }}>Sign in to see your analytics</div>
          <div style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.6, marginBottom: '24px' }}>
            Analytics are drawn from your lists across all three realms.
          </div>
          <button
            onClick={() => navigate('/profile')}
            style={{
              fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.gold,
              background: C.goldSoft, border: `1px solid ${C.gold}55`, padding: '12px 28px', cursor: 'pointer',
            }}
          >Sign In</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px',
        background: 'rgba(5,12,20,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', padding: isCompact ? '0 16px' : '0 36px',
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.3em', color: C.gold }}>ᛟ</span>
          <span style={{ fontFamily: '"Cinzel", serif', fontSize: isCompact ? '14px' : '16px', fontWeight: 700, letterSpacing: '0.25em', color: C.text }}>
            ANALYTICS
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.textMuted,
              background: 'transparent', border: `1px solid ${C.border}`, padding: '8px 16px', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.gold; e.currentTarget.style.borderColor = C.gold + '88' }}
            onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border }}
          >ᛟ YGGDRASIL</button>
          <ProfileIcon borderColor="rgba(201,168,76,0.35)" size={34} />
        </div>
      </div>

      <main style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: isCompact ? '84px 16px 56px' : '96px 36px 80px',
      }}>
        {/* Title + realm filter */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.45em', color: C.textDim, textTransform: 'uppercase', fontFamily: '"Cinzel", serif', marginBottom: '4px' }}>
            Across the Three Realms
          </div>
          <h1 style={{
            fontFamily: '"Cinzel", serif', fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 700,
            letterSpacing: '0.2em', color: C.text, margin: 0, textShadow: `0 0 40px ${C.gold}22`,
          }}>ANALYTICS</h1>
          <div style={{ height: '1px', marginTop: '16px', background: `linear-gradient(to right, ${C.gold}88, transparent)` }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '28px 0 44px' }}>
          {REALMS.map(r => (
            <RealmTab key={r.key} realm={r} active={filter === r.key} onClick={() => setFilter(r.key)} isCompact={isCompact} />
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {Array(4).fill(0).map((_, i) => <SkeletonBlock key={i} h="110px" style={{ flex: '1 1 150px' }} />)}
            </div>
            <SkeletonBlock h="220px" />
            <SkeletonBlock h="160px" />
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', border: `1px dashed ${C.border}` }}>
            <div style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.25em', color: C.textDim }}>
              Nothing tracked in {activeRealm.label} yet
            </div>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '52px' }}>
              <StatCard label="Total Entries" value={stats.total} color={activeRealm.color} rune="ᛏ" />
              <StatCard label="Hours Tracked" value={stats.hours} suffix="hrs" color={activeRealm.color} rune="ᛚ" />
              <StatCard label="Completed" value={stats.completed} color={activeRealm.color} rune="ᚲ" />
              <StatCard label="Avg Rating" value={stats.avgRating} suffix="/10" color={activeRealm.color} rune="★" />
            </div>

            {/* Genre breakdown */}
            <div style={{ marginBottom: '52px' }}>
              <SectionHeader title="Genre Breakdown" rune="ᚱ" />
              <GenreBreakdown genreCounts={genreCounts} accent={activeRealm.color} />
            </div>

            {/* Activity heatmap */}
            <div style={{ marginBottom: '52px' }}>
              <SectionHeader title="Activity" rune="ᛊ" />
              <ActivityHeatmap countsByDate={countsByDate} accent={activeRealm.color} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}