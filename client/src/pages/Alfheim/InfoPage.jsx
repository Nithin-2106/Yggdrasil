import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useIsCompact } from '../../hooks/useMediaQuery'
import {
  fetchAnimeDetail,
  detectAnimeFormat,
  getTitle,
  getYear,
  getCover,
  formatScore,
  formatStatus,
  formatSource,
} from '../../utils/anilistAnimeSearch'

const API = '/api/media/anime'

const C = {
  bg:           '#050C10',
  surface:      '#0A1A20',
  surfaceHover: '#0E2228',
  input:        '#071318',
  primary:      '#5EEAD4',
  primarySoft:  'rgba(94,234,212,0.12)',
  aurora:       '#C084FC',
  auroraSoft:   'rgba(192,132,252,0.15)',
  green:        '#34D399',
  greenSoft:    'rgba(52,211,153,0.12)',
  gold:         '#A3E635',
  red:          '#F87171',
  redSoft:      'rgba(248,113,113,0.12)',
  silver:       '#94A3B8',
  text:         '#E0F7F4',
  textMuted:    '#7ABFB8',
  textDim:      '#2E5A56',
  borderPrimary:'rgba(94,234,212,0.2)',
}

const FORMAT_COLOR = { Movie: '#A3E635', OVA: '#C084FC', Special: '#34D399', Series: '#5EEAD4' }
const STATUS_CONFIG = {
  'Watching':      { color: '#5EEAD4', icon: '▶', rune: 'ᚹ' },
  'Completed':     { color: '#34D399', icon: '✓', rune: 'ᚲ' },
  'Dropped':       { color: '#F87171', icon: '✕', rune: 'ᛞ' },
  'Plan to Watch': { color: '#C084FC', icon: '◷', rune: 'ᛈ' },
  'On Hold':       { color: '#A3E635', icon: '⏸', rune: 'ᛟ' },
}

function formatColor(format) { return FORMAT_COLOR[format] || C.primary }

function myRatingColor(r) {
  if (!r) return C.textDim
  if (r >= 8) return C.green
  if (r >= 6) return C.gold
  if (r >= 4) return C.aurora
  return C.red
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function anilistDateToString(dateObj) {
  if (!dateObj?.year) return null
  const { year, month, day } = dateObj
  if (!month) return String(year)
  return new Date(year, month - 1, day || 1)
    .toLocaleDateString('en-GB', { day: day ? '2-digit' : undefined, month: 'short', year: 'numeric' })
}

function formatRuntime(duration, format) {
  if (!duration) return null
  return format === 'Movie' ? `${duration}m` : `${duration}m/ep`
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Corners({ color = C.primary, size = 12, opacity = 0.5 }) {
  const b = `1px solid ${color}`
  const s = { position: 'absolute', width: size, height: size, opacity, pointerEvents: 'none' }
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
      {rune && <span style={{ fontFamily: '"Cinzel", serif', fontSize: '18px', color: C.gold }}>{rune}</span>}
      <h3 style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', fontWeight: 700, letterSpacing: '0.35em', color: C.gold, margin: 0, textTransform: 'uppercase' }}>
        {title}
      </h3>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(163,230,53,0.4), transparent)' }} />
      {right && <span style={{ fontSize: '11px', color: C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>{right}</span>}
    </div>
  )
}

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

function Spinner({ isCompact }) {
  return (
    <div style={{ padding: '0 0 60px' }}>
      <SkeletonBlock w="120px" h="14px" style={{ marginBottom: '36px' }} />
      <div style={{ display: 'flex', gap: isCompact ? '24px' : '52px', flexWrap: 'wrap', marginBottom: '60px' }}>
        <SkeletonBlock w={isCompact ? '190px' : '230px'} h={isCompact ? '276px' : '335px'} style={{ flexShrink: 0, marginLeft: isCompact ? 0 : '4%' }} />
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
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
            {[90, 70, 110, 80].map((w, i) => <SkeletonBlock key={i} w={`${w}px`} h="26px" />)}
          </div>
        </div>
      </div>
      <SkeletonBlock w="160px" h="14px" style={{ marginBottom: '16px' }} />
      <SkeletonBlock w="100%" h="90px" style={{ marginBottom: '56px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px 12px' }}>
        {Array(12).fill(0).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <SkeletonBlock w="100px" h="134px" />
            <SkeletonBlock w="80%" h="12px" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Rating slider ─────────────────────────────────────────────────────────────
function RatingSlider({ value, onChange, isCompact }) {
  const [hovered, setHovered] = useState(null)
  const steps = []
  for (let i = 1; i <= 10; i += 0.5) steps.push(i)
  const display = hovered !== null ? hovered : value

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '42px', fontWeight: 700, color: myRatingColor(display), lineHeight: 1, transition: 'all 0.15s' }}>
          {display || '—'}
        </span>
        <span style={{ fontSize: '13px', color: C.textDim, fontFamily: '"Cinzel", serif' }}>/10</span>
      </div>
      <div style={{ display: 'flex', gap: isCompact ? '2px' : '3px', width: '100%' }}>
        {steps.map((step) => {
          const isActive = value && step <= value
          const isHov    = hovered !== null && step <= hovered
          const col      = myRatingColor(step)
          const isWhole  = step % 1 === 0
          return (
            <button
              key={step}
              onClick={() => onChange(value === step ? null : step)}
              onMouseEnter={() => setHovered(step)}
              onMouseLeave={() => setHovered(null)}
              title={step.toString()}
              style={{
                flex: isWhole ? '2 1 0' : '1 1 0',
                minWidth: 0,
                height: isCompact ? '28px' : '30px',
                background: (isHov || isActive) ? col : C.surface,
                border: `1px solid ${(isHov || isActive) ? col : C.borderPrimary}`,
                cursor: 'pointer', transition: 'all 0.1s', position: 'relative',
                padding: 0,
              }}
            >
              {isWhole && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isCompact ? '8px' : '10px', fontFamily: '"Cinzel", serif', color: (isHov || isActive) ? C.bg : C.textDim, fontWeight: 700 }}>
                  {step}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {value && (
        <button
          onClick={() => onChange(null)}
          style={{ marginTop: '8px', fontSize: '10px', letterSpacing: '0.15em', color: C.textDim, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: '"Cinzel", serif', padding: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.red }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textDim }}
        >× Clear rating</button>
      )}
    </div>
  )
}

// ── Rewatch stepper ────────────────────────────────────────────────────────────
function Stepper({ value, onChange, isCompact, min = 0 }) {
  const btnStyle = {
    width: isCompact ? '38px' : '34px',
    height: isCompact ? '38px' : '34px',
    flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: C.input, border: `1px solid ${C.borderPrimary}`,
    color: C.primary, fontSize: '17px', fontFamily: '"Cinzel", serif',
    cursor: 'pointer', userSelect: 'none', transition: 'border-color 0.15s, background 0.15s',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, (value || 0) - 1))}
        style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = C.primarySoft }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderPrimary; e.currentTarget.style.background = C.input }}
      >−</button>
      <span style={{ minWidth: '30px', textAlign: 'center', fontFamily: '"Cinzel", serif', fontSize: '18px', fontWeight: 700, color: C.text }}>
        {value || 0}
      </span>
      <button
        type="button"
        onClick={() => onChange((value || 0) + 1)}
        style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = C.primarySoft }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderPrimary; e.currentTarget.style.background = C.input }}
      >+</button>
    </div>
  )
}

// ── Add/Edit modal ────────────────────────────────────────────────────────────
function AddToListModal({ animeData, existingEntry, onClose, onSaved, onDeleted, isCompact }) {
  const format = detectAnimeFormat(animeData)
  const year   = getYear(animeData)
  const cover  = getCover(animeData)
  const title  = getTitle(animeData)

  const buildDefault = () => ({
    anilistId:    animeData.id,
    title,
    coverImage:   cover,
    status:       'Plan to Watch',
    format,
    rating:       null,
    episodes:     { current: 0, total: animeData.episodes || null },
    year,
    genres:       animeData.genres || [],
    review:       '',
    rewatchCount: 0,
    dateStarted:  null,
    dateCompleted:null,
    platforms:    [],
    customTags:   [],
  })

  const [form, setForm]             = useState(existingEntry || buildDefault())
  const [coverOverride, setCover]   = useState('')
  const [platName, setPlatName]     = useState('')
  const [platUrl, setPlatUrl]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState('')
  const [focusedField, setFocused]  = useState('')

  const set   = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setEp = (k, v) => setForm((f) => ({ ...f, episodes: { ...f.episodes, [k]: v === '' ? null : Number(v) } }))
  const coverSrc = coverOverride || form.coverImage

  // Setting status to Completed maxes out the episode count and defaults
  // the rewatch count to at least 1 — never downgrades an existing higher count.
  const setStatus = (newStatus) => {
    setForm((f) => {
      const next = { ...f, status: newStatus }
      if (newStatus === 'Completed') {
        if (f.episodes?.total) next.episodes = { ...f.episodes, current: f.episodes.total }
        if (!f.rewatchCount || f.rewatchCount < 1) next.rewatchCount = 1
      }
      return next
    })
  }

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
    width: '100%', padding: '9px 12px', background: C.input,
    border: `1px solid ${focusedField === field ? C.primary + '99' : C.borderPrimary}`,
    color: C.text, fontSize: '13px', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focusedField === field ? '0 0 12px rgba(94,234,212,0.1)' : 'none',
    MozAppearance: 'textfield',
  })

  const lbl = { fontSize: '10px', letterSpacing: '0.25em', color: C.textMuted, textTransform: 'uppercase', fontFamily: '"Cinzel", serif', marginBottom: '6px', display: 'block' }

  return (
    <>
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .modal-scroll::-webkit-scrollbar { display: none; }
        .modal-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(4,8,16,0.88)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: isCompact ? '12px' : '24px',
          paddingTop: isCompact ? '56px' : '80px',
        }}
      >
        <div
          className="modal-scroll"
          style={{
            background: C.surface, border: `1px solid ${C.borderPrimary}`,
            width: '100%', maxWidth: '720px', maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto', position: 'relative', boxShadow: '0 0 80px rgba(0,0,0,0.8)',
          }}
        >
          <Corners color={C.primary} size={12} opacity={0.4} />

          {/* Header */}
          <div style={{ padding: isCompact ? '16px 18px 12px' : '20px 28px 16px', borderBottom: `1px solid ${C.borderPrimary}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: C.surface, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: '"Cinzel", serif', fontSize: '14px', color: C.primary }}>ᚨ</span>
              <span style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.3em', color: C.primary, textTransform: 'uppercase', fontWeight: 700 }}>
                {existingEntry ? 'Edit Entry' : 'Add to My List'}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: C.textDim, fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.text }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textDim }}
            >×</button>
          </div>

          {/* Body */}
          <div style={{ padding: isCompact ? '18px' : '28px', display: 'flex', gap: isCompact ? '18px' : '28px', flexWrap: 'wrap' }}>

            {/* Left — poster */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px', width: isCompact ? '100%' : 'auto', alignItems: isCompact ? 'center' : 'flex-start' }}>
              <div style={{ maxWidth: '160px', textAlign: isCompact ? 'center' : 'left' }}>
                <div style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', fontWeight: 700, color: C.text, letterSpacing: '0.05em', lineHeight: 1.4 }}>
                  {title}
                </div>
                {year && <div style={{ fontSize: '11px', color: C.primary, fontFamily: '"Cinzel", serif', marginTop: '4px', letterSpacing: '0.1em' }}>{year}</div>}
              </div>
              <div style={{ width: '160px', height: '230px', background: C.bg, border: `1px solid ${C.borderPrimary}`, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                <Corners color={C.primary} size={10} opacity={0.35} />
                {coverSrc
                  ? <img src={coverSrc} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px' }}>✦</div>
                }
              </div>
              <div style={{ width: '160px' }}>
                <label style={lbl}>ᛈ Cover URL</label>
                <input
                  placeholder="Paste image URL..."
                  value={coverOverride}
                  onChange={(e) => setCover(e.target.value)}
                  onFocus={() => setFocused('cover')}
                  onBlur={() => setFocused('')}
                  style={{ ...inputStyle('cover'), width: '160px', fontSize: '11px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Right — fields */}
            <div style={{ flex: 1, minWidth: isCompact ? '0' : '260px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              <div>
                <label style={lbl}>ᛊ Status</label>
                <select value={form.status} onChange={(e) => setStatus(e.target.value)} onFocus={() => setFocused('status')} onBlur={() => setFocused('')} style={{ ...inputStyle('status'), cursor: 'pointer' }}>
                  <option>Watching</option>
                  <option>Completed</option>
                  <option>Dropped</option>
                  <option>Plan to Watch</option>
                  <option>On Hold</option>
                </select>
              </div>

              <div>
                <label style={lbl}>ᚹ Episodes</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: isCompact ? 'wrap' : 'nowrap' }}>
                  <input type="number" min="0" placeholder="Current" value={form.episodes?.current ?? ''} onChange={(e) => setEp('current', e.target.value)} onFocus={() => setFocused('epCurrent')} onBlur={() => setFocused('')} style={{ ...inputStyle('epCurrent'), width: '72px', flexShrink: 0 }} />
                  <span style={{ color: C.textDim, fontSize: '14px', flexShrink: 0 }}>/</span>
                  <input type="number" min="0" placeholder="Total" value={form.episodes?.total ?? ''} onChange={(e) => setEp('total', e.target.value)} onFocus={() => setFocused('epTotal')} onBlur={() => setFocused('')} style={{ ...inputStyle('epTotal'), width: '72px', flexShrink: 0 }} />
                </div>
              </div>

              <div>
                <label style={lbl}>ᚲ No. of Times Rewatched</label>
                <Stepper value={form.rewatchCount} onChange={(v) => set('rewatchCount', v)} isCompact={isCompact} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>ᛞ Date Started</label>
                  <input type="date" value={form.dateStarted?.split('T')[0] ?? ''} onChange={(e) => set('dateStarted', e.target.value)} onFocus={() => setFocused('dateStart')} onBlur={() => setFocused('')} style={inputStyle('dateStart')} />
                </div>
                <div>
                  <label style={lbl}>ᛞ Date Completed</label>
                  <input type="date" value={form.dateCompleted?.split('T')[0] ?? ''} onChange={(e) => set('dateCompleted', e.target.value)} onFocus={() => setFocused('dateEnd')} onBlur={() => setFocused('')} style={inputStyle('dateEnd')} />
                </div>
              </div>

              <div>
                <label style={lbl}>★ My Rating</label>
                <RatingSlider value={form.rating} onChange={(v) => set('rating', v)} isCompact={isCompact} />
              </div>

              <div>
                <label style={lbl}>ᛚ Where to Watch</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(form.platforms || []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: C.input, border: `1px solid ${C.borderPrimary}` }}>
                      <span style={{ flex: 1, fontSize: '12px', color: C.text }}>{p.name}</span>
                      {p.url && <span style={{ fontSize: '10px', color: C.textDim, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>}
                      <button onClick={() => removePlat(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>×</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: isCompact ? 'wrap' : 'nowrap' }}>
                    <input placeholder="Platform" value={platName} onChange={(e) => setPlatName(e.target.value)} onFocus={() => setFocused('platName')} onBlur={() => setFocused('')} style={{ ...inputStyle('platName'), flex: 1 }} />
                    <input placeholder="URL (optional)" value={platUrl} onChange={(e) => setPlatUrl(e.target.value)} onFocus={() => setFocused('platUrl')} onBlur={() => setFocused('')} style={{ ...inputStyle('platUrl'), flex: 2 }} />
                    <button onClick={addPlat} style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', color: C.primary, background: C.primarySoft, border: `1px solid ${C.primary}44`, padding: '0 12px', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: isCompact ? '38px' : 'auto' }}>+ Add</button>
                  </div>
                </div>
              </div>

              <div>
                <label style={lbl}>ᚾ Review / Notes</label>
                <textarea value={form.review} onChange={(e) => set('review', e.target.value)} onFocus={() => setFocused('review')} onBlur={() => setFocused('')} placeholder="Your thoughts on this anime..." style={{ ...inputStyle('review'), resize: 'vertical', minHeight: '80px' }} />
              </div>

              {error && <div style={{ fontSize: '12px', color: C.red, letterSpacing: '0.05em' }}>{error}</div>}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: isCompact ? '14px 18px 18px' : '16px 28px 24px',
              borderTop: `1px solid ${C.borderPrimary}`,
              display: 'flex',
              flexDirection: isCompact ? 'column-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: isCompact ? 'stretch' : 'center',
              gap: isCompact ? '10px' : 0,
              position: 'sticky',
              bottom: 0,
              background: C.surface,
            }}
          >
            <div>
              {existingEntry && (
                <button
                  onClick={handleDelete} disabled={deleting}
                  style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.red, background: C.redSoft, border: `1px solid ${C.red}44`, padding: '10px 20px', minHeight: isCompact ? '44px' : 'auto', width: isCompact ? '100%' : 'auto', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.redSoft }}
                >{deleting ? 'Deleting...' : '✕ Delete'}</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexDirection: isCompact ? 'column' : 'row', width: isCompact ? '100%' : 'auto' }}>
              <button
                onClick={onClose}
                style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.textMuted, background: 'transparent', border: `1px solid ${C.borderPrimary}`, padding: '10px 20px', minHeight: isCompact ? '44px' : 'auto', width: isCompact ? '100%' : 'auto', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.textMuted }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.borderPrimary }}
              >Cancel</button>
              <button
                onClick={handleSave} disabled={saving}
                style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.primary, background: C.primarySoft, border: `1px solid ${C.primary}55`, padding: '10px 28px', minHeight: isCompact ? '44px' : 'auto', width: isCompact ? '100%' : 'auto', cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s', opacity: saving ? 0.7 : 1 }}
                onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(94,234,212,0.2)' }}
                onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = C.primarySoft }}
              >{saving ? 'Saving...' : existingEntry ? '✓ Update' : '✓ Submit'}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Character card (with JP voice actor from AniList) ─────────────────────────
function CharacterCard({ edge }) {
  const [hov, setHov] = useState(false)
  const char = edge.node
  const va   = (edge.voiceActors || [])[0] || null

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ width: '100px', flexShrink: 0, transform: hov ? 'translateY(-4px)' : 'none', transition: 'transform 0.2s' }}
    >
      <div style={{ width: '100px', height: '134px', background: C.surface, border: `1px solid ${hov ? C.primary + '66' : C.borderPrimary}`, overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s' }}>
        {char?.image?.large
          ? <img src={char.image.large} alt={char.name?.full} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px', background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>✦</div>
        }
        {edge.role === 'MAIN' && (
          <div style={{ position: 'absolute', bottom: '6px', left: '6px', padding: '2px 6px', background: 'rgba(5,12,16,0.9)', border: `1px solid ${C.primary}66`, fontSize: '8px', color: C.primary, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>MAIN</div>
        )}
        {hov && <Corners color={C.primary} size={8} opacity={0.5} />}
      </div>
      <div style={{ marginTop: '7px', fontSize: '11px', fontWeight: 600, color: hov ? C.text : C.textMuted, transition: 'color 0.2s', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {char?.name?.full}
      </div>
      {va && (
        <div style={{ fontSize: '10px', color: C.textDim, marginTop: '3px', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontStyle: 'italic' }}>
          {va.name?.full}
        </div>
      )}
    </div>
  )
}

// ── Staff card ────────────────────────────────────────────────────────────────
function StaffCard({ edge }) {
  const [hov, setHov] = useState(false)
  const person = edge.node
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: '100px', flexShrink: 0, transform: hov ? 'translateY(-4px)' : 'none', transition: 'transform 0.2s' }}
    >
      <div style={{ width: '100px', height: '134px', background: C.surface, border: `1px solid ${hov ? C.gold + '66' : C.borderPrimary}`, overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s' }}>
        {person?.image?.large
          ? <img src={person.image.large} alt={person.name?.full} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px', background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>✦</div>
        }
        {hov && <Corners color={C.gold} size={8} opacity={0.5} />}
      </div>
      <div style={{ marginTop: '7px', fontSize: '11px', fontWeight: 600, color: hov ? C.text : C.textMuted, transition: 'color 0.2s', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {person?.name?.full}
      </div>
      <div style={{ fontSize: '10px', color: C.primary, marginTop: '3px', letterSpacing: '0.05em', fontFamily: '"Cinzel", serif' }}>{edge.role}</div>
    </div>
  )
}

// ── Relation card ─────────────────────────────────────────────────────────────
function RelationCard({ edge }) {
  const [hov, setHov] = useState(false)
  const rel      = edge.node
  const relType  = edge.relationType
  const cover    = rel.coverImage?.large
  const relColor = {
    PREQUEL: C.primary, SEQUEL: C.aurora, ADAPTATION: C.gold,
    SIDE_STORY: C.silver, SPIN_OFF: C.silver, ALTERNATIVE: C.silver, SOURCE: C.green,
  }[relType] || C.textDim

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: '110px', flexShrink: 0, transform: hov ? 'translateY(-4px)' : 'none', transition: 'transform 0.2s' }}
    >
      <div style={{ width: '110px', height: '150px', background: C.surface, border: `1px solid ${hov ? relColor + '88' : C.borderPrimary}`, overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s' }}>
        {cover
          ? <img src={cover} alt={rel.title?.english || rel.title?.romaji} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '24px', background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>✦</div>
        }
        <div style={{ position: 'absolute', top: '6px', left: '6px', padding: '2px 6px', background: 'rgba(5,12,16,0.92)', border: `1px solid ${relColor}66`, fontSize: '8px', color: relColor, fontFamily: '"Cinzel", serif', letterSpacing: '0.08em' }}>
          {relType?.replace(/_/g, ' ')}
        </div>
        {hov && <Corners color={relColor} size={7} opacity={0.5} />}
      </div>
      <div style={{ marginTop: '7px', fontSize: '11px', fontWeight: 600, color: hov ? C.text : C.textMuted, transition: 'color 0.2s', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {rel.title?.english || rel.title?.romaji}
      </div>
      <div style={{ fontSize: '9px', color: C.textDim, marginTop: '3px', letterSpacing: '0.05em' }}>
        {rel.format?.replace(/_/g, ' ')} · {rel.type}
      </div>
    </div>
  )
}

// ── Trailer section ───────────────────────────────────────────────────────────
function TrailerSection({ trailer, isCompact }) {
  const [active, setActive] = useState(false)
  if (!trailer?.id || trailer.site !== 'youtube') {
    return <div style={{ color: C.textDim, fontSize: '13px' }}>No trailer available</div>
  }
  const thumb = trailer.thumbnail || `https://img.youtube.com/vi/${trailer.id}/mqdefault.jpg`

  return (
    <div>
      {!active ? (
        <div onClick={() => setActive(true)} style={{ position: 'relative', width: isCompact ? '100%' : '340px', height: isCompact ? '180px' : '191px', cursor: 'pointer', border: `1px solid ${C.borderPrimary}`, overflow: 'hidden' }}>
          <img src={thumb} alt="trailer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,12,16,0.45)' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>▶</div>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingBottom: isCompact ? '56.25%' : '191px', height: 0, maxWidth: isCompact ? '100%' : '340px' }}>
          <iframe
            src={`https://www.youtube.com/embed/${trailer.id}?autoplay=1`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: `1px solid ${C.borderPrimary}` }}
            allow="autoplay; encrypted-media" allowFullScreen title="trailer"
          />
        </div>
      )}
    </div>
  )
}

// ── Main InfoPage ─────────────────────────────────────────────────────────────
export default function InfoPage({ anilistId, onBack }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isCompact = useIsCompact()

  const [data,        setData]        = useState(null)
  const [existing,    setExisting]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [showAllCast, setShowAllCast] = useState(false)

  const fetchExisting = useCallback(async (animeId) => {
    try {
      const r = await axios.get(API)
      const found = r.data.find((e) => e.anilistId === animeId)
      setExisting(found || null)
    } catch {
      // silently fail — user may not be logged in
    }
  }, [])

  useEffect(() => {
    if (!anilistId) return
    window.scrollTo({ top: 0, behavior: 'instant' })
    setLoading(true)
    setShowModal(false)
    setShowAllCast(false)
    setData(null)
    setExisting(null)

    const run = async () => {
      try {
        const d = await fetchAnimeDetail(anilistId)
        setData(d)
        if (d) await fetchExisting(d.id)
      } catch (err) {
        console.error('InfoPage fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [anilistId, fetchExisting])

  if (loading) return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
      <Spinner isCompact={isCompact} />
    </>
  )

  if (!data) return (
    <div style={{ color: C.textDim, fontFamily: '"Cinzel", serif', fontSize: '13px', padding: '48px 0' }}>
      Failed to load anime data.
    </div>
  )

  // ── Derived values ──────────────────────────────────────────────────────────
  const format       = detectAnimeFormat(data)
  const fColor       = formatColor(format)
  const year         = getYear(data)
  const cover        = getCover(data)
  const title        = getTitle(data)
  const altTitle     = data.title?.romaji !== title ? data.title?.romaji : null
  const nativeTitle  = data.title?.native || null
  const aniScore     = formatScore(data.averageScore)
  const statusCfg    = existing ? (STATUS_CONFIG[existing.status] || {}) : null
  const runtime      = formatRuntime(data.duration, format)
  const keywords     = [...(data.genres || [])].slice(0, 20)

  const posterW = isCompact ? 190 : 230
  const posterH = isCompact ? 276 : 335

  const mainStudios = (data.studios?.edges || []).filter((e) => e.isMain).map((e) => e.node.name)

  const staffEdges = (data.staff?.edges || []).filter((e) =>
    ['Director', 'Series Composition', 'Character Design', 'Music', 'Original Creator', 'Script', 'Episode Director', 'Sound Director'].includes(e.role)
  ).slice(0, 8)

  const charEdges = (data.characters?.edges || [])
    .sort((a, b) => {
      const order = { MAIN: 0, SUPPORTING: 1, BACKGROUND: 2 }
      return (order[a.role] ?? 2) - (order[b.role] ?? 2)
    })
    .slice(0, 24)

  const relationEdges = (data.relations?.edges || []).filter((e) => e.node?.type !== 'CHARACTER')

  const tags = (data.tags || [])
    .filter((t) => !t.isMediaSpoiler)
    .sort((a, b) => (b.rank || 0) - (a.rank || 0))
    .slice(0, 20)

  const watchLinks = (data.externalLinks || []).filter((l) => l.type === 'STREAMING' || l.type === 'INFO')

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {/* Back button */}
      <div style={{ marginBottom: '36px' }}>
        <button
          onClick={onBack}
          style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.25em', color: C.textDim, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.primary }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textDim }}
        >← Back to Search</button>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', marginBottom: isCompact ? '40px' : '60px' }}>
        {data.bannerImage && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${data.bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 0.1, filter: 'blur(3px)' }} />
        )}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex',
          gap: isCompact ? '24px' : '52px',
          alignItems: isCompact ? 'center' : 'flex-start',
          flexDirection: isCompact ? 'column' : 'row',
          flexWrap: 'wrap',
          padding: data.bannerImage ? (isCompact ? '20px 0 32px' : '36px 0 52px') : '0',
        }}>

          {/* Poster + action buttons */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '12px',
            marginLeft: isCompact ? 0 : '4%',
            alignItems: isCompact ? 'center' : 'flex-start',
            width: isCompact ? '100%' : 'auto',
            flexShrink: 0,
          }}>
            <div style={{ width: `${posterW}px`, height: `${posterH}px`, background: C.surface, border: `1px solid ${fColor}55`, overflow: 'hidden', position: 'relative', boxShadow: `0 20px 70px rgba(0,0,0,0.85), 0 0 0 1px ${fColor}22, 0 0 50px ${fColor}0a` }}>
              <Corners color={fColor} size={13} opacity={0.55} />
              {cover
                ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '44px' }}>✦</div>
              }
            </div>

            <div style={{ width: `${posterW}px` }}>
              <button
                onClick={() => { if (!user) { navigate('/profile'); return } setShowModal(true) }}
                style={{ width: '100%', fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.18em', color: existing ? (statusCfg?.color || C.green) : C.gold, background: existing ? `${statusCfg?.color || C.green}15` : 'rgba(163,230,53,0.12)', border: `1px solid ${existing ? (statusCfg?.color || C.green) + '55' : C.gold + '66'}`, padding: '12px', minHeight: isCompact ? '44px' : 'auto', cursor: 'pointer', transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textTransform: 'uppercase' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                {existing ? <>{statusCfg?.icon} {existing.status}</> : <>+ Add to My List</>}
              </button>
            </div>
          </div>

          {/* Info column */}
          <div style={{
            flex: 1,
            minWidth: isCompact ? '0' : '280px',
            width: isCompact ? '100%' : 'auto',
            display: 'flex', flexDirection: 'column', gap: '20px',
          }}>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', letterSpacing: '0.18em', color: fColor, padding: '5px 13px', border: `1px solid ${fColor}55`, background: fColor + '10', fontFamily: '"Cinzel", serif', fontWeight: 700 }}>{format}</span>
              {data.status && (
                <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: data.status === 'FINISHED' ? C.textMuted : C.green, padding: '5px 13px', border: `1px solid ${data.status === 'FINISHED' ? C.textDim + '44' : C.green + '44'}`, background: data.status === 'FINISHED' ? 'transparent' : C.greenSoft, fontFamily: '"Cinzel", serif' }}>
                  {formatStatus(data.status)}
                </span>
              )}
              {data.countryOfOrigin && data.countryOfOrigin !== 'JP' && (
                <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: C.aurora, padding: '5px 13px', border: `1px solid ${C.aurora}44`, background: C.auroraSoft, fontFamily: '"Cinzel", serif' }}>{data.countryOfOrigin}</span>
              )}
            </div>

            {/* Title */}
            <div>
              <h2 style={{ fontFamily: '"Cinzel", serif', fontSize: 'clamp(24px, 3.5vw, 44px)', fontWeight: 700, letterSpacing: '0.05em', color: C.text, margin: 0, lineHeight: 1.15, textShadow: `0 0 50px ${fColor}18` }}>
                {title}
                {year && <span style={{ fontSize: 'clamp(14px, 1.8vw, 22px)', color: C.textDim, fontWeight: 400, marginLeft: '14px', letterSpacing: '0.1em' }}>({year})</span>}
              </h2>
              {altTitle && altTitle !== title && (
                <div style={{ fontSize: '14px', color: C.textMuted, marginTop: '6px', fontStyle: 'italic', letterSpacing: '0.04em' }}>{altTitle}</div>
              )}
              {nativeTitle && (
                <div style={{ fontSize: '13px', color: C.textDim, marginTop: '4px', letterSpacing: '0.06em' }}>{nativeTitle}</div>
              )}
            </div>

            {/* Scores */}
            <div style={{ display: 'flex', gap: isCompact ? '20px' : '36px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {aniScore && parseFloat(aniScore) > 0 && (
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '5px' }}>ᛏ AniList</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontFamily: '"Cinzel", serif', fontSize: isCompact ? '32px' : '38px', fontWeight: 700, color: C.gold, textShadow: '0 0 24px rgba(163,230,53,0.5)', lineHeight: 1 }}>★ {aniScore}</span>
                    <span style={{ fontSize: '12px', color: C.textDim }}>/10</span>
                  </div>
                  {data.favourites > 0 && <div style={{ fontSize: '10px', color: C.textDim, marginTop: '3px' }}>{data.favourites.toLocaleString()} favourites</div>}
                </div>
              )}
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '5px' }}>★ Mine</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontFamily: '"Cinzel", serif', fontSize: isCompact ? '32px' : '38px', fontWeight: 700, color: myRatingColor(existing?.rating), lineHeight: 1, transition: 'color 0.3s' }}>
                    {existing?.rating || '—'}
                  </span>
                  <span style={{ fontSize: '12px', color: C.textDim }}>/10</span>
                </div>
                {!existing && <div style={{ fontSize: '10px', color: C.textDim, marginTop: '3px' }}>Not in list</div>}
              </div>
              {data.popularity > 0 && (
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '5px' }}>ᚱ Popularity</div>
                  <div style={{ fontFamily: '"Cinzel", serif', fontSize: '28px', fontWeight: 700, color: '#67E8F9', lineHeight: 1 }}>#{data.popularity}</div>
                </div>
              )}
            </div>

            {/* Episodes / runtime / progress */}
            <div style={{ display: 'flex', gap: isCompact ? '18px' : '28px', flexWrap: 'wrap' }}>
              {[
                data.episodes > 0   && { label: 'Episodes',    value: data.episodes,    rune: 'ᚹ' },
                runtime             && { label: 'Runtime',     value: runtime,           rune: 'ᛏ' },
                existing?.episodes?.total > 0 && { label: 'My Progress', value: `${existing.episodes.current}/${existing.episodes.total}`, rune: 'ᛗ', color: fColor },
              ].filter(Boolean).map((item) => (
                <div key={item.label}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '4px' }}>{item.rune} {item.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: item.color || C.text, fontFamily: '"Cinzel", serif' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Genres */}
            {data.genres?.length > 0 && (
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {data.genres.map((g, i) => (
                  <span key={i} style={{ fontSize: '10px', letterSpacing: '0.12em', color: C.textMuted, padding: '5px 13px', border: `1px solid ${C.borderPrimary}`, background: C.surface, fontFamily: '"Cinzel", serif' }}>
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Studios */}
            {mainStudios.length > 0 && (
              <div style={{ fontSize: '12px', color: C.textDim, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: C.primary + '77', fontFamily: '"Cinzel", serif', fontSize: '14px' }}>ᚾ</span>
                <span style={{ color: C.textMuted }}>{mainStudios.join(' · ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trailer */}
      {data.trailer?.id && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Trailer" rune="▶" />
          <TrailerSection trailer={data.trailer} isCompact={isCompact} />
        </div>
      )}

      {/* My Review */}
      {existing?.review && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="My Review" rune="ᚾ" />
          <div style={{ padding: isCompact ? '18px 20px' : '22px 26px', background: C.surface, border: `1px solid ${C.borderPrimary}`, position: 'relative' }}>
            <Corners color={C.primary} size={10} opacity={0.2} />
            <p style={{ fontSize: '14px', color: C.textMuted, lineHeight: 1.85, margin: 0, letterSpacing: '0.02em', fontStyle: 'italic' }}>
              "{existing.review}"
            </p>
          </div>
        </div>
      )}

      {/* Synopsis */}
      {data.description && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Synopsis" rune="ᛊ" />
          <div style={{ padding: isCompact ? '18px 20px' : '24px 28px', background: C.surface, border: `1px solid ${C.borderPrimary}`, position: 'relative' }}>
            <Corners color={C.primary} size={10} opacity={0.2} />
            <p style={{ fontSize: '15px', color: C.textMuted, lineHeight: 1.9, margin: 0, letterSpacing: '0.02em' }}>
              {data.description.replace(/<[^>]*>/g, '')}
            </p>
          </div>
        </div>
      )}

      {/* Overview */}
      <div style={{ marginBottom: '56px' }}>
        <SectionDivider title="Overview" rune="ᚱ" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

          {/* AniList metadata grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Format',     value: format,                                        rune: 'ᛏ' },
              { label: 'Source',     value: formatSource(data.source),                     rune: 'ᚢ' },
              { label: 'Start Date', value: anilistDateToString(data.startDate),            rune: 'ᛞ' },
              { label: 'End Date',   value: anilistDateToString(data.endDate),              rune: 'ᛞ' },
              { label: 'Season',     value: data.season && data.seasonYear ? `${data.season.charAt(0).toUpperCase() + data.season.slice(1).toLowerCase()} ${data.seasonYear}` : null, rune: 'ᚨ' },
              { label: 'Popularity', value: data.popularity ? `#${data.popularity}` : null, rune: 'ᚠ' },
            ].filter((r) => r.value).map((row) => (
              <div key={row.label} style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.borderPrimary}` }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '6px' }}>
                  <span style={{ color: C.primary + '77', marginRight: '6px' }}>{row.rune}</span>{row.label}
                </div>
                <div style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* My entry grid */}
          {existing && (() => {
            const myRows = [
              existing.dateStarted   && { label: 'My Start Date', value: formatDate(existing.dateStarted),   rune: 'ᛞ' },
              existing.dateCompleted && { label: 'My End Date',   value: formatDate(existing.dateCompleted), rune: 'ᛞ' },
              existing.rewatchCount > 0 && { label: 'Rewatched', value: `${existing.rewatchCount}×`,         rune: 'ᚲ' },
              existing.platforms?.length > 0 && { label: 'Watching On', value: existing.platforms.map((p) => p.name).join(', '), rune: 'ᛚ' },
            ].filter(Boolean)
            if (!myRows.length) return null
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase' }}>ᛗ My Entry</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                  {myRows.map((row) => (
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

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '12px' }}>ᚷ Tags</div>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {tags.map((t, i) => (
                  <span key={i} style={{ fontSize: '11px', color: C.textDim, padding: '4px 10px', border: `1px solid ${C.textDim}33`, background: C.surface, letterSpacing: '0.05em' }}>{t.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* External links */}
          {watchLinks.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '12px' }}>ᛚ Watch Online</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {watchLinks.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', letterSpacing: '0.1em', color: C.primary, padding: '6px 14px', border: `1px solid ${C.primary}44`, background: C.primarySoft, fontFamily: '"Cinzel", serif', textDecoration: 'none', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(94,234,212,0.2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = C.primarySoft }}
                  >{link.site}</a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Staff */}
      {staffEdges.length > 0 && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Staff" rune="ᚾ" right={`${staffEdges.length} listed`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px 12px' }}>
            {staffEdges.map((edge, i) => <StaffCard key={i} edge={edge} />)}
          </div>
        </div>
      )}

      {/* Characters */}
      {charEdges.length > 0 && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Characters" rune="ᛈ" right={`${charEdges.length} listed`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px 12px' }}>
            {(showAllCast ? charEdges : charEdges.slice(0, 12)).map((edge, i) => (
              <CharacterCard key={i} edge={edge} />
            ))}
          </div>
          {charEdges.length > 12 && (
            <button
              onClick={() => setShowAllCast((s) => !s)}
              style={{ marginTop: '22px', fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.primary, background: C.primarySoft, border: `1px solid ${C.primary}44`, padding: '10px 24px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(94,234,212,0.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.primarySoft }}
            >{showAllCast ? '▲ Show Less' : `▼ Show All ${charEdges.length} Characters`}</button>
          )}
        </div>
      )}

      {/* Relations */}
      {relationEdges.length > 0 && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Related Titles" rune="ᚦ" right={`${relationEdges.length} related`} />
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {relationEdges.map((edge, i) => <RelationCard key={i} edge={edge} />)}
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <AddToListModal
          animeData={data}
          existingEntry={existing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchExisting(data.id) }}
          onDeleted={() => { setShowModal(false); setExisting(null) }}
          isCompact={isCompact}
        />
      )}
    </div>
  )
}