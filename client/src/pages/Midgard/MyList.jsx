import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'

const API = 'http://localhost:5000/api/drama'

const C = {
  bg:           '#080D1A',
  surface:      '#0F1829',
  surfaceHover: '#141F33',
  input:        '#0A1220',
  ember:        '#C2410C',
  emberSoft:    'rgba(194,65,12,0.15)',
  gold:         '#CA8A04',
  goldBright:   '#F59E0B',
  goldSoft:     'rgba(202,138,4,0.15)',
  electric:     '#38BDF8',
  electricSoft: 'rgba(56,189,248,0.1)',
  violet:       '#7C3AED',
  violetSoft:   'rgba(124,58,237,0.15)',
  green:        '#22C55E',
  red:          '#EF4444',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderGold:   'rgba(202,138,4,0.2)',
  borderElec:   'rgba(56,189,248,0.15)',
}

const STATUS_TABS = ['All', 'Watching', 'Completed', 'Plan to Watch', 'On Hold', 'Dropped']

const STATUS_COLOR = {
  'Watching':      C.electric,
  'Completed':     C.green,
  'Dropped':       C.red,
  'Plan to Watch': C.violet,
  'On Hold':       C.goldBright,
}

const TYPE_COUNTRY = {
  'Kdrama': 'South Korea',
  'Cdrama': 'China',
  'Jdrama': 'Japan',
}

const TYPE_COLOR = {
  'Kdrama': C.electric,
  'Cdrama': C.violet,
  'Jdrama': C.goldBright,
}

const COLUMNS = [
  { key: 'index',     label: '#',          sortable: false, width: '44px' },
  { key: 'cover',     label: '',           sortable: false, width: '72px' },
  { key: 'title',     label: 'Title',      sortable: true,  width: 'auto', rune: 'ᛏ' },
  { key: 'country',   label: 'Country',    sortable: true,  width: '130px', rune: 'ᚱ' },
  { key: 'year',      label: 'Year',       sortable: true,  width: '80px',  rune: 'ᚢ' },
  { key: 'createdAt', label: 'Date Added', sortable: true,  width: '120px', rune: 'ᛞ' },
  { key: 'format',    label: 'Format',     sortable: true,  width: '90px',  rune: 'ᚠ' },
  { key: 'rating',    label: 'My Score',   sortable: true,  width: '120px', rune: '★' },
]

function getCountry(drama) {
  return TYPE_COUNTRY[drama.type] || '—'
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ScoreDisplay({ rating }) {
  if (!rating) return (
    <span style={{ color: C.textDim, fontSize: '12px', fontFamily: '"Cinzel", serif' }}>—</span>
  )
  const color = rating >= 8 ? C.green : rating >= 6 ? C.goldBright : rating >= 4 ? C.ember : C.red
  const filled = Math.round(rating / 2)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '1px' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{
            fontSize: '12px',
            color: i < filled ? color : C.textDim + '44',
            textShadow: i < filled ? `0 0 6px ${color}` : 'none',
          }}>★</span>
        ))}
      </div>
      <span style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '13px',
        fontWeight: 700,
        color,
        textShadow: `0 0 10px ${color}66`,
      }}>{rating}</span>
    </div>
  )
}

function SortIndicator({ priority, direction }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '2px',
      marginLeft: '6px', fontSize: '10px', color: C.electric,
      fontFamily: '"Cinzel", serif',
    }}>
      {priority > 0 && (
        <span style={{
          fontSize: '8px', background: C.electric, color: C.bg,
          borderRadius: '50%', width: '13px', height: '13px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700,
        }}>{priority}</span>
      )}
      <span style={{ fontSize: '12px' }}>{direction === 'asc' ? '↑' : '↓'}</span>
    </span>
  )
}

function HeaderCell({ col, sortKeys, onSort }) {
  const [hovered, setHovered] = useState(false)
  const sortIndex = sortKeys.findIndex(s => s.key === col.key)
  const isActive  = sortIndex !== -1
  const direction = isActive ? sortKeys[sortIndex].dir : 'asc'

  return (
    <th
      onClick={() => col.sortable && onSort(col.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: col.width,
        padding: '14px 16px',
        textAlign: col.key === 'rating' ? 'center' : 'left',
        fontFamily: '"Cinzel", serif',
        fontSize: '10px',
        letterSpacing: '0.25em',
        fontWeight: 700,
        textTransform: 'uppercase',
        color: isActive ? C.electric : hovered && col.sortable ? C.text : C.textMuted,
        background: isActive
          ? `linear-gradient(180deg, ${C.electricSoft}, transparent)`
          : hovered && col.sortable ? C.surfaceHover : 'transparent',
        // FIX: use individual border sides so borderBottom doesn't get overridden
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: col.key !== 'rating' ? `1px solid ${C.borderGold}` : 'none',
        borderBottom: `2px solid ${isActive ? C.electric : C.borderGold}`,
        cursor: col.sortable ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        position: 'relative',
      }}
    >
      <span style={{ color: C.gold + '66', marginRight: '6px', fontSize: '12px' }}>{col.rune}</span>
      {col.label}
      {isActive && <SortIndicator priority={sortIndex + 1} direction={direction} />}
      {!isActive && col.sortable && hovered && (
        <span style={{ marginLeft: '6px', fontSize: '11px', color: C.textDim, opacity: 0.5 }}>↕</span>
      )}
    </th>
  )
}

function DramaRow({ drama, index, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const sc = STATUS_COLOR[drama.status] || C.textMuted
  const tc = TYPE_COLOR[drama.type]    || C.textMuted

  // Navigate to InfoPage — works whether tmdbId is a number or missing
  const goToInfo = () => {
    if (drama.tmdbId) {
      onNavigate('Info', drama.tmdbId)
    }
  }
  const canNavigate = !!drama.tmdbId

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
      {/* # */}
      <td style={{ ...tdBase, padding: '0 16px', textAlign: 'center', width: '44px' }}>
        <span style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '11px',
          color: C.textDim,
        }}>
          {index + 1}
        </span>
      </td>

      {/* Cover — FIX: bigger image 54x76 */}
      <td style={{ ...tdBase, padding: '6px 8px', width: '90px' }}>
        <div
          onClick={goToInfo}
          style={{
            width: '90px',
            height: '125px',
            background: C.input,
            border: `1px solid ${hovered && canNavigate ? sc + '99' : C.borderGold}`,
            overflow: 'hidden',
            cursor: canNavigate ? 'pointer' : 'default',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: hovered && canNavigate ? `0 4px 16px ${sc}33` : 'none',
            flexShrink: 0,
          }}
        >
          {drama.coverImage
            ? <img
                src={drama.coverImage}
                alt={drama.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            : <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', color: C.textDim,
                background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
              }}>📺</div>
          }
        </div>
      </td>

      {/* Title — FIX: onClick always fires, guard inside */}
      <td style={{ ...tdBase, padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span
            onClick={goToInfo}
            style={{
              fontSize: '14px',
              fontWeight: 600,
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
            <span style={{
              fontSize: '9px', color: C.textDim + '88',
              fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
            }}>
              (no TMDB link — re-add to enable)
            </span>
          )}
          {drama.genres?.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {drama.genres.slice(0, 3).map(g => (
                <span key={g} style={{
                  fontSize: '9px', letterSpacing: '0.08em',
                  color: C.textDim, padding: '2px 6px',
                  border: `1px solid ${C.borderGold}`,
                  background: C.bg,
                  fontFamily: '"Cinzel", serif',
                }}>{g}</span>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Country */}
      <td style={{ ...tdBase, padding: '12px 16px', width: '130px' }}>
        <span style={{
          fontSize: '12px', color: tc,
          fontFamily: '"Cinzel", serif', letterSpacing: '0.05em',
        }}>
          {getCountry(drama)}
        </span>
      </td>

      {/* Year */}
      <td style={{ ...tdBase, padding: '12px 16px', width: '80px', textAlign: 'center' }}>
        <span style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '13px', color: C.textMuted,
        }}>
          {drama.year || '—'}
        </span>
      </td>

      {/* Date Added */}
      <td style={{ ...tdBase, padding: '12px 16px', width: '120px' }}>
        <span style={{
          fontSize: '11px', color: C.textDim,
          fontFamily: '"Cinzel", serif', letterSpacing: '0.03em',
        }}>
          {formatDate(drama.createdAt)}
        </span>
      </td>

      {/* Format */}
      <td style={{ ...tdBase, padding: '12px 16px', width: '90px', textAlign: 'center' }}>
        <span style={{
          fontSize: '10px', letterSpacing: '0.12em',
          color: C.textMuted, padding: '3px 8px',
          border: `1px solid ${C.borderGold}`,
          background: C.bg,
          fontFamily: '"Cinzel", serif',
          whiteSpace: 'nowrap',
        }}>
          {drama.format || '—'}
        </span>
      </td>

      {/* My Score — no borderRight on last column */}
      <td style={{ ...tdBase, borderRight: 'none', padding: '12px 16px', width: '120px', textAlign: 'center' }}>
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
          <div style={{
            fontFamily: '"Cinzel", serif', fontSize: '32px',
            color: C.gold + '22', letterSpacing: '0.4em', marginBottom: '16px',
          }}>ᛗ</div>
          <div style={{
            fontFamily: '"Cinzel", serif', fontSize: '12px',
            letterSpacing: '0.3em', color: C.textDim, textTransform: 'uppercase',
          }}>
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

// FIX: Status tab — split border shorthand to prevent borderBottom override
function StatusTab({ label, count, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  const color = STATUS_COLOR[label] || C.electric
  const isAll = label === 'All'
  const activeColor = isAll ? C.electric : color

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '10px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: active ? activeColor : hovered ? C.text : C.textMuted,
        background: active
          ? `${activeColor}15`
          : hovered ? C.surfaceHover : 'transparent',
        // FIX: individual border sides — no shorthand override
        borderTop:    `1px solid ${active ? activeColor + '55' : hovered ? C.borderElec : C.borderGold}`,
        borderLeft:   `1px solid ${active ? activeColor + '55' : hovered ? C.borderElec : C.borderGold}`,
        borderRight:  `1px solid ${active ? activeColor + '55' : hovered ? C.borderElec : C.borderGold}`,
        borderBottom: `2px solid ${active ? activeColor : 'transparent'}`,
        padding: '10px 20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {counts => null /* counts rendered in parent */}
      {count > 0 && (
        <span style={{
          fontSize: '9px',
          color: active ? activeColor : C.textDim,
          background: active ? `${activeColor}20` : C.surface,
          border: `1px solid ${active ? activeColor + '44' : C.borderGold}`,
          padding: '1px 6px',
          borderRadius: '2px',
          fontWeight: 700,
          transition: 'all 0.2s',
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

export default function MyList({ onNavigate }) {
  const [dramas, setDramas]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [searchQuery, setSearch]  = useState('')
  const [focused, setFocused]     = useState(false)
  const [sortKeys, setSortKeys]   = useState([{ key: 'title', dir: 'asc' }])

  useEffect(() => {
    axios.get(API)
      .then(r => setDramas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const map = { All: dramas.length }
    STATUS_TABS.slice(1).forEach(s => {
      map[s] = dramas.filter(d => d.status === s).length
    })
    return map
  }, [dramas])

  const handleSort = (key) => {
    setSortKeys(prev => {
      const idx = prev.findIndex(s => s.key === key)
      if (idx === -1) return [...prev, { key, dir: 'asc' }]
      if (prev[idx].dir === 'asc') return prev.map((s, i) => i === idx ? { ...s, dir: 'desc' } : s)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const filtered = useMemo(() => {
    let list = dramas

    if (activeTab !== 'All') {
      list = list.filter(d => d.status === activeTab)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(d => d.title?.toLowerCase().includes(q))
    }

    if (sortKeys.length > 0) {
      list = [...list].sort((a, b) => {
        for (const { key, dir } of sortKeys) {
          let aVal, bVal
          if (key === 'country') {
            aVal = getCountry(a); bVal = getCountry(b)
          } else if (key === 'rating') {
            aVal = a.rating ?? -1; bVal = b.rating ?? -1
          } else if (key === 'createdAt') {
            aVal = new Date(a.createdAt).getTime(); bVal = new Date(b.createdAt).getTime()
          } else if (key === 'year') {
            aVal = a.year ?? 0; bVal = b.year ?? 0
          } else {
            aVal = (a[key] || '').toString().toLowerCase()
            bVal = (b[key] || '').toString().toLowerCase()
          }
          if (aVal < bVal) return dir === 'asc' ? -1 : 1
          if (aVal > bVal) return dir === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return list
  }, [dramas, activeTab, searchQuery, sortKeys])

  return (
    <div>
      {/* ── Tabs + search row ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {STATUS_TABS.map(tab => (
            <StatusTab
              key={tab}
              label={tab}
              count={counts[tab] || 0}
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            />
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{
            position: 'absolute', left: '12px',
            color: focused ? C.electric : C.textDim,
            fontSize: '14px', pointerEvents: 'none', transition: 'color 0.2s',
          }}>⌕</span>
          <input
            placeholder="Filter by title..."
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              paddingLeft: '34px', paddingRight: '28px',
              height: '38px', width: focused ? '220px' : '170px',
              background: C.input,
              border: `1px solid ${focused ? C.electric + '88' : C.borderGold}`,
              color: C.text, fontSize: '12px',
              fontFamily: '"Cinzel", serif', letterSpacing: '0.05em',
              outline: 'none', transition: 'all 0.3s ease',
              boxShadow: focused ? `0 0 16px ${C.electricSoft}` : 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: '10px',
                background: 'none', border: 'none',
                color: C.textDim, cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.textDim}
            >×</button>
          )}
        </div>
      </div>

      {/* ── Sort indicators + count ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '10px 0 0',
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {sortKeys.length > 0 && (
            <>
              <span style={{
                fontSize: '10px', color: C.textDim,
                fontFamily: '"Cinzel", serif', letterSpacing: '0.2em',
              }}>SORTED BY</span>
              {sortKeys.map((s, i) => (
                <span key={s.key} style={{
                  fontSize: '10px', color: C.electric,
                  fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
                  padding: '2px 8px',
                  border: `1px solid ${C.electric}44`,
                  background: C.electricSoft,
                  display: 'flex', gap: '4px', alignItems: 'center',
                }}>
                  {i + 1}. {COLUMNS.find(c => c.key === s.key)?.label} {s.dir === 'asc' ? '↑' : '↓'}
                  <button
                    onClick={() => setSortKeys(prev => prev.filter((_, idx) => idx !== i))}
                    style={{
                      background: 'none', border: 'none', color: C.textDim,
                      cursor: 'pointer', fontSize: '11px', padding: '0 0 0 2px', lineHeight: 1,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = C.red}
                    onMouseLeave={e => e.currentTarget.style.color = C.textDim}
                  >×</button>
                </span>
              ))}
              {sortKeys.length > 1 && (
                <button
                  onClick={() => setSortKeys([{ key: 'title', dir: 'asc' }])}
                  style={{
                    fontSize: '9px', letterSpacing: '0.15em',
                    color: C.textDim, background: 'transparent',
                    border: `1px solid ${C.borderGold}`,
                    padding: '2px 8px', cursor: 'pointer',
                    fontFamily: '"Cinzel", serif', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = C.red + '55' }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.borderGold }}
                >RESET</button>
              )}
            </>
          )}
        </div>
        <span style={{
          fontSize: '11px', color: C.textDim,
          fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
        }}>
          <span style={{ color: C.electric }}>{filtered.length}</span> entr{filtered.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Divider */}
      <div style={{
        height: '1px', margin: '12px 0 0',
        background: `linear-gradient(to right, ${C.ember}88, ${C.electric}44, transparent)`,
      }} />

      {/* ── Table ── */}
      {loading ? (
        <div style={{
          padding: '64px', textAlign: 'center',
          fontFamily: '"Cinzel", serif', fontSize: '12px',
          letterSpacing: '0.3em', color: C.textDim,
        }}>
          Loading the realm...
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.bg})` }}>
                {COLUMNS.map(col => (
                  <HeaderCell key={col.key} col={col} sortKeys={sortKeys} onSort={handleSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <EmptyState status={activeTab} searchQuery={searchQuery} />
                : filtered.map((drama, i) => (
                    <DramaRow
                      key={drama._id}
                      drama={drama}
                      index={i}
                      onNavigate={onNavigate}
                    />
                  ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}