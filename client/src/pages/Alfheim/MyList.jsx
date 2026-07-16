// client/src/pages/Alfheim/MyList.jsx
import { useState, useEffect, useMemo } from 'react'
import { useIsCompact } from '../../hooks/useMediaQuery'
import axios from 'axios'

const API = '/api/media/anime'

const C = {
  bg:           '#050C10',
  surface:      '#0A1A20',
  surfaceHover: '#0E2228',
  input:        '#071318',
  primary:      '#5EEAD4',
  primarySoft:  'rgba(94,234,212,0.12)',
  aurora:       '#C084FC',
  green:        '#34D399',
  gold:         '#A3E635',
  red:          '#F87171',
  text:         '#E0F7F4',
  textMuted:    '#7ABFB8',
  textDim:      '#2E5A56',
  borderPrimary:'rgba(94,234,212,0.2)',
  borderAurora: 'rgba(192,132,252,0.18)',
}

const STATUS_TABS = ['All', 'Watching', 'Completed', 'Plan to Watch', 'On Hold', 'Dropped']

const STATUS_COLOR = {
  Watching:        C.primary,
  Completed:       C.green,
  Dropped:         C.red,
  'Plan to Watch': C.aurora,
  'On Hold':       C.gold,
}

const FORMAT_COLOR = {
  Movie:   C.gold,
  OVA:     C.aurora,
  Special: C.green,
  Series:  C.primary,
}

const COLUMNS = [
  { key: 'index',         label: '#',         sortable: false, width: '52px'  },
  { key: 'cover',         label: 'Poster',    sortable: false, width: '100px', rune: 'ᛈ' },
  { key: 'title',         label: 'Title',     sortable: true,  width: 'auto',  rune: 'ᛏ' },
  { key: 'year',          label: 'Year',      sortable: true,  width: '90px',  rune: 'ᚢ' },
  { key: 'dateCompleted', label: 'Completed', sortable: true,  width: '150px', rune: 'ᛞ' },
  { key: 'format',        label: 'Format',    sortable: true,  width: '110px', rune: 'ᚠ' },
  { key: 'rating',        label: 'My Score',  sortable: true,  width: '140px', rune: '★'  },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Score display ─────────────────────────────────────────────────────────────
function ScoreDisplay({ rating }) {
  if (!rating) {
    return <span style={{ color: C.textDim, fontSize: '14px', fontFamily: '"Cinzel", serif' }}>—</span>
  }
  const color  = rating >= 8 ? C.green : rating >= 6 ? C.gold : rating >= 4 ? C.aurora : C.red
  const filled = Math.round(rating / 2)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ fontSize: '14px', color: i < filled ? color : C.textDim + '44', textShadow: i < filled ? `0 0 6px ${color}` : 'none' }}>★</span>
        ))}
      </div>
      <span style={{ fontFamily: '"Cinzel", serif', fontSize: '15px', fontWeight: 700, color, textShadow: `0 0 10px ${color}66` }}>
        {rating}
      </span>
    </div>
  )
}

// ── Table header cell ─────────────────────────────────────────────────────────
function HeaderCell({ col, sortKey, sortDir, onSort }) {
  const [hovered, setHovered] = useState(false)
  const isActive = sortKey === col.key
  return (
    <th
      onClick={() => col.sortable && onSort(col.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: col.width,
        padding: '16px 18px',
        textAlign: col.key === 'rating' ? 'center' : 'left',
        fontFamily: '"Cinzel", serif',
        fontSize: '11px', letterSpacing: '0.25em', fontWeight: 700, textTransform: 'uppercase',
        color: isActive ? C.primary : hovered && col.sortable ? C.text : C.textMuted,
        background: isActive
          ? `linear-gradient(180deg, ${C.primarySoft}, transparent)`
          : hovered && col.sortable ? C.surfaceHover : 'transparent',
        borderTop: 'none', borderLeft: 'none',
        borderRight: col.key !== 'rating' ? `1px solid ${C.borderPrimary}` : 'none',
        borderBottom: `2px solid ${isActive ? C.primary : C.borderPrimary}`,
        cursor: col.sortable ? 'pointer' : 'default',
        userSelect: 'none', transition: 'all 0.2s ease', whiteSpace: 'nowrap',
      }}
    >
      {col.rune && <span style={{ color: C.gold + '66', marginRight: '6px', fontSize: '13px' }}>{col.rune}</span>}
      {col.label}
      {isActive && (
        <span style={{ marginLeft: '6px', fontSize: '13px', color: C.primary }}>
          {sortDir === 'asc' ? '↑' : '↓'}
        </span>
      )}
      {!isActive && col.sortable && hovered && (
        <span style={{ marginLeft: '6px', fontSize: '12px', color: C.textDim, opacity: 0.5 }}>↕</span>
      )}
    </th>
  )
}

// ── Anime row ─────────────────────────────────────────────────────────────────
function AnimeRow({ anime, index, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const sc = STATUS_COLOR[anime.status] || C.textMuted
  const fc = FORMAT_COLOR[anime.format] || C.primary
  const canNavigate = !!anime.malId

  const tdBase = {
    borderBottom: `1px solid ${C.borderPrimary}33`,
    borderRight:  `1px solid ${C.borderPrimary}`,
    verticalAlign: 'middle',
  }

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(90deg, ${sc}0a, ${C.surfaceHover}, ${C.surface})`
          : index % 2 === 0 ? C.surface : C.bg,
        borderLeft: `2px solid ${hovered ? sc : 'transparent'}`,
        transition: 'all 0.2s ease',
      }}
    >
      {/* # */}
      <td style={{ ...tdBase, padding: '0 18px', textAlign: 'center', width: '52px' }}>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', color: C.textDim }}>{index + 1}</span>
      </td>

      {/* Poster */}
      <td style={{ ...tdBase, padding: '8px 10px', width: '100px' }}>
        <div
          onClick={() => canNavigate && onNavigate('Info', anime.malId)}
          style={{
            width: '95px', height: '134px', background: C.input,
            border: `1px solid ${hovered && canNavigate ? sc + '99' : C.borderPrimary}`,
            overflow: 'hidden',
            cursor: canNavigate ? 'pointer' : 'default',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: hovered && canNavigate ? `0 4px 16px ${sc}33` : 'none',
          }}
        >
          {anime.coverImage
            ? <img src={anime.coverImage} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: C.textDim, background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>✦</div>
          }
        </div>
      </td>

      {/* Title + status */}
      <td style={{ ...tdBase, padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span
            onClick={() => canNavigate && onNavigate('Info', anime.malId)}
            style={{
              fontSize: '16px', fontWeight: 600,
              color: hovered ? C.primary : C.text,
              cursor: canNavigate ? 'pointer' : 'default',
              transition: 'color 0.2s',
              textDecoration: hovered && canNavigate ? 'underline' : 'none',
              textDecorationColor: C.primary + '66',
              textUnderlineOffset: '3px',
              lineHeight: 1.3,
            }}
          >
            {anime.title}
          </span>
          {!canNavigate && (
            <span
              style={{
                fontSize: '10px',
                color: C.textDim + '88',
                fontFamily: '"Cinzel", serif',
                letterSpacing: '0.1em',
            }}
          >
            (no MAL link — re-add to enable)
          </span>
)}
          <span style={{ fontSize: '11px', letterSpacing: '0.12em', color: sc, padding: '4px 10px', border: `1px solid ${sc}55`, background: `${sc}10`, fontFamily: '"Cinzel", serif', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
            {anime.status}
          </span>
        </div>
      </td>

      {/* Year */}
      <td style={{ ...tdBase, padding: '14px 18px', textAlign: 'center' }}>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '15px', color: C.textMuted }}>{anime.year || '—'}</span>
      </td>

      {/* Date Completed */}
      <td style={{ ...tdBase, padding: '14px 18px' }}>
        <span style={{ fontSize: '13px', color: anime.dateCompleted ? C.textMuted : C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.03em' }}>
          {formatDate(anime.dateCompleted)}
        </span>
      </td>

      {/* Format */}
      <td style={{ ...tdBase, padding: '14px 18px', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', letterSpacing: '0.12em', color: fc, padding: '4px 10px', border: `1px solid ${fc}55`, background: `${fc}10`, fontFamily: '"Cinzel", serif', whiteSpace: 'nowrap' }}>
          {anime.format || '—'}
        </span>
      </td>

      {/* Score */}
      <td style={{ ...tdBase, borderRight: 'none', padding: '14px 18px', textAlign: 'center' }}>
        <ScoreDisplay rating={anime.rating} />
      </td>
    </tr>
  )
}

// ── Status tab ────────────────────────────────────────────────────────────────
function StatusTab({ label, count, active, onClick, isCompact }) {
  const [hovered, setHovered] = useState(false)
  const color = STATUS_COLOR[label] || C.primary
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif', fontSize: '11px',
        letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? color : hovered ? C.text : C.textMuted,
        background: active ? `${color}15` : hovered ? C.surfaceHover : 'transparent',
        borderTop:    `1px solid ${active ? color + '55' : C.borderPrimary}`,
        borderLeft:   `1px solid ${active ? color + '55' : C.borderPrimary}`,
        borderRight:  `1px solid ${active ? color + '55' : C.borderPrimary}`,
        borderBottom: `2px solid ${active ? color : 'transparent'}`,
        padding: isCompact ? '13px 20px' : '10px 20px',
        minHeight: isCompact ? '44px' : 'auto',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
      }}
    >
      {label}
      {count > 0 && (
        <span style={{ fontSize: '10px', color: active ? color : C.textDim, background: active ? `${color}20` : C.surface, border: `1px solid ${active ? color + '44' : C.borderPrimary}`, padding: '1px 6px', borderRadius: '2px', fontWeight: 700, transition: 'all 0.2s' }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ status, searchQuery }) {
  return (
    <tr>
      <td colSpan={7}>
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '32px', color: C.primary + '22', letterSpacing: '0.4em', marginBottom: '16px' }}>ᚨ</div>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.3em', color: C.textDim, textTransform: 'uppercase' }}>
            {searchQuery
              ? `No results for "${searchQuery}"`
              : status === 'All'
                ? 'No entries yet in this realm'
                : `Nothing under "${status}" yet`
            }
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Main MyList ───────────────────────────────────────────────────────────────
export default function MyList({ onNavigate }) {
  const [anime,       setAnime]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState('All')
  const [searchQuery, setSearch]      = useState('')
  const [focused,     setFocused]     = useState(false)
  const [sortKey,     setSortKey]     = useState('createdAt')
  const [sortDir,     setSortDir]     = useState('desc')
  const isCompact = useIsCompact()

  useEffect(() => {
    axios.get(API)
      .then((r) => setAnime(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])


  const counts = useMemo(() => {
    const map = { All: anime.length }
    STATUS_TABS.slice(1).forEach((s) => { map[s] = anime.filter((a) => a.status === s).length })
    return map
  }, [anime])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let list = anime

    if (activeTab !== 'All') list = list.filter((a) => a.status === activeTab)

    const q = searchQuery.trim().toLowerCase()
    if (q) list = list.filter((a) => a.title?.toLowerCase().includes(q))

    return [...list].sort((a, b) => {
      let aVal, bVal
      if (sortKey === 'rating') {
        aVal = a.rating ?? -1; bVal = b.rating ?? -1
      } else if (sortKey === 'dateCompleted') {
        aVal = a.dateCompleted ? new Date(a.dateCompleted).getTime() : 0
        bVal = b.dateCompleted ? new Date(b.dateCompleted).getTime() : 0
      } else if (sortKey === 'year') {
        aVal = a.year ?? 0; bVal = b.year ?? 0
      } else if (sortKey === 'createdAt') {
        aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0
        bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0
      } else {
        aVal = (a[sortKey] || '').toString().toLowerCase()
        bVal = (b[sortKey] || '').toString().toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [anime, activeTab, searchQuery, sortKey, sortDir])

  return (
    <div>
      {/* Tabs + search */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {STATUS_TABS.map((tab) => (
            <StatusTab
              key={tab} label={tab}
              count={counts[tab] || 0}
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              isCompact={isCompact}
            />
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '12px', color: focused ? C.primary : C.textDim, fontSize: '15px', pointerEvents: 'none', transition: 'color 0.2s' }}>⌕</span>
          <input
            placeholder="Filter by title..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              paddingLeft: '34px', paddingRight: '28px', height: '40px',
              width: focused ? '230px' : '180px',
              background: C.input,
              border: `1px solid ${focused ? C.primary + '88' : C.borderPrimary}`,
              color: C.text, fontSize: '13px',
              fontFamily: '"Cinzel", serif', letterSpacing: '0.05em',
              outline: 'none', transition: 'all 0.3s ease',
              boxShadow: focused ? `0 0 16px ${C.primarySoft}` : 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.text }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textDim }}
            >×</button>
          )}
        </div>
      </div>

      {/* Count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 0 0' }}>
        <span style={{ fontSize: '13px', color: C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
          <span style={{ color: C.primary }}>{filtered.length}</span> entr{filtered.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', margin: '12px 0 0', background: `linear-gradient(to right, ${C.primary}88, ${C.aurora}44, transparent)` }} />

      {/* Table */}
      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center', fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.3em', color: C.textDim }}>
          Loading the realm...
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.bg})` }}>
                {COLUMNS.map((col) => (
                  <HeaderCell key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <EmptyState status={activeTab} searchQuery={searchQuery} />
                : filtered.map((a, i) => (
                    <AnimeRow key={a._id} anime={a} index={i} onNavigate={onNavigate} />
                  ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}