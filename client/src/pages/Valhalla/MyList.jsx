import { useState, useEffect, useMemo } from 'react'
import { useIsCompact } from '../../hooks/useMediaQuery'
import axios from 'axios'

const API = '/api/media/manga'

const C = {
  bg:           '#0A0810',
  surface:      '#120F1E',
  surfaceHover: '#17132A',
  input:        '#0D0A18',
  primary:      '#A78BFA',
  primarySoft:  'rgba(167,139,250,0.12)',
  crimson:      '#F43F5E',
  gold:         '#FCD34D',
  green:        '#34D399',
  red:          '#F87171',
  text:         '#EDE9FE',
  textMuted:    '#A89BC2',
  textDim:      '#4A3F6B',
  borderPrimary:'rgba(167,139,250,0.2)',
  borderCrimson:'rgba(244,63,94,0.18)',
}

const STATUS_TABS = ['All', 'Reading', 'Completed', 'Plan to Read', 'On Hold', 'Dropped']

const STATUS_COLOR = {
  Reading:       C.primary,
  Completed:     C.green,
  Dropped:       C.red,
  'Plan to Read':C.crimson,
  'On Hold':     C.gold,
}

const TYPE_COLOR = {
  Manhwa: C.primary,
  Manga:  C.gold,
  Manhua: C.crimson,
}

const TYPE_FILTERS = [
  { type: 'Manhwa', label: 'Manhwa' },
  { type: 'Manga',  label: 'Manga' },
  { type: 'Manhua', label: 'Manhua' },
]
const ALL_TYPE_VALUES = TYPE_FILTERS.map(t => t.type)

const SORT_OPTIONS = [
  { key: 'title',         label: 'Title' },
  { key: 'year',          label: 'Year' },
  { key: 'dateCompleted', label: 'Date Completed' },
  { key: 'rating',        label: 'My Score' },
  { key: 'timesRead',     label: 'Times Read' },
]

const COLUMNS = [
  { key: 'index',         label: '#',          sortable: false, width: '52px'  },
  { key: 'cover',         label: 'Cover',      sortable: false, width: '100px', rune: 'ᛈ' },
  { key: 'title',         label: 'Title',      sortable: true,  width: 'auto',  rune: 'ᛏ' },
  { key: 'type',          label: 'Type',       sortable: true,  width: '130px', rune: 'ᚱ' },
  { key: 'year',          label: 'Year',       sortable: true,  width: '90px',  rune: 'ᚢ' },
  { key: 'dateCompleted', label: 'Completed',  sortable: true,  width: '150px', rune: 'ᛞ' },
  { key: 'format',        label: 'Format',     sortable: true,  width: '100px', rune: 'ᚠ' },
  { key: 'timesRead',     label: 'Reads',       sortable: true,  width: '100px', rune: '⟳' },
  { key: 'rating',        label: 'My Score',   sortable: true,  width: '140px', rune: '★' },
]

const TOTAL_COLUMNS = COLUMNS.length

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function emptyMessage(status, searchQuery) {
  if (searchQuery) return `No results for "${searchQuery}"`
  if (status === 'All') return 'No entries yet in this realm'
  return `Nothing under "${status}" yet`
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ScoreDisplay({ rating }) {
  if (!rating) return (
    <span style={{ color: C.textDim, fontSize: '14px', fontFamily: '"Cinzel", serif' }}>—</span>
  )
  const color  = rating >= 8 ? C.green : rating >= 6 ? C.gold : rating >= 4 ? C.crimson : C.red
  const filled = Math.round(rating / 2)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{
            fontSize: '14px',
            color: i < filled ? color : C.textDim + '44',
            textShadow: i < filled ? `0 0 6px ${color}` : 'none',
          }}>★</span>
        ))}
      </div>
      <span style={{
        fontFamily: '"Cinzel", serif', fontSize: '15px', fontWeight: 700,
        color, textShadow: `0 0 10px ${color}66`,
      }}>{rating}</span>
    </div>
  )
}

function ReadCountDisplay({ count }) {
  const n = count || 0
  return (
    <span style={{
      fontFamily: '"Cinzel", serif', fontSize: '14px', fontWeight: 700,
      color: n > 0 ? C.primary : C.textDim,
    }}>
      {n > 0 && <span style={{ fontSize: '12px', marginRight: '3px', opacity: 0.7 }}>⟳</span>}
      {n}
    </span>
  )
}

function SortIndicator({ direction }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '6px', fontSize: '13px', color: C.primary }}>
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  )
}

function HeaderCell({ col, sortKey, sortDir, onSort }) {
  const [hovered, setHovered] = useState(false)
  const isActive = sortKey === col.key
  const isCentered = col.key === 'rating' || col.key === 'timesRead'

  return (
    <th
      onClick={() => col.sortable && onSort(col.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: col.width,
        padding: '16px 18px',
        textAlign: isCentered ? 'center' : 'left',
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
      <span style={{ color: C.gold + '66', marginRight: '6px', fontSize: '13px' }}>{col.rune}</span>
      {col.label}
      {isActive && <SortIndicator direction={sortDir} />}
      {!isActive && col.sortable && hovered && (
        <span style={{ marginLeft: '6px', fontSize: '12px', color: C.textDim, opacity: 0.5 }}>↕</span>
      )}
    </th>
  )
}

function MangaRow({ manga, index, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const sc = STATUS_COLOR[manga.status] || C.textMuted
  const tc = TYPE_COLOR[manga.type]    || C.primary
  const canNavigate = !!manga.anilistId

  const goToInfo = () => { if (canNavigate) onNavigate('Info', manga.anilistId) }

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

      {/* Cover */}
      <td style={{ ...tdBase, padding: '8px 10px', width: '100px' }}>
        <div
          onClick={goToInfo}
          style={{
            width: '95px', height: '134px', background: C.input,
            border: `1px solid ${hovered && canNavigate ? sc + '99' : C.borderPrimary}`,
            overflow: 'hidden',
            cursor: canNavigate ? 'pointer' : 'default',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: hovered && canNavigate ? `0 4px 16px ${sc}33` : 'none',
            flexShrink: 0,
          }}
        >
          {manga.coverImage
            ? <img src={manga.coverImage} alt={manga.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', color: C.textDim,
                background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
              }}>⚔</div>
          }
        </div>
      </td>

      {/* Title + status badge */}
      <td style={{ ...tdBase, padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span
            onClick={goToInfo}
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
          >{manga.title}</span>

          {!canNavigate && (
            <span style={{ fontSize: '10px', color: C.textDim + '88', fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
              (no AniList link — re-add to enable)
            </span>
          )}

          <span style={{
            fontSize: '11px', letterSpacing: '0.12em', color: sc,
            padding: '4px 10px', border: `1px solid ${sc}55`,
            background: `${sc}10`, fontFamily: '"Cinzel", serif',
            whiteSpace: 'nowrap', alignSelf: 'flex-start',
          }}>{manga.status}</span>
        </div>
      </td>

      {/* Type */}
      <td style={{ ...tdBase, padding: '14px 18px', width: '130px' }}>
        <span style={{
          fontSize: '13px', color: tc, fontFamily: '"Cinzel", serif',
          letterSpacing: '0.06em', padding: '4px 10px',
          border: `1px solid ${tc}44`, background: `${tc}0f`,
        }}>{manga.type || '—'}</span>
      </td>

      {/* Year */}
      <td style={{ ...tdBase, padding: '14px 18px', width: '90px', textAlign: 'center' }}>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '15px', color: C.textMuted }}>
          {manga.year || '—'}
        </span>
      </td>

      {/* Date Completed */}
      <td style={{ ...tdBase, padding: '14px 18px', width: '150px' }}>
        <span style={{ fontSize: '13px', color: manga.dateCompleted ? C.textMuted : C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.03em' }}>
          {formatDate(manga.dateCompleted)}
        </span>
      </td>

      {/* Format */}
      <td style={{ ...tdBase, padding: '14px 18px', width: '100px', textAlign: 'center' }}>
        <span style={{
          fontSize: '11px', letterSpacing: '0.12em', color: C.textMuted,
          padding: '4px 10px', border: `1px solid ${C.borderPrimary}`,
          background: C.bg, fontFamily: '"Cinzel", serif', whiteSpace: 'nowrap',
        }}>{manga.format || '—'}</span>
      </td>

      {/* Times Read */}
      <td style={{ ...tdBase, padding: '14px 18px', width: '100px', textAlign: 'center' }}>
        <ReadCountDisplay count={manga.timesRead} />
      </td>

      {/* My Score */}
      <td style={{ ...tdBase, borderRight: 'none', padding: '14px 18px', width: '140px', textAlign: 'center' }}>
        <ScoreDisplay rating={manga.rating} />
      </td>
    </tr>
  )
}

function EmptyState({ status, searchQuery }) {
  return (
    <tr>
      <td colSpan={TOTAL_COLUMNS}>
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '32px', color: C.primary + '22', letterSpacing: '0.4em', marginBottom: '16px' }}>⚔</div>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.3em', color: C.textDim, textTransform: 'uppercase' }}>
            {emptyMessage(status, searchQuery)}
          </div>
        </div>
      </td>
    </tr>
  )
}

function StatusTab({ label, count, active, onClick, isCompact }) {
  const [hovered, setHovered] = useState(false)
  const color       = STATUS_COLOR[label] || C.primary
  const activeColor = label === 'All' ? C.primary : color

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif', fontSize: '11px',
        letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? activeColor : hovered ? C.text : C.textMuted,
        background: active ? `${activeColor}15` : hovered ? C.surfaceHover : 'transparent',
        borderTop:    `1px solid ${active || hovered ? activeColor + '55' : C.borderPrimary}`,
        borderLeft:   `1px solid ${active || hovered ? activeColor + '55' : C.borderPrimary}`,
        borderRight:  `1px solid ${active || hovered ? activeColor + '55' : C.borderPrimary}`,
        borderBottom: `2px solid ${active ? activeColor : 'transparent'}`,
        padding: isCompact ? '11px 18px' : '10px 20px',
        minHeight: isCompact ? '40px' : 'auto',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
      }}
    >
      {label}
      {count > 0 && (
        <span style={{
          fontSize: '10px',
          color: active ? activeColor : C.textDim,
          background: active ? `${activeColor}20` : C.surface,
          border: `1px solid ${active ? activeColor + '44' : C.borderPrimary}`,
          padding: '1px 6px', borderRadius: '2px', fontWeight: 700, transition: 'all 0.2s',
        }}>{count}</span>
      )}
    </button>
  )
}

// ── Mobile floating card ─────────────────────────────────────────────────────
function MobileMangaCard({ manga, onNavigate }) {
  const sc = STATUS_COLOR[manga.status] || C.textMuted
  const tc = TYPE_COLOR[manga.type]    || C.primary
  const canNavigate = !!manga.anilistId
  const reads = manga.timesRead || 0

  const meta = [manga.type, manga.format, manga.year].filter(Boolean).join(' · ')

  return (
    <div
      onClick={() => canNavigate && onNavigate('Info', manga.anilistId)}
      style={{
        display: 'flex', gap: '12px',
        padding: '12px',
        background: C.surface,
        border: `1px solid ${C.borderPrimary}`,
        borderLeft: `3px solid ${sc}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        cursor: canNavigate ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: '76px', height: '108px', flexShrink: 0,
        background: C.input,
        border: `1px solid ${C.borderPrimary}`,
        overflow: 'hidden',
      }}>
        {manga.coverImage
          ? <img src={manga.coverImage} alt={manga.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', color: C.textDim,
            }}>⚔</div>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{
          fontSize: '14px', fontWeight: 600, color: C.text, lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{manga.title}</span>

        {meta && (
          <span style={{
            fontSize: '11px', color: tc, fontFamily: '"Cinzel", serif', letterSpacing: '0.05em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {meta}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', flexWrap: 'wrap' }}>
          {manga.rating ? (
            <span style={{ fontSize: '12px', color: C.gold, fontFamily: '"Cinzel", serif', fontWeight: 700 }}>
              ★ {manga.rating}
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: C.textDim }}>—</span>
          )}

          {reads > 0 && (
            <span style={{ fontSize: '11px', color: C.primary, fontFamily: '"Cinzel", serif', fontWeight: 700 }}>
              ⟳ {reads}
            </span>
          )}

          {manga.dateCompleted && (
            <span style={{ fontSize: '10px', color: C.textDim, fontFamily: '"Cinzel", serif' }}>
              {formatDate(manga.dateCompleted)}
            </span>
          )}
        </div>

        <span style={{
          fontSize: '9px', letterSpacing: '0.1em', color: sc,
          padding: '2px 8px', border: `1px solid ${sc}55`, background: `${sc}12`,
          fontFamily: '"Cinzel", serif', alignSelf: 'flex-start',
        }}>{manga.status}</span>
      </div>
    </div>
  )
}

// ── Mobile sort + type filter popup ──────────────────────────────────────────
function FilterPopup({ sortKey, sortDir, onSort, selectedTypes, onToggleType, onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10,8,16,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '480px',
        background: C.surface, border: `1px solid ${C.borderPrimary}`,
        borderBottom: 'none',
        padding: '20px 20px calc(96px + env(safe-area-inset-bottom, 0px))',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <span style={{ fontFamily: '"Cinzel", serif', fontSize: '12px', letterSpacing: '0.25em', color: C.gold }}>
            SORT &amp; FILTER
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.textDim, fontSize: '20px', cursor: 'pointer' }}
          >×</button>
        </div>

        <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: C.textDim, fontFamily: '"Cinzel", serif', marginBottom: '10px' }}>
          SORT BY
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '22px' }}>
          {SORT_OPTIONS.map(opt => {
            const active = sortKey === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => onSort(opt.key)}
                style={{
                  fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.1em',
                  color: active ? C.primary : C.textMuted,
                  background: active ? C.primarySoft : 'transparent',
                  border: `1px solid ${active ? C.primary + '66' : C.borderPrimary}`,
                  padding: '9px 14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {opt.label}
                {active && <span style={{ fontSize: '11px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: C.textDim, fontFamily: '"Cinzel", serif', marginBottom: '10px' }}>
          TYPE
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {TYPE_FILTERS.map(({ type, label }) => {
            const checked = selectedTypes.includes(type)
            const tc = TYPE_COLOR[type]
            return (
              <button
                key={type}
                onClick={() => onToggleType(type)}
                style={{
                  fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.1em',
                  color: checked ? tc : C.textDim,
                  background: checked ? `${tc}15` : 'transparent',
                  border: `1px solid ${checked ? tc + '66' : C.borderPrimary}`,
                  padding: '9px 14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span>{checked ? '☑' : '☐'}</span>
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main MyList ───────────────────────────────────────────────────────────────
export default function MyList({ onNavigate }) {
  const [manga, setManga]                   = useState([])
  const [loading, setLoading]               = useState(true)
  const [activeTab, setActiveTab]           = useState('All')
  const [searchQuery, setSearch]            = useState('')
  const [focused, setFocused]               = useState(false)
  const [sortKey, setSortKey]               = useState('createdAt')
  const [sortDir, setSortDir]               = useState('desc')
  const [selectedTypes, setSelectedTypes]   = useState(ALL_TYPE_VALUES)
  const [filterOpen, setFilterOpen]         = useState(false)
  const isCompact = useIsCompact()

  useEffect(() => {
    axios.get(API)
      .then(r => setManga(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const map = { All: manga.length }
    STATUS_TABS.slice(1).forEach(s => { map[s] = manga.filter(m => m.status === s).length })
    return map
  }, [manga])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const filtered = useMemo(() => {
    let list = manga

    if (activeTab !== 'All') {
      list = list.filter(m => m.status === activeTab)
    }

    if (selectedTypes.length < ALL_TYPE_VALUES.length) {
      list = list.filter(m => selectedTypes.includes(m.type))
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(m => m.title?.toLowerCase().includes(q))
    }

    return [...list].sort((a, b) => {
      let aVal, bVal
      if (sortKey === 'type') {
        aVal = a.type || ''; bVal = b.type || ''
      } else if (sortKey === 'rating') {
        aVal = a.rating ?? -1; bVal = b.rating ?? -1
      } else if (sortKey === 'timesRead') {
        aVal = a.timesRead ?? 0; bVal = b.timesRead ?? 0
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
  }, [manga, activeTab, searchQuery, sortKey, sortDir, selectedTypes])

  return (
    <div>
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── Controls ── */}
      {isCompact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="hide-scroll" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {STATUS_TABS.map(tab => (
              <StatusTab
                key={tab} label={tab}
                count={counts[tab] || 0}
                active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                isCompact
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <span style={{
                position: 'absolute', left: '12px',
                color: focused ? C.primary : C.textDim,
                fontSize: '15px', pointerEvents: 'none',
              }}>⌕</span>
              <input
                placeholder="Filter by title..."
                value={searchQuery}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  paddingLeft: '34px', paddingRight: '28px',
                  height: '44px', width: '100%', boxSizing: 'border-box',
                  background: C.input,
                  border: `1px solid ${focused ? C.primary + '88' : C.borderPrimary}`,
                  color: C.text, fontSize: '13px',
                  fontFamily: '"Cinzel", serif', letterSpacing: '0.05em',
                  outline: 'none', transition: 'all 0.3s ease',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute', right: '10px',
                    background: 'none', border: 'none',
                    color: C.textDim, cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: 0,
                  }}
                >×</button>
              )}
            </div>

            <button
              onClick={() => setFilterOpen(true)}
              aria-label="Sort and filter"
              style={{
                width: '44px', height: '44px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selectedTypes.length < ALL_TYPE_VALUES.length ? C.primarySoft : C.surface,
                border: `1px solid ${selectedTypes.length < ALL_TYPE_VALUES.length ? C.primary + '66' : C.borderPrimary}`,
                color: selectedTypes.length < ALL_TYPE_VALUES.length ? C.primary : C.gold,
                fontSize: '16px', cursor: 'pointer',
              }}
            >☰</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {STATUS_TABS.map(tab => (
              <StatusTab
                key={tab} label={tab}
                count={counts[tab] || 0}
                active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                isCompact={false}
              />
            ))}
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{
              position: 'absolute', left: '12px',
              color: focused ? C.primary : C.textDim,
              fontSize: '15px', pointerEvents: 'none', transition: 'color 0.2s',
            }}>⌕</span>
            <input
              placeholder="Filter by title..."
              value={searchQuery}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                paddingLeft: '34px', paddingRight: '28px',
                height: '40px', width: focused ? '230px' : '180px',
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
                style={{
                  position: 'absolute', right: '10px',
                  background: 'none', border: 'none',
                  color: C.textDim, cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.text}
                onMouseLeave={e => e.currentTarget.style.color = C.textDim}
              >×</button>
            )}
          </div>
        </div>
      )}

      {/* ── Count row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 0 0' }}>
        <span style={{ fontSize: '13px', color: C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
          <span style={{ color: C.primary }}>{filtered.length}</span> entr{filtered.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      <div style={{
        height: '1px', margin: '12px 0 0',
        background: `linear-gradient(to right, ${C.primary}88, ${C.crimson}44, transparent)`,
      }} />

      {/* ── List ── */}
      {loading ? (
        <div style={{
          padding: '64px', textAlign: 'center',
          fontFamily: '"Cinzel", serif', fontSize: '13px',
          letterSpacing: '0.3em', color: C.textDim,
        }}>Loading the realm...</div>
      ) : isCompact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: '"Cinzel", serif', fontSize: '28px', color: C.primary + '22', letterSpacing: '0.4em', marginBottom: '14px' }}>⚔</div>
              <div style={{ fontFamily: '"Cinzel", serif', fontSize: '12px', letterSpacing: '0.25em', color: C.textDim, textTransform: 'uppercase' }}>
                {emptyMessage(activeTab, searchQuery)}
              </div>
            </div>
          ) : (
            filtered.map(m => (
              <MobileMangaCard key={m._id} manga={m} onNavigate={onNavigate} />
            ))
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.bg})` }}>
                {COLUMNS.map(col => (
                  <HeaderCell key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <EmptyState status={activeTab} searchQuery={searchQuery} />
                : filtered.map((m, i) => <MangaRow key={m._id} manga={m} index={i} onNavigate={onNavigate} />)
              }
            </tbody>
          </table>
        </div>
      )}

      {filterOpen && (
        <FilterPopup
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          selectedTypes={selectedTypes}
          onToggleType={toggleType}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  )
}