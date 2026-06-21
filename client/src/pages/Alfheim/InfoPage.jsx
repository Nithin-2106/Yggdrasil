import { useState, useEffect } from 'react'
import axios from 'axios'

const JIKAN = 'https://api.jikan.moe/v4'
const API   = 'http://localhost:5000/api/anime'

const C = {
  bg:           '#050C10',
  surface:      '#0A1A20',
  surfaceHover: '#0E2228',
  input:        '#071318',
  primary:      '#5EEAD4',
  primarySoft:  'rgba(94,234,212,0.12)',
  aurora:       '#C084FC',
  auroraSoft:   'rgba(192,132,252,0.15)',
  crystal:      '#67E8F9',
  crystalSoft:  'rgba(103,232,249,0.12)',
  green:        '#34D399',
  greenSoft:    'rgba(52,211,153,0.12)',
  gold:         '#A3E635',
  goldSoft:     'rgba(163,230,53,0.15)',
  red:          '#F87171',
  redSoft:      'rgba(248,113,113,0.12)',
  text:         '#E0F7F4',
  textMuted:    '#7ABFB8',
  textDim:      '#2E5A56',
  borderPrimary:'rgba(94,234,212,0.2)',
  borderAurora: 'rgba(192,132,252,0.18)',
}

const STATUS_CONFIG = {
  'Watching':      { color: '#5EEAD4', icon: '▶', rune: 'ᚹ' },
  'Completed':     { color: '#34D399', icon: '✓', rune: 'ᚲ' },
  'Dropped':       { color: '#F87171', icon: '✕', rune: 'ᛞ' },
  'Plan to Watch': { color: '#C084FC', icon: '◷', rune: 'ᛈ' },
  'On Hold':       { color: '#A3E635', icon: '⏸', rune: 'ᛟ' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatColor(format) {
  if (format === 'Movie')   return C.gold
  if (format === 'OVA')     return C.aurora
  if (format === 'Special') return C.green
  return C.primary
}

function detectFormat(data) {
  const t = (data?.type || '').toLowerCase()
  if (t === 'movie')                    return 'Movie'
  if (t === 'ova')                      return 'OVA'
  if (t === 'special' || t === 'ona')   return 'Special'
  return 'Series'
}

function getYear(data) {
  if (data?.year) return data.year
  if (data?.aired?.from) return new Date(data.aired.from).getFullYear()
  return null
}

// Parse "24 min per ep" or "1 hr 45 min" → short label
function parseRuntime(str) {
  if (!str) return null
  // already short like "24 min"
  if (str.length < 12) return str
  const perEp = str.match(/^(\d+)\s*min/)
  if (perEp) return `${perEp[1]}m/ep`
  return str
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Corners({ color = C.primary, size = 12, opacity = 0.5 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 8,    left: 8,    borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 8,    right: 8,   borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 8, left: 8,    borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 8, right: 8,   borderBottom: b, borderRight: b }} />
    </>
  )
}

function SectionDivider({ title, rune, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
      {rune && (
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '18px', color: C.gold }}>
          {rune}
        </span>
      )}
      <h3 style={{
        fontFamily: '"Cinzel", serif', fontSize: '13px', fontWeight: 700,
        letterSpacing: '0.35em', color: C.gold, margin: 0, textTransform: 'uppercase',
      }}>
        {title}
      </h3>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(163,230,53,0.4), transparent)' }} />
      {right && (
        <span style={{ fontSize: '11px', color: C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>
          {right}
        </span>
      )}
    </div>
  )
}

// ── Skeleton loading ──────────────────────────────────────────────────────────
function SkeletonBlock({ w = '100%', h = '16px', style = {} }) {
  return (
    <div style={{
      width: w, height: h,
      background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      borderRadius: '2px',
      ...style,
    }} />
  )
}

function Spinner() {
  return (
    <div style={{ padding: '0 0 60px' }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
      <SkeletonBlock w="120px" h="14px" style={{ marginBottom: '36px' }} />
      <div style={{ display: 'flex', gap: '52px', flexWrap: 'wrap', marginBottom: '60px' }}>
        <SkeletonBlock w="230px" h="335px" style={{ flexShrink: 0, marginLeft: '4%' }} />
        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <SkeletonBlock w="80px" h="26px" />
            <SkeletonBlock w="80px" h="26px" />
          </div>
          <SkeletonBlock w="70%" h="44px" />
          <SkeletonBlock w="40%" h="20px" />
          <div style={{ display: 'flex', gap: '36px' }}>
            <SkeletonBlock w="80px" h="60px" />
            <SkeletonBlock w="80px" h="60px" />
          </div>
          <div style={{ display: 'flex', gap: '28px' }}>
            <SkeletonBlock w="70px" h="40px" />
            <SkeletonBlock w="70px" h="40px" />
            <SkeletonBlock w="70px" h="40px" />
          </div>
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
            {[90, 70, 110, 80].map((w, i) => <SkeletonBlock key={i} w={`${w}px`} h="26px" />)}
          </div>
        </div>
      </div>
      <SkeletonBlock w="160px" h="14px" style={{ marginBottom: '16px' }} />
      <SkeletonBlock w="100%" h="90px" style={{ marginBottom: '56px' }} />
      <SkeletonBlock w="130px" h="14px" style={{ marginBottom: '16px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px', marginBottom: '56px' }}>
        {Array(6).fill(0).map((_, i) => <SkeletonBlock key={i} h="64px" />)}
      </div>
      <SkeletonBlock w="100px" h="14px" style={{ marginBottom: '16px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px 12px' }}>
        {Array(12).fill(0).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <SkeletonBlock w="100px" h="134px" />
            <SkeletonBlock w="80%" h="12px" />
            <SkeletonBlock w="60%" h="10px" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Rating slider ─────────────────────────────────────────────────────────────
function RatingSlider({ value, onChange }) {
  const [hovered, setHovered] = useState(null)
  const steps = []
  for (let i = 1; i <= 10; i += 0.5) steps.push(i)

  const display = hovered !== null ? hovered : value

  const ratingColor = (r) => {
    if (!r) return C.textDim
    if (r >= 8) return C.green
    if (r >= 6) return C.gold
    if (r >= 4) return C.aurora
    return C.red
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
        <span style={{
          fontFamily: '"Cinzel", serif', fontSize: '42px', fontWeight: 700,
          color: ratingColor(display), lineHeight: 1, transition: 'all 0.15s',
        }}>
          {display || '—'}
        </span>
        <span style={{ fontSize: '13px', color: C.textDim, fontFamily: '"Cinzel", serif' }}>/10</span>
      </div>
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {steps.map(step => {
          const isActive = value && step <= value
          const isHov    = hovered !== null && step <= hovered
          const col      = ratingColor(step)
          return (
            <button
              key={step}
              onClick={() => onChange(value === step ? null : step)}
              onMouseEnter={() => setHovered(step)}
              onMouseLeave={() => setHovered(null)}
              title={step.toString()}
              style={{
                width: step % 1 === 0 ? '26px' : '13px', height: '26px',
                background: (isHov || isActive) ? col : C.surface,
                border: `1px solid ${(isHov || isActive) ? col : C.borderPrimary}`,
                cursor: 'pointer', transition: 'all 0.1s', position: 'relative',
              }}
            >
              {step % 1 === 0 && (
                <span style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontFamily: '"Cinzel", serif',
                  color: (isHov || isActive) ? C.bg : C.textDim, fontWeight: 700,
                }}>{step}</span>
              )}
            </button>
          )
        })}
      </div>
      {value && (
        <button
          onClick={() => onChange(null)}
          style={{
            marginTop: '8px', fontSize: '10px', letterSpacing: '0.15em',
            color: C.textDim, background: 'transparent', border: 'none',
            cursor: 'pointer', fontFamily: '"Cinzel", serif', padding: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.red}
          onMouseLeave={e => e.currentTarget.style.color = C.textDim}
        >× Clear rating</button>
      )}
    </div>
  )
}

// ── Add to My List modal ──────────────────────────────────────────────────────
function AddToListModal({ animeData, existingEntry, onClose, onSaved, onDeleted }) {
  const format = detectFormat(animeData)
  const year   = getYear(animeData)
  const cover  = animeData.images?.jpg?.large_image_url || animeData.images?.jpg?.image_url || ''

  const buildDefault = () => ({
    malId:        animeData.mal_id,
    title:        animeData.title_english || animeData.title || '',
    coverImage:   cover,
    status:       'Plan to Watch',
    format,
    rating:       null,
    episodes:     { current: 0, total: animeData.episodes || null },
    year:         year,
    genres:       (animeData.genres || []).map(g => g.name),
    review:       '',
    rewatchCount: 0,
    dateStarted:   null,
    dateCompleted: null,
    platforms:    [],
    customTags:   [],
  })

  const [form, setForm]           = useState(existingEntry || buildDefault())
  const [coverOverride, setCover] = useState('')
  const [platName, setPlatName]   = useState('')
  const [platUrl, setPlatUrl]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [error, setError]         = useState('')
  const [focusedField, setFocused] = useState('')

  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setEp = (k, v) => setForm(f => ({ ...f, episodes: { ...f.episodes, [k]: v === '' ? null : Number(v) } }))
  const coverSrc = coverOverride || form.coverImage

  const addPlat = () => {
    if (!platName.trim()) return
    set('platforms', [...(form.platforms || []), { name: platName.trim(), url: platUrl.trim() }])
    setPlatName(''); setPlatUrl('')
  }
  const removePlat = (i) => set('platforms', form.platforms.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    setError(''); setSaving(true)
    try {
      const payload = { ...form, coverImage: coverSrc, rating: form.rating ? Number(form.rating) : null }
      if (existingEntry?._id) {
        await axios.put(`${API}/${existingEntry._id}`, payload)
      } else {
        await axios.post(API, payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingEntry?._id) return
    setDeleting(true)
    try {
      await axios.delete(`${API}/${existingEntry._id}`)
      onDeleted()
    } catch {
      setError('Delete failed')
      setDeleting(false)
    }
  }

  const inputStyle = (field) => ({
    width: '100%', padding: '9px 12px',
    background: C.input,
    border: `1px solid ${focusedField === field ? C.primary + '99' : C.borderPrimary}`,
    color: C.text, fontSize: '13px', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focusedField === field ? `0 0 12px rgba(94,234,212,0.1)` : 'none',
    MozAppearance: 'textfield',
  })

  const lbl = {
    fontSize: '10px', letterSpacing: '0.25em', color: C.textMuted,
    textTransform: 'uppercase', fontFamily: '"Cinzel", serif',
    marginBottom: '6px', display: 'block',
  }

  return (
    <>
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .modal-scroll::-webkit-scrollbar { display: none; }
        .modal-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(4,8,16,0.88)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', paddingTop: '80px',
        }}
      >
        <div style={{
          background: C.surface, border: `1px solid ${C.borderPrimary}`,
          width: '100%', maxWidth: '720px',
          maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
          position: 'relative', boxShadow: '0 0 80px rgba(0,0,0,0.8)',
        }} className="modal-scroll">
          <Corners color={C.primary} size={12} opacity={0.4} />

          {/* Header */}
          <div style={{
            padding: '20px 28px 16px', borderBottom: `1px solid ${C.borderPrimary}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, background: C.surface, zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: '"Cinzel", serif', fontSize: '14px', color: C.primary }}>ᚨ</span>
              <span style={{
                fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.3em',
                color: C.primary, textTransform: 'uppercase', fontWeight: 700,
              }}>
                {existingEntry ? 'Edit Entry' : 'Add to My List'}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: C.textDim, fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.textDim}
            >×</button>
          </div>

          {/* Body */}
          <div style={{ padding: '28px', display: 'flex', gap: '28px', flexWrap: 'wrap' }}>

            {/* Left — poster */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ maxWidth: '160px' }}>
                <div style={{
                  fontFamily: '"Cinzel", serif', fontSize: '13px', fontWeight: 700,
                  color: C.text, letterSpacing: '0.05em', lineHeight: 1.4,
                }}>
                  {animeData.title_english || animeData.title}
                </div>
                {year && (
                  <div style={{ fontSize: '11px', color: C.primary, fontFamily: '"Cinzel", serif', marginTop: '4px', letterSpacing: '0.1em' }}>
                    {year}
                  </div>
                )}
              </div>
              <div style={{
                width: '160px', height: '230px', background: C.bg,
                border: `1px solid ${C.borderPrimary}`, overflow: 'hidden', position: 'relative', flexShrink: 0,
              }}>
                <Corners color={C.primary} size={10} opacity={0.35} />
                {coverSrc
                  ? <img src={coverSrc} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px' }}>✦</div>
                }
              </div>
              <div>
                <label style={lbl}>ᛈ Cover URL</label>
                <input
                  placeholder="Paste image URL..."
                  value={coverOverride}
                  onChange={e => setCover(e.target.value)}
                  onFocus={() => setFocused('cover')}
                  onBlur={() => setFocused('')}
                  style={{ ...inputStyle('cover'), width: '160px', fontSize: '11px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Right — fields */}
            <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              <div>
                <label style={lbl}>ᛊ Status</label>
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  onFocus={() => setFocused('status')}
                  onBlur={() => setFocused('')}
                  style={{ ...inputStyle('status'), cursor: 'pointer' }}
                >
                  <option>Watching</option>
                  <option>Completed</option>
                  <option>Dropped</option>
                  <option>Plan to Watch</option>
                  <option>On Hold</option>
                </select>
              </div>

              <div>
                <label style={lbl}>ᚹ Episodes & Rewatch</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number" min="0" placeholder="Current"
                    value={form.episodes?.current ?? ''}
                    onChange={e => setEp('current', e.target.value)}
                    onFocus={() => setFocused('epCurrent')}
                    onBlur={() => setFocused('')}
                    style={{ ...inputStyle('epCurrent'), width: '72px', flexShrink: 0 }}
                  />
                  <span style={{ color: C.textDim, fontSize: '14px', flexShrink: 0 }}>/</span>
                  <input
                    type="number" min="0" placeholder="Total"
                    value={form.episodes?.total ?? ''}
                    onChange={e => setEp('total', e.target.value)}
                    onFocus={() => setFocused('epTotal')}
                    onBlur={() => setFocused('')}
                    style={{ ...inputStyle('epTotal'), width: '72px', flexShrink: 0 }}
                  />
                  <span style={{ color: C.textDim, fontSize: '11px', letterSpacing: '0.15em', fontFamily: '"Cinzel", serif', flexShrink: 0, marginLeft: '6px' }}>ᚲ</span>
                  <input
                    type="number" min="0" placeholder="Rewatch"
                    value={form.rewatchCount || ''}
                    onChange={e => set('rewatchCount', e.target.value === '' ? 0 : Number(e.target.value))}
                    onFocus={() => setFocused('rewatch')}
                    onBlur={() => setFocused('')}
                    style={{ ...inputStyle('rewatch'), width: '80px', flexShrink: 0 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>ᛞ Date Started</label>
                  <input
                    type="date"
                    value={form.dateStarted?.split('T')[0] ?? ''}
                    onChange={e => set('dateStarted', e.target.value)}
                    onFocus={() => setFocused('dateStart')}
                    onBlur={() => setFocused('')}
                    style={inputStyle('dateStart')}
                  />
                </div>
                <div>
                  <label style={lbl}>ᛞ Date Completed</label>
                  <input
                    type="date"
                    value={form.dateCompleted?.split('T')[0] ?? ''}
                    onChange={e => set('dateCompleted', e.target.value)}
                    onFocus={() => setFocused('dateEnd')}
                    onBlur={() => setFocused('')}
                    style={inputStyle('dateEnd')}
                  />
                </div>
              </div>

              <div>
                <label style={lbl}>★ My Rating</label>
                <RatingSlider value={form.rating} onChange={v => set('rating', v)} />
              </div>

              <div>
                <label style={lbl}>ᛚ Where to Watch</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(form.platforms || []).map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 10px', background: C.input, border: `1px solid ${C.borderPrimary}`,
                    }}>
                      <span style={{ flex: 1, fontSize: '12px', color: C.text }}>{p.name}</span>
                      {p.url && <span style={{ fontSize: '10px', color: C.textDim, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>}
                      <button onClick={() => removePlat(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>×</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      placeholder="Platform"
                      value={platName}
                      onChange={e => setPlatName(e.target.value)}
                      onFocus={() => setFocused('platName')}
                      onBlur={() => setFocused('')}
                      style={{ ...inputStyle('platName'), flex: 1 }}
                    />
                    <input
                      placeholder="URL (optional)"
                      value={platUrl}
                      onChange={e => setPlatUrl(e.target.value)}
                      onFocus={() => setFocused('platUrl')}
                      onBlur={() => setFocused('')}
                      style={{ ...inputStyle('platUrl'), flex: 2 }}
                    />
                    <button
                      onClick={addPlat}
                      style={{
                        fontFamily: '"Cinzel", serif', fontSize: '11px', color: C.primary,
                        background: C.primarySoft, border: `1px solid ${C.primary}44`,
                        padding: '0 12px', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >+ Add</button>
                  </div>
                </div>
              </div>

              <div>
                <label style={lbl}>ᚾ Review / Notes</label>
                <textarea
                  value={form.review}
                  onChange={e => set('review', e.target.value)}
                  onFocus={() => setFocused('review')}
                  onBlur={() => setFocused('')}
                  placeholder="Your thoughts on this anime..."
                  style={{ ...inputStyle('review'), resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              {error && <div style={{ fontSize: '12px', color: C.red, letterSpacing: '0.05em' }}>{error}</div>}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 28px 24px', borderTop: `1px solid ${C.borderPrimary}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            position: 'sticky', bottom: 0, background: C.surface,
          }}>
            <div>
              {existingEntry && (
                <button
                  onClick={handleDelete} disabled={deleting}
                  style={{
                    fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em',
                    color: C.red, background: C.redSoft, border: `1px solid ${C.red}44`,
                    padding: '10px 20px', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = C.redSoft}
                >{deleting ? 'Deleting...' : '✕ Delete'}</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onClose}
                style={{
                  fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em',
                  color: C.textMuted, background: 'transparent', border: `1px solid ${C.borderPrimary}`,
                  padding: '10px 20px', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.textMuted }}
                onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.borderPrimary }}
              >Cancel</button>
              <button
                onClick={handleSave} disabled={saving}
                style={{
                  fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em',
                  color: C.primary, background: C.primarySoft, border: `1px solid ${C.primary}55`,
                  padding: '10px 28px', cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'rgba(94,234,212,0.2)' }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = C.primarySoft }}
              >{saving ? 'Saving...' : existingEntry ? '✓ Update' : '✓ Submit'}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Character card ────────────────────────────────────────────────────────────
function CharacterCard({ entry }) {
  const [hov, setHov] = useState(false)
  const char  = entry.character
  const vas   = (entry.voice_actors || []).filter(v => v.language === 'Japanese')
  const va    = vas[0]?.person || null
  const fColor = formatColor('Series') // primary for chars

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ width: '100px', flexShrink: 0, transform: hov ? 'translateY(-4px)' : 'none', transition: 'transform 0.2s' }}
    >
      <div style={{
        width: '100px', height: '134px', background: C.surface,
        border: `1px solid ${hov ? C.primary + '66' : C.borderPrimary}`,
        overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s',
      }}>
        {char?.images?.jpg?.image_url
          ? <img src={char.images.jpg.image_url} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px', background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>✦</div>
        }
        {hov && <Corners color={C.primary} size={8} opacity={0.5} />}
      </div>
      <div style={{
        marginTop: '7px', fontSize: '11px', fontWeight: 600,
        color: hov ? C.text : C.textMuted, transition: 'color 0.2s',
        lineHeight: 1.3, overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>{char?.name}</div>
      {va && (
        <div style={{
          fontSize: '10px', color: C.textDim, marginTop: '3px',
          lineHeight: 1.3, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontStyle: 'italic',
        }}>{va.name}</div>
      )}
    </div>
  )
}

// ── Image grid with lightbox ──────────────────────────────────────────────────
function ImageGrid({ images }) {
  const [lightbox, setLightbox] = useState(null)
  const [showAll, setShowAll]   = useState(false)
  const [hov, setHov]           = useState(null)
  const list    = images || []
  const visible = showAll ? list : list.slice(0, 6)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
        {visible.map((img, i) => {
          const src = img.jpg?.large_image_url || img.jpg?.image_url || img.webp?.large_image_url || ''
          return (
            <div
              key={i}
              onClick={() => setLightbox(src)}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
              style={{
                aspectRatio: '2/3', overflow: 'hidden', cursor: 'pointer',
                border: `1px solid ${hov === i ? C.primary + '55' : C.borderPrimary}`,
                transition: 'all 0.2s',
                transform: hov === i ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )
        })}
      </div>
      {list.length > 6 && (
        <button
          onClick={() => setShowAll(s => !s)}
          style={{
            marginTop: '14px', fontFamily: '"Cinzel", serif', fontSize: '11px',
            letterSpacing: '0.2em', color: C.primary, background: 'transparent',
            border: `1px solid ${C.primary}44`, padding: '8px 20px', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.primarySoft}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >{showAll ? '▲ Show Less' : `▼ Show All ${list.length}`}</button>
      )}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(4,8,16,0.96)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={lightbox} alt=""
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', border: `1px solid ${C.borderPrimary}` }}
          />
        </div>
      )}
    </div>
  )
}

// ── Trailer / promo section ───────────────────────────────────────────────────
function TrailerSection({ trailer, promos }) {
  const [active, setActive] = useState(null)

  // Build a unified list: main trailer first, then promos
  const videos = []
  if (trailer?.youtube_id) {
    videos.push({ key: trailer.youtube_id, name: 'Official Trailer', thumb: trailer.images?.maximum_image_url || `https://img.youtube.com/vi/${trailer.youtube_id}/mqdefault.jpg` })
  }
  ;(promos || []).forEach(p => {
    if (p.trailer?.youtube_id && p.trailer.youtube_id !== trailer?.youtube_id) {
      videos.push({ key: p.trailer.youtube_id, name: p.title || 'Promo', thumb: p.trailer.images?.maximum_image_url || `https://img.youtube.com/vi/${p.trailer.youtube_id}/mqdefault.jpg` })
    }
  })

  if (!videos.length) return <div style={{ color: C.textDim, fontSize: '13px' }}>No trailers available</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
        {videos.map(v => (
          <div
            key={v.key}
            onClick={() => setActive(active === v.key ? null : v.key)}
            style={{ flexShrink: 0, width: '190px', cursor: 'pointer' }}
          >
            <div style={{
              position: 'relative', height: '107px',
              border: `1px solid ${active === v.key ? C.primary + '88' : C.borderPrimary}`,
              overflow: 'hidden', transition: 'border-color 0.2s',
            }}>
              <img src={v.thumb} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(5,12,16,0.45)',
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: active === v.key ? C.primary : 'rgba(94,234,212,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', transition: 'background 0.2s',
                }}>▶</div>
              </div>
            </div>
            <div style={{
              marginTop: '6px', fontSize: '11px',
              color: active === v.key ? C.primary : C.textMuted,
              lineHeight: 1.3, overflow: 'hidden',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>{v.name}</div>
          </div>
        ))}
      </div>
      {active && (
        <div style={{ marginTop: '14px', position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${active}?autoplay=1`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: `1px solid ${C.borderPrimary}` }}
            allow="autoplay; encrypted-media" allowFullScreen title="trailer"
          />
        </div>
      )}
    </div>
  )
}

// ── Main InfoPage ─────────────────────────────────────────────────────────────
export default function InfoPage({ malId, onBack }) {
  const [data, setData]           = useState(null)
  const [characters, setChars]    = useState([])
  const [pictures, setPictures]   = useState([])
  const [promos, setPromos]       = useState([])
  const [existing, setExisting]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [showAllCast, setShowAllCast] = useState(false)
  const [showTrailers, setShowTrailers] = useState(false)

  // Jikan rate-limit helper: stagger 3 extra calls by 400ms each
  const sleep = (ms) => new Promise(r => setTimeout(r, ms))

  const fetchExisting = async (d) => {
    try {
      const r = await axios.get(API)
      const title = d.title_english || d.title || ''
      const found = r.data.find(e => e.title?.toLowerCase() === title.toLowerCase())
      setExisting(found || null)
    } catch {}
  }

  useEffect(() => {
    if (!malId) return
    window.scrollTo({ top: 0, behavior: 'instant' })
    setLoading(true)
    setShowModal(false)
    setShowAllCast(false)
    setShowTrailers(false)
    setData(null)
    setChars([])
    setPictures([])
    setPromos([])

    const run = async () => {
      try {
        // Main detail — includes trailer, genres, themes in one call
        const mainRes  = await fetch(`${JIKAN}/anime/${malId}/full`)
        const mainJson = await mainRes.json()
        const d = mainJson.data
        setData(d)
        await fetchExisting(d)

        // Stagger remaining calls to respect Jikan rate limit
        await sleep(400)
        const charRes  = await fetch(`${JIKAN}/anime/${malId}/characters`)
        const charJson = await charRes.json()
        setChars(charJson.data || [])

        await sleep(400)
        const picRes  = await fetch(`${JIKAN}/anime/${malId}/pictures`)
        const picJson = await picRes.json()
        setPictures(picJson.data || [])

        await sleep(400)
        const promoRes  = await fetch(`${JIKAN}/anime/${malId}/videos/promo`)
        const promoJson = await promoRes.json()
        setPromos(promoJson.data || [])
      } catch (err) {
        console.error('InfoPage fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [malId])

  if (loading) return <Spinner />
  if (!data) return (
    <div style={{ color: C.textDim, fontFamily: '"Cinzel", serif', fontSize: '13px' }}>
      Failed to load anime data.
    </div>
  )

  // ── Derived values ──────────────────────────────────────────────────────────
  const format      = detectFormat(data)
  const fColor      = formatColor(format)
  const year        = getYear(data)
  const cover       = data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || null
  const backdrop    = data.trailer?.images?.maximum_image_url || null
  const malScore    = data.score ? data.score.toFixed(2) : null
  const runtime     = parseRuntime(data.duration)
  const statusCfg   = existing ? (STATUS_CONFIG[existing.status] || {}) : null
  const trailerCount = (data.trailer?.youtube_id ? 1 : 0) + promos.filter(p => p.trailer?.youtube_id).length

  // Tags: opening/ending themes from the full endpoint
  const openings = (data.theme?.openings || []).slice(0, 3)
  const endings  = (data.theme?.endings  || []).slice(0, 3)
  const keywords = [
    ...(data.genres || []),
    ...(data.themes || []),
    ...(data.demographics || []),
  ].slice(0, 20)

  const myRatingColor = (r) => {
    if (!r) return C.textDim
    if (r >= 8) return C.green
    if (r >= 6) return C.gold
    if (r >= 4) return C.aurora
    return C.red
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {/* ── BACK ── */}
      <div style={{ marginBottom: '36px' }}>
        <button
          onClick={onBack}
          style={{
            fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.25em',
            color: C.textDim, background: 'transparent', border: 'none',
            cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.primary}
          onMouseLeave={e => e.currentTarget.style.color = C.textDim}
        >← Back to Search</button>
      </div>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', marginBottom: '60px' }}>
        {backdrop && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${backdrop})`,
            backgroundSize: 'cover', backgroundPosition: 'center top',
            opacity: 0.1, filter: 'blur(3px)',
          }} />
        )}

        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', gap: '52px', alignItems: 'flex-start', flexWrap: 'wrap',
          padding: backdrop ? '36px 0 52px' : '0',
        }}>

          {/* Poster + buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '4%', flexShrink: 0 }}>
            <div style={{
              width: '230px', height: '335px', background: C.surface,
              border: `1px solid ${fColor}55`, overflow: 'hidden', position: 'relative',
              boxShadow: `0 20px 70px rgba(0,0,0,0.85), 0 0 0 1px ${fColor}22, 0 0 50px ${fColor}0a`,
            }}>
              <Corners color={fColor} size={13} opacity={0.55} />
              {cover
                ? <img src={cover} alt={data.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '44px' }}>✦</div>
              }
            </div>

            {/* Buttons */}
            <div style={{ width: '230px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <button
                onClick={() => setShowTrailers(s => !s)}
                style={{
                  fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em',
                  color: showTrailers ? C.bg : C.primary,
                  background: showTrailers ? C.primary : C.primarySoft,
                  border: `1px solid ${C.primary}66`, padding: '12px', cursor: 'pointer',
                  transition: 'all 0.25s', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px', textTransform: 'uppercase',
                }}
                onMouseEnter={e => { if (!showTrailers) e.currentTarget.style.background = 'rgba(94,234,212,0.18)' }}
                onMouseLeave={e => { if (!showTrailers) e.currentTarget.style.background = showTrailers ? C.primary : C.primarySoft }}
              >
                ▶ Trailers {trailerCount > 0 && <span style={{ fontSize: '10px', opacity: 0.7 }}>({trailerCount})</span>}
              </button>

              <button
                onClick={() => setShowModal(true)}
                style={{
                  fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.18em',
                  color: existing ? (statusCfg?.color || C.green) : C.gold,
                  background: existing ? `${statusCfg?.color || C.green}15` : 'rgba(163,230,53,0.12)',
                  border: `1px solid ${existing ? (statusCfg?.color || C.green) + '55' : C.gold + '66'}`,
                  padding: '12px', cursor: 'pointer', transition: 'all 0.25s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', textTransform: 'uppercase',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {existing ? <>{statusCfg?.icon} {existing.status}</> : <>+ Add to My List</>}
              </button>
            </div>
          </div>

          {/* Info column */}
          <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* 1. Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '10px', letterSpacing: '0.18em', color: fColor,
                padding: '5px 13px', border: `1px solid ${fColor}55`,
                background: fColor + '10', fontFamily: '"Cinzel", serif', fontWeight: 700,
              }}>{format}</span>
              {data.status && (
                <span style={{
                  fontSize: '10px', letterSpacing: '0.15em',
                  color: data.status === 'Finished Airing' ? C.textMuted : C.green,
                  padding: '5px 13px',
                  border: `1px solid ${data.status === 'Finished Airing' ? C.textDim + '44' : C.green + '44'}`,
                  background: data.status === 'Finished Airing' ? 'transparent' : C.greenSoft,
                  fontFamily: '"Cinzel", serif',
                }}>{data.status}</span>
              )}
              {data.rating && (
                <span style={{
                  fontSize: '10px', letterSpacing: '0.15em', color: C.aurora,
                  padding: '5px 13px', border: `1px solid ${C.aurora}44`,
                  background: C.auroraSoft, fontFamily: '"Cinzel", serif',
                }}>{data.rating}</span>
              )}
            </div>

            {/* 2. Title */}
            <div>
              <h2 style={{
                fontFamily: '"Cinzel", serif',
                fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 700,
                letterSpacing: '0.05em', color: C.text, margin: 0, lineHeight: 1.15,
                textShadow: `0 0 50px ${fColor}18`,
              }}>
                {data.title_english || data.title}
                {year && (
                  <span style={{
                    fontSize: 'clamp(15px, 1.8vw, 22px)', color: C.textDim,
                    fontWeight: 400, marginLeft: '14px', letterSpacing: '0.1em',
                  }}>({year})</span>
                )}
              </h2>
              {data.title && data.title !== (data.title_english || data.title) && (
                <div style={{ fontSize: '14px', color: C.textMuted, marginTop: '6px', fontStyle: 'italic', letterSpacing: '0.04em' }}>
                  {data.title}
                </div>
              )}
              {data.title_japanese && (
                <div style={{ fontSize: '13px', color: C.textDim, marginTop: '4px', letterSpacing: '0.06em' }}>
                  {data.title_japanese}
                </div>
              )}
            </div>

            {/* 3. Ratings */}
            <div style={{ display: 'flex', gap: '36px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {malScore && parseFloat(malScore) > 0 && (
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '5px' }}>ᛏ MAL Score</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{
                      fontFamily: '"Cinzel", serif', fontSize: '38px', fontWeight: 700,
                      color: C.gold, textShadow: `0 0 24px rgba(163,230,53,0.5)`, lineHeight: 1,
                    }}>★ {malScore}</span>
                    <span style={{ fontSize: '12px', color: C.textDim }}>/10</span>
                  </div>
                  {data.scored_by > 0 && (
                    <div style={{ fontSize: '10px', color: C.textDim, marginTop: '3px', letterSpacing: '0.05em' }}>
                      {data.scored_by.toLocaleString()} votes
                    </div>
                  )}
                </div>
              )}
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '5px' }}>★ Mine</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{
                    fontFamily: '"Cinzel", serif', fontSize: '38px', fontWeight: 700,
                    color: myRatingColor(existing?.rating), lineHeight: 1, transition: 'color 0.3s',
                  }}>
                    {existing?.rating || '—'}
                  </span>
                  <span style={{ fontSize: '12px', color: C.textDim }}>/10</span>
                </div>
                {!existing && (
                  <div style={{ fontSize: '10px', color: C.textDim, marginTop: '3px', letterSpacing: '0.05em' }}>Not in list</div>
                )}
              </div>
              {data.rank && (
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '5px' }}>ᚱ MAL Rank</div>
                  <div style={{ fontFamily: '"Cinzel", serif', fontSize: '28px', fontWeight: 700, color: C.crystal, lineHeight: 1 }}>#{data.rank}</div>
                </div>
              )}
            </div>

            {/* 4. Episodes / Runtime / My Progress */}
            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
              {[
                data.episodes > 0 && { label: 'Episodes', value: data.episodes, rune: 'ᚹ' },
                runtime         && { label: 'Runtime',  value: runtime,          rune: 'ᛏ' },
                existing?.episodes?.total > 0 && {
                  label: 'My Progress',
                  value: `${existing.episodes.current}/${existing.episodes.total}`,
                  rune: 'ᛗ', color: fColor,
                },
              ].filter(Boolean).map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {item.rune} {item.label}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: item.color || C.text, fontFamily: '"Cinzel", serif' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* 5. Genres */}
            {data.genres?.length > 0 && (
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {data.genres.map(g => (
                  <span key={g.mal_id} style={{
                    fontSize: '10px', letterSpacing: '0.12em', color: C.textMuted,
                    padding: '5px 13px', border: `1px solid ${C.borderPrimary}`,
                    background: C.surface, fontFamily: '"Cinzel", serif',
                  }}>{g.name}</span>
                ))}
              </div>
            )}

            {/* 6. Studios */}
            {data.studios?.length > 0 && (
              <div style={{ fontSize: '12px', color: C.textDim, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: C.primary + '77', fontFamily: '"Cinzel", serif', fontSize: '14px' }}>ᚾ</span>
                <span style={{ color: C.textMuted }}>{data.studios.map(s => s.name).join(' · ')}</span>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── TRAILERS (inline toggle) ── */}
      {showTrailers && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Trailers" rune="▶" right={`${trailerCount} available`} />
          <TrailerSection trailer={data.trailer} promos={promos} />
        </div>
      )}

      {/* ── MY REVIEW ── */}
      {existing?.review && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="My Review" rune="ᚾ" />
          <div style={{ padding: '22px 26px', background: C.surface, border: `1px solid ${C.borderPrimary}`, position: 'relative' }}>
            <Corners color={C.primary} size={10} opacity={0.2} />
            <p style={{ fontSize: '14px', color: C.textMuted, lineHeight: 1.85, margin: 0, letterSpacing: '0.02em', fontStyle: 'italic' }}>
              "{existing.review}"
            </p>
          </div>
        </div>
      )}

      {/* ── SYNOPSIS ── */}
      {data.synopsis && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Synopsis" rune="ᛊ" />
          <div style={{ padding: '24px 28px', background: C.surface, border: `1px solid ${C.borderPrimary}`, position: 'relative' }}>
            <Corners color={C.primary} size={10} opacity={0.2} />
            <p style={{ fontSize: '15px', color: C.textMuted, lineHeight: 1.9, margin: 0, letterSpacing: '0.02em' }}>
              {data.synopsis}
            </p>
          </div>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      <div style={{ marginBottom: '56px' }}>
        <SectionDivider title="Overview" rune="ᚱ" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

          {/* MAL metadata grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Type',        value: data.type,              rune: 'ᛏ' },
              { label: 'Source',      value: data.source,            rune: 'ᚢ' },
              { label: 'Aired From',  value: data.aired?.from ? new Date(data.aired.from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null, rune: 'ᛞ' },
              { label: 'Aired To',    value: data.aired?.to   ? new Date(data.aired.to).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : data.status === 'Currently Airing' ? 'Ongoing' : null, rune: 'ᛞ' },
              { label: 'Premiered',   value: data.season && data.year ? `${data.season.charAt(0).toUpperCase() + data.season.slice(1)} ${data.year}` : null, rune: 'ᚨ' },
              { label: 'Popularity',  value: data.popularity ? `#${data.popularity}` : null, rune: 'ᚠ' },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.borderPrimary}` }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '6px' }}>
                  <span style={{ color: C.primary + '77', marginRight: '6px' }}>{row.rune}</span>{row.label}
                </div>
                <div style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* My Entry grid (only if saved) */}
          {existing && (() => {
            const myRows = [
              existing.dateStarted   && { label: 'My Start Date',  value: existing.dateStarted.split('T')[0],                    rune: 'ᛞ' },
              existing.dateCompleted && { label: 'My End Date',     value: existing.dateCompleted.split('T')[0],                   rune: 'ᛞ' },
              existing.rewatchCount > 0 && { label: 'Rewatched',   value: `${existing.rewatchCount}×`,                            rune: 'ᚲ' },
              existing.platforms?.length > 0 && { label: 'Watching On', value: existing.platforms.map(p => p.name).join(', '),    rune: 'ᛚ' },
            ].filter(Boolean)
            if (!myRows.length) return null
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase' }}>ᛗ My Entry</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
                  {myRows.map(row => (
                    <div key={row.label} style={{ padding: '14px 16px', background: `${C.primary}08`, border: `1px solid ${C.primary}33` }}>
                      <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: C.primary + 'aa', fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '6px' }}>
                        <span style={{ color: C.primary + '88', marginRight: '6px' }}>{row.rune}</span>{row.label}
                      </div>
                      <div style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Themes: openings + endings */}
          {(openings.length > 0 || endings.length > 0) && (
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '12px' }}>ᚦ Music Themes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {openings.map((t, i) => (
                  <div key={`op${i}`} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '9px', color: C.primary, fontFamily: '"Cinzel", serif', letterSpacing: '0.15em', whiteSpace: 'nowrap', minWidth: '50px' }}>OP {i + 1}</span>
                    <span style={{ fontSize: '12px', color: C.textMuted }}>{t}</span>
                  </div>
                ))}
                {endings.map((t, i) => (
                  <div key={`ed${i}`} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '9px', color: C.aurora, fontFamily: '"Cinzel", serif', letterSpacing: '0.15em', whiteSpace: 'nowrap', minWidth: '50px' }}>ED {i + 1}</span>
                    <span style={{ fontSize: '12px', color: C.textMuted }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords / Tags */}
          {keywords.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '12px' }}>ᚷ Tags</div>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {keywords.map((k, i) => (
                  <span key={i} style={{ fontSize: '11px', color: C.textDim, padding: '4px 10px', border: `1px solid ${C.textDim}33`, background: C.surface, letterSpacing: '0.05em' }}>
                    {k.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CHARACTERS ── */}
      {characters.length > 0 && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Characters" rune="ᛈ" right={`${characters.length} listed`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px 12px' }}>
            {(showAllCast ? characters : characters.slice(0, 12)).map((entry, i) => (
              <CharacterCard key={i} entry={entry} />
            ))}
          </div>
          {characters.length > 12 && (
            <button
              onClick={() => setShowAllCast(s => !s)}
              style={{
                marginTop: '22px', fontFamily: '"Cinzel", serif', fontSize: '11px',
                letterSpacing: '0.2em', color: C.primary, background: C.primarySoft,
                border: `1px solid ${C.primary}44`, padding: '10px 24px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(94,234,212,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = C.primarySoft}
            >{showAllCast ? '▲ Show Less' : `▼ Show All ${characters.length} Characters`}</button>
          )}
        </div>
      )}

      {/* ── IMAGES ── */}
      {pictures.length > 0 && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Images" rune="ᛒ" right={`${pictures.length} total`} />
          <ImageGrid images={pictures} />
        </div>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <AddToListModal
          animeData={data}
          existingEntry={existing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchExisting(data) }}
          onDeleted={() => { setShowModal(false); setExisting(null) }}
        />
      )}
    </div>
  )
}