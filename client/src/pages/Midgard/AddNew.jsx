import { useState, useRef } from 'react'
import axios from 'axios'
import { searchDramas, detectDramaType } from '../../utils/tmdbSearch'


const API = 'http://localhost:5000/api/drama'
const TMDB_KEY = import.meta.env.VITE_TMDB_KEY

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
  success:      '#22C55E',
  danger:       '#EF4444',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderGold:   'rgba(202,138,4,0.2)',
  borderElec:   'rgba(56,189,248,0.2)',
}

// ── Reusable corner ornaments ─────────────────────────────────────────────────
function Corners({ color = C.goldBright, size = 12, opacity = 0.5 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 8, left: 8, borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 8, right: 8, borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 8, left: 8, borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 8, right: 8, borderBottom: b, borderRight: b }} />
    </>
  )
}

// ── Styled input ──────────────────────────────────────────────────────────────
function Field({ label, rune, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{
        fontSize: '10px',
        letterSpacing: '0.3em',
        color: C.textMuted,
        textTransform: 'uppercase',
        fontFamily: '"Cinzel", serif',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        {rune && <span style={{ color: C.gold + '88', fontSize: '13px' }}>{rune}</span>}
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  background: C.input,
  border: `1px solid ${C.borderGold}`,
  color: C.text,
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.25s, box-shadow 0.25s',
}

function StyledInput({ style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        ...inputStyle,
        borderColor: focused ? C.electric + '88' : C.borderGold,
        boxShadow: focused ? `0 0 16px ${C.electricSoft}` : 'none',
        ...style,
      }}
    />
  )
}

function StyledSelect({ children, style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      {...props}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        borderColor: focused ? C.electric + '88' : C.borderGold,
        boxShadow: focused ? `0 0 16px ${C.electricSoft}` : 'none',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </select>
  )
}

function StyledTextarea({ style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      {...props}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        borderColor: focused ? C.electric + '88' : C.borderGold,
        boxShadow: focused ? `0 0 16px ${C.electricSoft}` : 'none',
        resize: 'vertical',
        minHeight: '90px',
        ...style,
      }}
    />
  )
}


async function fetchTMDBDetails(id) {
  const url = `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}`
  const res = await fetch(url)
  return res.json()
}

const searchTMDB = searchDramas

function detectType(item) {
  return detectDramaType(item)
}

// ── Search step ───────────────────────────────────────────────────────────────
function SearchStep({ onSelect, onSkip }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [hoveredId, setHoveredId] = useState(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await searchTMDB(query)
      setResults(res.slice(0, 12))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (item) => {
  let details = item
  try { details = await fetchTMDBDetails(item.id) } catch {}
  const genres = (details.genres || []).map(g => g.name)
  const cover = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : ''
  onSelect({
    tmdbId:        item.id,        // ← ADD THIS LINE
    title:         item.name || item.original_name || '',
    coverImage:    cover,
    year:          item.first_air_date ? parseInt(item.first_air_date.split('-')[0]) : null,
    genres,
    type:          detectType(item),
    episodes:      { current: 0, total: details.number_of_episodes || null },
    status:        'Plan to Watch',
    format:        details.number_of_seasons > 1 ? 'Series' : 'Series',
    rating:        null,
    review:        '',
    rewatchCount:  0,
    dateStarted:   null,
    dateCompleted: null,
    platforms:     [],
    customTags:    [],
  })
}

  return (
    <div>
      {/* Search bar */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '32px',
        position: 'relative',
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <StyledInput
            placeholder="Search for a drama title..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ paddingLeft: '44px', fontSize: '15px', padding: '14px 14px 14px 44px' }}
          />
          <span style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            color: C.textDim, fontSize: '16px',
          }}>⌕</span>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '11px', letterSpacing: '0.2em',
            color: C.electric,
            background: C.electricSoft,
            border: `1px solid ${C.electric}55`,
            padding: '0 28px',
            cursor: 'pointer',
            transition: 'all 0.25s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = C.electricSoft}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button
          onClick={onSkip}
          style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '11px', letterSpacing: '0.2em',
            color: C.textDim,
            background: 'transparent',
            border: `1px solid ${C.borderGold}`,
            padding: '0 20px',
            cursor: 'pointer',
            transition: 'all 0.25s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.goldBright; e.currentTarget.style.borderColor = C.gold + '88' }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.borderGold }}
        >
          Skip → Manual
        </button>
      </div>

      {/* Results */}
      {searched && !loading && results.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px',
          color: C.textDim, fontSize: '14px',
          border: `1px dashed ${C.borderGold}`,
          position: 'relative',
        }}>
          <Corners color={C.gold} size={10} opacity={0.3} />
          <div style={{ fontFamily: '"Cinzel", serif', marginBottom: '8px', letterSpacing: '0.2em' }}>No results found</div>
          <button
            onClick={onSkip}
            style={{
              marginTop: '12px', fontFamily: '"Cinzel", serif',
              fontSize: '11px', letterSpacing: '0.2em',
              color: C.electric, background: 'transparent',
              border: `1px solid ${C.electric}44`,
              padding: '8px 20px', cursor: 'pointer',
            }}
          >
            Add Manually →
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '14px',
        }}>
          {results.map(item => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                cursor: 'pointer',
                transform: hoveredId === item.id ? 'translateY(-6px)' : 'translateY(0)',
                transition: 'transform 0.25s ease',
              }}
            >
              {/* Poster */}
              <div style={{
                height: '180px',
                background: C.surface,
                border: `1px solid ${hoveredId === item.id ? C.electric + '88' : C.borderGold}`,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: hoveredId === item.id ? `0 8px 28px ${C.electricSoft}` : 'none',
                transition: 'all 0.25s',
              }}>
                {item.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.textDim, fontSize: '28px',
                    background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
                  }}>📺</div>
                )}

                {/* Origin badge */}
                {item.origin_country?.[0] && (
                  <div style={{
                    position: 'absolute', top: '6px', left: '6px',
                    padding: '2px 7px',
                    background: 'rgba(8,13,26,0.9)',
                    border: `1px solid ${C.gold}55`,
                    fontSize: '9px', letterSpacing: '0.1em',
                    color: C.gold,
                    fontFamily: '"Cinzel", serif',
                  }}>
                    {detectType(item)}
                  </div>
                )}

                {/* Hover overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(to top, ${C.electric}22, transparent)`,
                  opacity: hoveredId === item.id ? 1 : 0,
                  transition: 'opacity 0.25s',
                }} />
              </div>

              {/* Title */}
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: hoveredId === item.id ? C.text : C.textMuted,
                fontWeight: 600,
                lineHeight: 1.3,
                transition: 'color 0.25s',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {item.name || item.original_name}
              </div>
              {item.first_air_date && (
                <div style={{ fontSize: '11px', color: C.textDim, marginTop: '3px' }}>
                  {item.first_air_date.split('-')[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Form step ─────────────────────────────────────────────────────────────────
function FormStep({ initial, onSave, onBack }) {
  const [form, setForm] = useState(initial)
  const [coverOverride, setCoverOverride] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [genreInput, setGenreInput] = useState((initial.genres || []).join(', '))
  const [tagInput, setTagInput]   = useState((initial.customTags || []).join(', '))
  const [platformName, setPlatformName] = useState('')
  const [platformUrl, setPlatformUrl]   = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setEp = (key, val) => setForm(f => ({ ...f, episodes: { ...f.episodes, [key]: val === '' ? null : Number(val) } }))

  const coverSrc = coverOverride || form.coverImage

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        coverImage: coverSrc,
        genres:     genreInput.split(',').map(g => g.trim()).filter(Boolean),
        customTags: tagInput.split(',').map(t => t.trim()).filter(Boolean),
        rating:     form.rating ? Number(form.rating) : null,
        year:       form.year ? Number(form.year) : null,
        dateStarted:   form.dateStarted || null,
        dateCompleted: form.dateCompleted || null,
      }
      await axios.post(API, payload)
      setSaved(true)
      setTimeout(() => onSave(), 1200)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const addPlatform = () => {
    if (!platformName.trim()) return
    set('platforms', [...(form.platforms || []), { name: platformName.trim(), url: platformUrl.trim() }])
    setPlatformName('')
    setPlatformUrl('')
  }

  const removePlatform = (i) => set('platforms', form.platforms.filter((_, idx) => idx !== i))

  return (
    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>

      {/* Left — cover preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
        <div style={{
          width: '180px', height: '260px',
          background: C.surface,
          border: `1px solid ${C.borderGold}`,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <Corners color={C.gold} size={12} opacity={0.5} />
          {coverSrc ? (
            <img src={coverSrc} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: C.textDim, gap: '8px',
              background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
            }}>
              <div style={{ fontSize: '32px' }}>📺</div>
              <div style={{ fontSize: '10px', letterSpacing: '0.1em', fontFamily: '"Cinzel", serif' }}>No Cover</div>
            </div>
          )}
        </div>

        {/* Cover override */}
        <Field label="Override Cover URL" rune="ᛈ">
          <StyledInput
            placeholder="Paste image URL..."
            value={coverOverride}
            onChange={e => setCoverOverride(e.target.value)}
            style={{ fontSize: '12px', width: '180px', boxSizing: 'border-box' }}
          />
        </Field>

        {/* Back */}
        <button
          onClick={onBack}
          style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '11px', letterSpacing: '0.2em',
            color: C.textDim, background: 'transparent',
            border: `1px solid ${C.borderGold}`,
            padding: '10px', cursor: 'pointer',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.goldBright; e.currentTarget.style.borderColor = C.gold + '88' }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.borderGold }}
        >
          ← Back to Search
        </button>
      </div>

      {/* Right — form fields */}
      <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Row 1: Title */}
        <Field label="Title" rune="ᛏ">
          <StyledInput value={form.title} onChange={e => set('title', e.target.value)} placeholder="Drama title" />
        </Field>

        {/* Row 2: Type / Format / Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <Field label="Type" rune="ᚦ">
            <StyledSelect value={form.type} onChange={e => set('type', e.target.value)}>
              <option>Kdrama</option>
              <option>Cdrama</option>
              <option>Jdrama</option>
            </StyledSelect>
          </Field>
          <Field label="Format" rune="ᚠ">
            <StyledSelect value={form.format} onChange={e => set('format', e.target.value)}>
              <option>Series</option>
              <option>Movie</option>
              <option>Special</option>
            </StyledSelect>
          </Field>
          <Field label="Status" rune="ᛊ">
            <StyledSelect value={form.status} onChange={e => set('status', e.target.value)}>
              <option>Watching</option>
              <option>Completed</option>
              <option>Dropped</option>
              <option>Plan to Watch</option>
              <option>On Hold</option>
            </StyledSelect>
          </Field>
        </div>

        {/* Row 3: Episodes + Year + Rating */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
          <Field label="Ep Current" rune="ᚹ">
            <StyledInput type="number" min="0" value={form.episodes?.current ?? ''} onChange={e => setEp('current', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Ep Total" rune="ᚹ">
            <StyledInput type="number" min="0" value={form.episodes?.total ?? ''} onChange={e => setEp('total', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Year" rune="ᚢ">
            <StyledInput type="number" value={form.year ?? ''} onChange={e => set('year', e.target.value)} placeholder="2024" />
          </Field>
          <Field label="Rating" rune="★">
            <StyledInput type="number" min="1" max="10" value={form.rating ?? ''} onChange={e => set('rating', e.target.value)} placeholder="1–10" />
          </Field>
        </div>

        {/* Row 4: Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <Field label="Date Started" rune="ᛞ">
            <StyledInput type="date" value={form.dateStarted?.split('T')[0] ?? ''} onChange={e => set('dateStarted', e.target.value)} />
          </Field>
          <Field label="Date Completed" rune="ᛞ">
            <StyledInput type="date" value={form.dateCompleted?.split('T')[0] ?? ''} onChange={e => set('dateCompleted', e.target.value)} />
          </Field>
        </div>

        {/* Row 5: Genres + Tags */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <Field label="Genres (comma separated)" rune="ᚷ">
            <StyledInput value={genreInput} onChange={e => setGenreInput(e.target.value)} placeholder="Romance, Thriller..." />
          </Field>
          <Field label="Custom Tags" rune="ᚱ">
            <StyledInput value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Favourites, Rewatching..." />
          </Field>
        </div>

        {/* Row 6: Rewatch count */}
        <Field label="Rewatch Count" rune="ᚲ">
          <StyledInput
            type="number" min="0"
            vvalue={form.rewatchCount || ''}
            onChange={e => set('rewatchCount', Number(e.target.value))}
            style={{ maxWidth: '120px' }}
          />
        </Field>

        {/* Row 7: Platforms */}
        <Field label="Where to Watch" rune="ᛚ">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Existing platforms */}
            {(form.platforms || []).map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px',
                background: C.input,
                border: `1px solid ${C.borderGold}`,
              }}>
                <span style={{ flex: 1, fontSize: '13px', color: C.text }}>{p.name}</span>
                {p.url && <span style={{ fontSize: '11px', color: C.textDim, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>}
                <button onClick={() => removePlatform(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
              </div>
            ))}
            {/* Add platform */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <StyledInput
                placeholder="Platform name"
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                style={{ flex: 1 }}
              />
              <StyledInput
                placeholder="URL (optional)"
                value={platformUrl}
                onChange={e => setPlatformUrl(e.target.value)}
                style={{ flex: 2 }}
              />
              <button
                onClick={addPlatform}
                style={{
                  fontFamily: '"Cinzel", serif',
                  fontSize: '11px', letterSpacing: '0.1em',
                  color: C.electric, background: C.electricSoft,
                  border: `1px solid ${C.electric}44`,
                  padding: '0 16px', cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all 0.2s',
                }}
              >
                + Add
              </button>
            </div>
          </div>
        </Field>

        {/* Row 8: Review */}
        <Field label="Review / Notes" rune="ᚾ">
          <StyledTextarea
            value={form.review}
            onChange={e => set('review', e.target.value)}
            placeholder="Your thoughts on this drama..."
          />
        </Field>

        {/* Save button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{
              fontFamily: '"Cinzel", serif',
              fontSize: '13px', letterSpacing: '0.25em',
              color: saved ? C.success : C.electric,
              background: saved ? 'rgba(34,197,94,0.1)' : C.electricSoft,
              border: `1px solid ${saved ? C.success + '55' : C.electric + '55'}`,
              padding: '14px 40px',
              cursor: saving ? 'wait' : 'pointer',
              transition: 'all 0.3s',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => { if (!saved) e.currentTarget.style.background = 'rgba(56,189,248,0.18)' }}
            onMouseLeave={e => { if (!saved) e.currentTarget.style.background = C.electricSoft }}
          >
            {saved ? '✓ SAVED' : saving ? 'Saving...' : 'SAVE TO MIDGARD'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add New main ──────────────────────────────────────────────────────────────
const EMPTY = {
  tmdbId: null,
  title: '', coverImage: '', status: 'Plan to Watch',
  type: 'Kdrama', format: 'Series', rating: null,
  episodes: { current: 0, total: null },
  year: null, genres: [], review: '', rewatchCount: 0,
  dateStarted: null, dateCompleted: null,
  platforms: [], customTags: [],
}

export default function AddNew({ onSaved }) {
  const [step, setStep] = useState('search') // 'search' | 'form'
  const [formData, setFormData] = useState(EMPTY)

  const handleSelect = (data) => {
    setFormData(data)
    setStep('form')
  }

  const handleSkip = () => {
    setFormData(EMPTY)
    setStep('form')
  }

  const handleSave = () => {
    setStep('search')
    setFormData(EMPTY)
    onSaved?.()
  }

  return (
    <div>
      {/* Step indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '32px',
      }}>
        {['Search', 'Details'].map((s, i) => {
          const active = (i === 0 && step === 'search') || (i === 1 && step === 'form')
          const done   = i === 0 && step === 'form'
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <div style={{
                  width: '24px', height: '24px',
                  border: `1px solid ${active ? C.electric : done ? C.success : C.borderGold}`,
                  background: active ? C.electricSoft : done ? 'rgba(34,197,94,0.1)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px',
                  color: active ? C.electric : done ? C.success : C.textDim,
                  fontFamily: '"Cinzel", serif',
                  transition: 'all 0.3s',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: '11px', letterSpacing: '0.2em',
                  color: active ? C.text : C.textDim,
                  fontFamily: '"Cinzel", serif',
                  textTransform: 'uppercase',
                  transition: 'color 0.3s',
                }}>
                  {s}
                </span>
              </div>
              {i < 1 && (
                <div style={{ width: '40px', height: '1px', background: done ? C.success + '55' : C.borderGold }} />
              )}
            </div>
          )
        })}
      </div>

      {step === 'search' && (
        <SearchStep onSelect={handleSelect} onSkip={handleSkip} />
      )}
      {step === 'form' && (
        <FormStep initial={formData} onSave={handleSave} onBack={() => setStep('search')} />
      )}
    </div>
  )
}