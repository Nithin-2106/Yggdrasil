import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useIsCompact } from '../../hooks/useMediaQuery'

const API = '/api/media/drama'

// Kept in sync with Dashboard.jsx's C object so MyList reads as the same
// realm rather than a differently-tinted page.
const C = {
  bg:           '#0B0710',
  surface:      '#181227',
  surfaceHover: '#221B33',
  input:        '#120C1C',
  ember:        '#7A3B12',
  gold:         '#F0B429',
  goldBright:   '#FFCB57',
  electric:     '#38BDF8',
  electricSoft: 'rgba(56,189,248,0.12)',
  violet:       '#F5468C',
  indigo:       '#FF9F45',
  green:        '#22C55E',
  red:          '#EF4444',
  text:         '#EDEAF5',
  textMuted:    '#9C93B4',
  textDim:      '#A48AEF',
  borderGold:   'rgba(240,180,41,0.2)',
  borderElec:   'rgba(56,189,248,0.15)',
}

const STATUS_TABS = ['All', 'Watching', 'Completed', 'Plan to Watch', 'On Hold', 'Dropped']

const STATUS_COLOR = {
  Watching:        C.electric,
  Completed:       C.green,
  Dropped:         C.red,
  'Plan to Watch': C.violet,
  'On Hold':       C.indigo,
}

const TYPE_COUNTRY = { Kdrama: 'Korea', Cdrama: 'China', Jdrama: 'Japan' }
const TYPE_COLOR   = { Kdrama: C.electric, Cdrama: C.violet, Jdrama: C.indigo }

const COUNTRY_FILTERS = [
  { type: 'Kdrama', label: 'Korean' },
  { type: 'Cdrama', label: 'Chinese' },
  { type: 'Jdrama', label: 'Japanese' },
]
const ALL_COUNTRY_TYPES = COUNTRY_FILTERS.map(c => c.type)

const SORT_OPTIONS = [
  { key: 'title',         label: 'Title' },
  { key: 'year',          label: 'Year' },
  { key: 'dateCompleted', label: 'Date Completed' },
  { key: 'rating',        label: 'My Score' },
]

const COLUMNS = [
  { key: 'index',         label: '#',         sortable: false, width: '52px' },
  { key: 'cover',         label: 'Poster',    sortable: false, width: '100px', rune: 'ᛈ' },
  { key: 'title',         label: 'Title',     sortable: true,  width: 'auto',  rune: 'ᛏ' },
  { key: 'country',       label: 'Country',   sortable: true,  width: '150px', rune: 'ᚱ' },
  { key: 'year',          label: 'Year',      sortable: true,  width: '90px',  rune: 'ᚢ' },
  { key: 'dateCompleted', label: 'Completed', sortable: true,  width: '150px', rune: 'ᛞ' },
  { key: 'format',        label: 'Format',    sortable: true,  width: '100px', rune: 'ᚠ' },
  { key: 'rating',        label: 'My Score',  sortable: true,  width: '140px', rune: '★' },
]

function getCountry(drama) {
  return TYPE_COUNTRY[drama.type] || '—'
}

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
  const color  = rating >= 8 ? C.green : rating >= 6 ? C.goldBright : rating >= 4 ? C.ember : C.red
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

function SortIndicator({ direction }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '6px', fontSize: '13px', color: C.electric }}>
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  )
}

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
        fontSize: '11px', letterSpacing: '0.25em', fontWeight: 700,
        textTransform: 'uppercase',
        color: isActive ? C.electric : hovered && col.sortable ? C.text : C.textMuted,
        background: isActive
          ? `linear-gradient(180deg, ${C.electricSoft}, transparent)`
          : hovered && col.sortable ? C.surfaceHover : 'transparent',
        borderTop: 'none', borderLeft: 'none',
        borderRight: col.key !== 'rating' ? `1px solid ${C.borderGold}` : 'none',
        borderBottom: `2px solid ${isActive ? C.electric : C.borderGold}`,
        cursor: col.sortable ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
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

function DramaRow({ drama, index, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const sc = STATUS_COLOR[drama.status] || C.textMuted
  const tc = TYPE_COLOR[drama.type]    || C.textMuted
  const canNavigate = !!drama.tmdbId

  const goToInfo = () => { if (canNavigate) onNavigate('Info', drama.tmdbId) }

  const tdBase = {
    borderBottom: `1px solid ${C.borderGold}33`,
    borderRight:  `1px solid ${C.borderGold}`,
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
      <td style={{ ...tdBase, padding: '0 18px', textAlign: 'center', width: '52px' }}>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', color: C.textDim }}>
          {index + 1}
        </span>
      </td>

      <td style={{ ...tdBase, padding: '8px 10px', width: '100px' }}>
        <div
          onClick={goToInfo}
          style={{
            width: '95px', height: '140px',
            background: C.input,
            border: `1px solid ${hovered && canNavigate ? sc + '99' : C.borderGold}`,
            overflow: 'hidden',
            cursor: canNavigate ? 'pointer' : 'default',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: hovered && canNavigate ? `0 4px 16px ${sc}33` : 'none',
          }}
        >
          {drama.coverImage
            ? <img src={drama.coverImage} alt={drama.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', color: C.textDim,
                background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
              }}>📺</div>
          }
        </div>
      </td>

      <td style={{ ...tdBase, padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span
            onClick={goToInfo}
            style={{
              fontSize: '16px', fontWeight: 600,
              color: hovered ? C.electric : C.text,
              cursor: canNavigate ? 'pointer' : 'default',
              transition: 'color 0.2s',
              textDecoration: hovered && canNavigate ? 'underline' : 'none',
              textDecorationColor: C.electric + '66',
              textUnderlineOffset: '3px',
              lineHeight: 1.3,
            }}
          >
            {drama.title}
          </span>
          {!canNavigate && (
            <span style={{ fontSize: '10px', color: C.textDim + '88', fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
              (no TMDB link — re-add to enable)
            </span>
          )}
          <span style={{
            fontSize: '11px', letterSpacing: '0.12em',
            color: sc, padding: '4px 10px',
            border: `1px solid ${sc}55`,
            background: `${sc}10`,
            fontFamily: '"Cinzel", serif', whiteSpace: 'nowrap', alignSelf: 'flex-start',
          }}>
            {drama.status}
          </span>
        </div>
      </td>

      <td style={{ ...tdBase, padding: '14px 18px', width: '150px' }}>
        <span style={{ fontSize: '14px', color: tc, fontFamily: '"Cinzel", serif', letterSpacing: '0.05em' }}>
          {getCountry(drama)}
        </span>
      </td>

      <td style={{ ...tdBase, padding: '14px 18px', width: '90px', textAlign: 'center' }}>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '15px', color: C.textMuted }}>
          {drama.year || '—'}
        </span>
      </td>

      <td style={{ ...tdBase, padding: '14px 18px', width: '150px' }}>
        <span style={{ fontSize: '13px', color: drama.dateCompleted ? C.textMuted : C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.03em' }}>
          {formatDate(drama.dateCompleted)}
        </span>
      </td>

      <td style={{ ...tdBase, padding: '14px 18px', width: '100px', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', letterSpacing: '0.12em', color: C.textMuted, padding: '4px 10px', border: `1px solid ${C.borderGold}`, background: C.bg, fontFamily: '"Cinzel", serif', whiteSpace: 'nowrap' }}>
          {drama.format || '—'}
        </span>
      </td>

      <td style={{ ...tdBase, borderRight: 'none', padding: '14px 18px', width: '140px', textAlign: 'center' }}>
        <ScoreDisplay rating={drama.rating} />
      </td>
    </tr>
  )
}

function EmptyState({ status, searchQuery }) {
  return (
    <tr>
      <td colSpan={8}>
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '32px', color: C.gold + '22', letterSpacing: '0.4em', marginBottom: '16px' }}>ᛗ</div>
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
  const activeColor = STATUS_COLOR[label] || C.electric

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
        borderTop:    `1px solid ${active ? activeColor + '55' : hovered ? C.borderElec : C.borderGold}`,
        borderLeft:   `1px solid ${active ? activeColor + '55' : hovered ? C.borderElec : C.borderGold}`,
        borderRight:  `1px solid ${active ? activeColor + '55' : hovered ? C.borderElec : C.borderGold}`,
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
          border: `1px solid ${active ? activeColor + '44' : C.borderGold}`,
          padding: '1px 6px', borderRadius: '2px', fontWeight: 700, transition: 'all 0.2s',
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Mobile floating card ─────────────────────────────────────────────────────
function MobileDramaCard({ drama, onNavigate }) {
  const sc = STATUS_COLOR[drama.status] || C.textMuted
  const tc = TYPE_COLOR[drama.type]    || C.textMuted
  const canNavigate = !!drama.tmdbId

  const meta = [getCountry(drama), drama.format, drama.year].filter(Boolean).join(' · ')

  return (
    <div
      onClick={() => canNavigate && onNavigate('Info', drama.tmdbId)}
      style={{
        display: 'flex', gap: '12px',
        padding: '12px',
        background: C.surface,
        border: `1px solid ${C.borderGold}`,
        borderLeft: `3px solid ${sc}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        cursor: canNavigate ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: '76px', height: '108px', flexShrink: 0,
        background: C.input,
        border: `1px solid ${C.borderGold}`,
        overflow: 'hidden',
      }}>
        {drama.coverImage
          ? <img src={drama.coverImage} alt={drama.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', color: C.textDim,
            }}>📺</div>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{
          fontSize: '14px', fontWeight: 600, color: C.text, lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{drama.title}</span>

        {meta && (
          <span style={{ fontSize: '11px', color: tc, fontFamily: '"Cinzel", serif', letterSpacing: '0.05em' }}>
            {meta}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto' }}>
          {drama.rating ? (
            <span style={{ fontSize: '12px', color: C.goldBright, fontFamily: '"Cinzel", serif', fontWeight: 700 }}>
              ★ {drama.rating}
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: C.textDim }}>—</span>
          )}
          {drama.dateCompleted && (
            <span style={{ fontSize: '10px', color: C.textDim, fontFamily: '"Cinzel", serif' }}>
              {formatDate(drama.dateCompleted)}
            </span>
          )}
        </div>

        <span style={{
          fontSize: '9px', letterSpacing: '0.1em', color: sc,
          padding: '2px 8px', border: `1px solid ${sc}55`, background: `${sc}12`,
          fontFamily: '"Cinzel", serif', alignSelf: 'flex-start',
        }}>{drama.status}</span>
      </div>
    </div>
  )
}

// ── Mobile sort + country filter popup ───────────────────────────────────────
function FilterPopup({ sortKey, sortDir, onSort, selectedCountries, onToggleCountry, onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 700,
        background: 'rgba(11,7,16,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '480px',
        background: C.surface, border: `1px solid ${C.borderGold}`,
        borderBottom: 'none',
        padding: '20px 20px 32px',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <span style={{ fontFamily: '"Cinzel", serif', fontSize: '12px', letterSpacing: '0.25em', color: C.goldBright }}>
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
                  color: active ? C.electric : C.textMuted,
                  background: active ? C.electricSoft : 'transparent',
                  border: `1px solid ${active ? C.electric + '66' : C.borderGold}`,
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
          COUNTRY
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {COUNTRY_FILTERS.map(({ type, label }) => {
            const checked = selectedCountries.includes(type)
            const tc = TYPE_COLOR[type]
            return (
              <button
                key={type}
                onClick={() => onToggleCountry(type)}
                style={{
                  fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.1em',
                  color: checked ? tc : C.textDim,
                  background: checked ? `${tc}15` : 'transparent',
                  border: `1px solid ${checked ? tc + '66' : C.borderGold}`,
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
  const [dramas, setDramas]                   = useState([])
  const [loading, setLoading]                 = useState(true)
  const [activeTab, setActiveTab]             = useState('All')
  const [searchQuery, setSearch]              = useState('')
  const [focused, setFocused]                 = useState(false)
  const [sortKey, setSortKey]                 = useState('createdAt')
  const [sortDir, setSortDir]                 = useState('desc')
  const [selectedCountries, setSelectedCountries] = useState(ALL_COUNTRY_TYPES)
  const [filterOpen, setFilterOpen]           = useState(false)
  const isCompact = useIsCompact()

  useEffect(() => {
    axios.get(API)
      .then(r => setDramas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const map = { All: dramas.length }
    STATUS_TABS.slice(1).forEach(s => { map[s] = dramas.filter(d => d.status === s).length })
    return map
  }, [dramas])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleCountry = (type) => {
    setSelectedCountries(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const filtered = useMemo(() => {
    let list = dramas

    if (activeTab !== 'All') {
      list = list.filter(d => d.status === activeTab)
    }

    if (selectedCountries.length < ALL_COUNTRY_TYPES.length) {
      list = list.filter(d => selectedCountries.includes(d.type))
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(d => d.title?.toLowerCase().includes(q))
    }

    return [...list].sort((a, b) => {
      let aVal, bVal
      if (sortKey === 'country') {
        aVal = getCountry(a); bVal = getCountry(b)
      } else if (sortKey === 'rating') {
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
  }, [dramas, activeTab, searchQuery, sortKey, sortDir, selectedCountries])

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
                color: focused ? C.electric : C.textDim,
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
                  border: `1px solid ${focused ? C.electric + '88' : C.borderGold}`,
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
                background: selectedCountries.length < ALL_COUNTRY_TYPES.length ? C.electricSoft : C.surface,
                border: `1px solid ${selectedCountries.length < ALL_COUNTRY_TYPES.length ? C.electric + '66' : C.borderGold}`,
                color: selectedCountries.length < ALL_COUNTRY_TYPES.length ? C.electric : C.gold,
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
              color: focused ? C.electric : C.textDim,
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
                border: `1px solid ${focused ? C.electric + '88' : C.borderGold}`,
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
          <span style={{ color: C.electric }}>{filtered.length}</span> entr{filtered.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      <div style={{
        height: '1px', margin: '12px 0 0',
        background: `linear-gradient(to right, ${C.ember}88, ${C.electric}44, transparent)`,
      }} />

      {/* ── List ── */}
      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center', fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.3em', color: C.textDim }}>
          Loading the realm...
        </div>
      ) : isCompact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: '"Cinzel", serif', fontSize: '28px', color: C.gold + '22', letterSpacing: '0.4em', marginBottom: '14px' }}>ᛗ</div>
              <div style={{ fontFamily: '"Cinzel", serif', fontSize: '12px', letterSpacing: '0.25em', color: C.textDim, textTransform: 'uppercase' }}>
                {emptyMessage(activeTab, searchQuery)}
              </div>
            </div>
          ) : (
            filtered.map(drama => (
              <MobileDramaCard key={drama._id} drama={drama} onNavigate={onNavigate} />
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
                : filtered.map((drama, i) => (
                    <DramaRow key={drama._id} drama={drama} index={i} onNavigate={onNavigate} />
                  ))
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
          selectedCountries={selectedCountries}
          onToggleCountry={toggleCountry}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  )
}