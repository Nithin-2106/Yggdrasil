import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const TMDB_BASE = '/api/tmdb'
const IMG_BASE  = 'https://image.tmdb.org/t/p'
const API       = '/api/media/drama'

const C = {
  bg:           '#080D1A',
  surface:      '#0D1526',
  surfaceHover: '#111E33',
  input:        '#0A1220',
  ember:        '#C2410C',
  gold:         '#CA8A04',
  goldBright:   '#F59E0B',
  goldSoft:     'rgba(202,138,4,0.15)',
  electric:     '#38BDF8',
  electricSoft: 'rgba(56,189,248,0.1)',
  violet:       '#7C3AED',
  green:        '#22C55E',
  greenSoft:    'rgba(34,197,94,0.12)',
  red:          '#EF4444',
  redSoft:      'rgba(239,68,68,0.12)',
  text:         '#F0F4FC',
  textMuted:    '#9BAFC8',
  textDim:      '#4A607A',
  borderGold:   'rgba(202,138,4,0.25)',
  borderElec:   'rgba(56,189,248,0.2)',
}

const STATUS_CONFIG = {
  'Watching':      { color: '#38BDF8', icon: '▶', rune: 'ᚹ' },
  'Completed':     { color: '#22C55E', icon: '✓', rune: 'ᚲ' },
  'Dropped':       { color: '#EF4444', icon: '✕', rune: 'ᛞ' },
  'Plan to Watch': { color: '#7C3AED', icon: '◷', rune: 'ᛈ' },
  'On Hold':       { color: '#F59E0B', icon: '⏸', rune: 'ᛟ' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectType(item) {
  const origin = (item.origin_country || []).map(c => c.toUpperCase())
  if (origin.includes('KR')) return 'Kdrama'
  if (origin.includes('CN') || origin.includes('TW') || origin.includes('HK')) return 'Cdrama'
  if (origin.includes('JP')) return 'Jdrama'
  return 'Kdrama'
}

function typeColor(type) {
  if (type === 'Kdrama') return C.electric
  if (type === 'Cdrama') return C.violet
  if (type === 'Jdrama') return C.goldBright
  return C.electric
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Corners({ color = C.goldBright, size = 12, opacity = 0.5 }) {
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
            {[0,1,2].map(i => <SkeletonBlock key={i} w="70px" h="40px" />)}
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

function SectionDivider({ title, rune, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
      {rune && <span style={{ fontFamily: '"Cinzel", serif', fontSize: '18px', color: C.gold }}>{rune}</span>}
      <h3 style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', fontWeight: 700, letterSpacing: '0.35em', color: C.goldBright, margin: 0, textTransform: 'uppercase' }}>
        {title}
      </h3>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(202,138,4,0.4), transparent)' }} />
      {right && <span style={{ fontSize: '11px', color: C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}>{right}</span>}
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
    if (r >= 6) return C.goldBright
    if (r >= 4) return C.ember
    return C.red
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '42px', fontWeight: 700, color: ratingColor(display), lineHeight: 1, transition: 'all 0.15s' }}>
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
                border: `1px solid ${(isHov || isActive) ? col : C.borderGold}`,
                cursor: 'pointer', transition: 'all 0.1s', position: 'relative',
              }}
            >
              {step % 1 === 0 && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontFamily: '"Cinzel", serif', color: (isHov || isActive) ? C.bg : C.textDim, fontWeight: 700 }}>
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
          onMouseEnter={e => e.currentTarget.style.color = C.red}
          onMouseLeave={e => e.currentTarget.style.color = C.textDim}
        >× Clear rating</button>
      )}
    </div>
  )
}

// ── Add/Edit modal ────────────────────────────────────────────────────────────
function AddToListModal({ tmdbData, existingEntry, onClose, onSaved, onDeleted }) {
  const type = detectType(tmdbData)
  const year = tmdbData.first_air_date ? tmdbData.first_air_date.split('-')[0] : null
  const poster = tmdbData.poster_path ? `${IMG_BASE}/w500${tmdbData.poster_path}` : ''

  const buildDefault = () => ({
    tmdbId:        tmdbData.id,
    title:         tmdbData.name || tmdbData.original_name || '',
    coverImage:    poster,
    status:        'Plan to Watch',
    type,
    format:        'Series',
    rating:        null,
    episodes:      { current: 0, total: tmdbData.number_of_episodes || null },
    year:          year ? parseInt(year) : null,
    genres:        (tmdbData.genres || []).map(g => g.name),
    review:        '',
    rewatchCount:  0,
    dateStarted:   null,
    dateCompleted: null,
    platforms:     [],
    customTags:    [],
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
    border: `1px solid ${focusedField === field ? C.electric + '99' : C.borderGold}`,
    color: C.text, fontSize: '13px', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focusedField === field ? `0 0 12px rgba(56,189,248,0.1)` : 'none',
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
          background: 'rgba(5,10,20,0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', paddingTop: '80px',
        }}
      >
        <div style={{
          background: C.surface, border: `1px solid ${C.borderGold}`,
          width: '100%', maxWidth: '720px',
          maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
          position: 'relative', boxShadow: '0 0 80px rgba(0,0,0,0.8)',
        }} className="modal-scroll">
          <Corners color={C.goldBright} size={12} opacity={0.4} />

          {/* Header */}
          <div style={{
            padding: '20px 28px 16px',
            borderBottom: `1px solid ${C.borderGold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, background: C.surface, zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: '"Cinzel", serif', fontSize: '14px', color: C.gold }}>ᛚ</span>
              <span style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.3em', color: C.goldBright, textTransform: 'uppercase', fontWeight: 700 }}>
                {existingEntry ? 'Edit Entry' : 'Add to My List'}
              </span>
            </div>
            <button onClick={onClose}
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
                <div style={{ fontFamily: '"Cinzel", serif', fontSize: '13px', fontWeight: 700, color: C.text, letterSpacing: '0.05em', lineHeight: 1.4 }}>
                  {tmdbData.name || tmdbData.original_name}
                </div>
                {year && <div style={{ fontSize: '11px', color: C.goldBright, fontFamily: '"Cinzel", serif', marginTop: '4px', letterSpacing: '0.1em' }}>{year}</div>}
              </div>
              <div style={{ width: '160px', height: '230px', background: C.bg, border: `1px solid ${C.borderGold}`, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                <Corners color={C.gold} size={10} opacity={0.35} />
                {coverSrc
                  ? <img src={coverSrc} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px' }}>📺</div>
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
                  <input type="number" min="0" placeholder="Current" value={form.episodes?.current ?? ''}
                    onChange={e => setEp('current', e.target.value)}
                    onFocus={() => setFocused('epCurrent')} onBlur={() => setFocused('')}
                    style={{ ...inputStyle('epCurrent'), width: '72px', flexShrink: 0 }}
                  />
                  <span style={{ color: C.textDim, fontSize: '14px', flexShrink: 0 }}>/</span>
                  <input type="number" min="0" placeholder="Total" value={form.episodes?.total ?? ''}
                    onChange={e => setEp('total', e.target.value)}
                    onFocus={() => setFocused('epTotal')} onBlur={() => setFocused('')}
                    style={{ ...inputStyle('epTotal'), width: '72px', flexShrink: 0 }}
                  />
                  <span style={{ color: C.textDim, fontSize: '11px', letterSpacing: '0.15em', fontFamily: '"Cinzel", serif', flexShrink: 0, marginLeft: '6px' }}>ᚲ</span>
                  <input type="number" min="0" placeholder="Rewatch" value={form.rewatchCount || ''}
                    onChange={e => set('rewatchCount', e.target.value === '' ? 0 : Number(e.target.value))}
                    onFocus={() => setFocused('rewatch')} onBlur={() => setFocused('')}
                    style={{ ...inputStyle('rewatch'), width: '80px', flexShrink: 0 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>ᛞ Date Started</label>
                  <input type="date" value={form.dateStarted?.split('T')[0] ?? ''}
                    onChange={e => set('dateStarted', e.target.value)}
                    onFocus={() => setFocused('dateStart')} onBlur={() => setFocused('')}
                    style={inputStyle('dateStart')}
                  />
                </div>
                <div>
                  <label style={lbl}>ᛞ Date Completed</label>
                  <input type="date" value={form.dateCompleted?.split('T')[0] ?? ''}
                    onChange={e => set('dateCompleted', e.target.value)}
                    onFocus={() => setFocused('dateEnd')} onBlur={() => setFocused('')}
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
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: C.input, border: `1px solid ${C.borderGold}` }}>
                      <span style={{ flex: 1, fontSize: '12px', color: C.text }}>{p.name}</span>
                      {p.url && <span style={{ fontSize: '10px', color: C.textDim, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>}
                      <button onClick={() => removePlat(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>×</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input placeholder="Platform" value={platName} onChange={e => setPlatName(e.target.value)}
                      onFocus={() => setFocused('platName')} onBlur={() => setFocused('')}
                      style={{ ...inputStyle('platName'), flex: 1 }}
                    />
                    <input placeholder="URL (optional)" value={platUrl} onChange={e => setPlatUrl(e.target.value)}
                      onFocus={() => setFocused('platUrl')} onBlur={() => setFocused('')}
                      style={{ ...inputStyle('platUrl'), flex: 2 }}
                    />
                    <button onClick={addPlat}
                      style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', color: C.electric, background: C.electricSoft, border: `1px solid ${C.electric}44`, padding: '0 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
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
                  placeholder="Your thoughts on this drama..."
                  style={{ ...inputStyle('review'), resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              {error && <div style={{ fontSize: '12px', color: C.red, letterSpacing: '0.05em' }}>{error}</div>}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 28px 24px',
            borderTop: `1px solid ${C.borderGold}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            position: 'sticky', bottom: 0, background: C.surface,
          }}>
            <div>
              {existingEntry && (
                <button onClick={handleDelete} disabled={deleting}
                  style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.red, background: C.redSoft, border: `1px solid ${C.red}44`, padding: '10px 20px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = C.redSoft}
                >{deleting ? 'Deleting...' : '✕ Delete'}</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose}
                style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.textMuted, background: 'transparent', border: `1px solid ${C.borderGold}`, padding: '10px 20px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.textMuted }}
                onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.borderGold }}
              >Cancel</button>
              <button onClick={handleSave} disabled={saving}
                style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.electric, background: C.electricSoft, border: `1px solid ${C.electric}55`, padding: '10px 28px', cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'rgba(56,189,248,0.2)' }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = C.electricSoft }}
              >{saving ? 'Saving...' : existingEntry ? '✓ Update' : '✓ Submit'}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Cast card ─────────────────────────────────────────────────────────────────
function CastCard({ person }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: '100px', flexShrink: 0, transform: hov ? 'translateY(-4px)' : 'none', transition: 'transform 0.2s' }}
    >
      <div style={{ width: '100px', height: '134px', background: C.surface, border: `1px solid ${hov ? C.electric + '66' : C.borderGold}`, overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s' }}>
        {person.profile_path
          ? <img src={`${IMG_BASE}/w185${person.profile_path}`} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px', background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>👤</div>
        }
        {hov && <Corners color={C.electric} size={8} opacity={0.5} />}
      </div>
      <div style={{ marginTop: '7px', fontSize: '11px', fontWeight: 600, color: hov ? C.text : C.textMuted, transition: 'color 0.2s', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{person.name}</div>
      <div style={{ fontSize: '10px', color: C.textDim, marginTop: '3px', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontStyle: 'italic' }}>{person.character}</div>
    </div>
  )
}

// ── Image grid ────────────────────────────────────────────────────────────────
function ImageGrid({ images, type = 'backdrop' }) {
  const [lightbox, setLightbox] = useState(null)
  const [showAll, setShowAll]   = useState(false)
  const [hov, setHov]           = useState(null)
  const isBack  = type === 'backdrop'
  const visible = showAll ? images : images.slice(0, 6)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isBack ? 'repeat(auto-fill, minmax(200px, 1fr))' : 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
        {visible.map((img, i) => (
          <div
            key={i}
            onClick={() => setLightbox(`${IMG_BASE}/original${img.file_path}`)}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            style={{ aspectRatio: isBack ? '16/9' : '2/3', overflow: 'hidden', cursor: 'pointer', border: `1px solid ${hov === i ? C.electric + '55' : C.borderGold}`, transition: 'all 0.2s', transform: hov === i ? 'scale(1.02)' : 'scale(1)' }}
          >
            <img src={`${IMG_BASE}/${isBack ? 'w300' : 'w154'}${img.file_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>
      {images.length > 6 && (
        <button
          onClick={() => setShowAll(s => !s)}
          style={{ marginTop: '14px', fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.electric, background: 'transparent', border: `1px solid ${C.electric}44`, padding: '8px 20px', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = C.electricSoft}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >{showAll ? '▲ Show Less' : `▼ Show All ${images.length}`}</button>
      )}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(5,10,20,0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', border: `1px solid ${C.borderGold}` }} />
        </div>
      )}
    </div>
  )
}

// ── Trailer section ───────────────────────────────────────────────────────────
function TrailerSection({ videos }) {
  const [active, setActive] = useState(null)
  const trailers = (videos || []).filter(v => v.site === 'YouTube')
  if (!trailers.length) return <div style={{ color: C.textDim, fontSize: '13px' }}>No trailers available</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
        {trailers.map(v => (
          <div
            key={v.key}
            onClick={() => setActive(active === v.key ? null : v.key)}
            style={{ flexShrink: 0, width: '190px', cursor: 'pointer' }}
          >
            <div style={{ position: 'relative', height: '107px', border: `1px solid ${active === v.key ? C.electric + '88' : C.borderGold}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              <img src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,13,26,0.45)' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: active === v.key ? C.electric : 'rgba(56,189,248,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', transition: 'background 0.2s' }}>▶</div>
              </div>
            </div>
            <div style={{ marginTop: '6px', fontSize: '11px', color: active === v.key ? C.electric : C.textMuted, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.name}</div>
          </div>
        ))}
      </div>
      {active && (
        <div style={{ marginTop: '14px', position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${active}?autoplay=1`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: `1px solid ${C.borderElec}` }}
            allow="autoplay; encrypted-media" allowFullScreen title="trailer"
          />
        </div>
      )}
    </div>
  )
}

// ── Main InfoPage ─────────────────────────────────────────────────────────────
export default function InfoPage({ tmdbId, onBack }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [data, setData]         = useState(null)
  const [credits, setCredits]   = useState(null)
  const [images, setImages]     = useState(null)
  const [videos, setVideos]     = useState(null)
  const [keywords, setKeywords] = useState([])
  const [existing, setExisting] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [showAllCast,  setShowAllCast]  = useState(false)
  const [showTrailers, setShowTrailers] = useState(false)

  // ── FIXED: hoisted so useEffect can safely reference it ───────────────────
  const fetchExisting = useCallback(async (tmdbIdToMatch) => {
    try {
      const r = await axios.get(API)
      const found = r.data.find(e => e.tmdbId === tmdbIdToMatch)
      setExisting(found || null)
    } catch {
      // silently ignore — non-critical
    }
  }, [])

  useEffect(() => {
    if (!tmdbId) return
    window.scrollTo({ top: 0, behavior: 'instant' })
    setLoading(true)
    setData(null)
    setShowModal(false)
    setShowAllCast(false)
    setShowTrailers(false)
    setExisting(null)

    Promise.all([
      fetch(`${TMDB_BASE}?path=tv/${tmdbId}`).then(r => r.json()),
      fetch(`${TMDB_BASE}?path=tv/${tmdbId}/credits`).then(r => r.json()),
      fetch(`${TMDB_BASE}?path=tv/${tmdbId}/images`).then(r => r.json()),
      fetch(`${TMDB_BASE}?path=tv/${tmdbId}/videos`).then(r => r.json()),
      fetch(`${TMDB_BASE}?path=tv/${tmdbId}/keywords`).then(r => r.json()),
    ])
      .then(async ([d, c, img, v, kw]) => {
        setData(d)
        setCredits(c)
        setImages(img)
        setVideos(v)
        setKeywords((kw.results || []).slice(0, 20))
        await fetchExisting(d.id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tmdbId, fetchExisting])

  if (loading) return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
      <Spinner />
    </>
  )

  if (!data) return (
    <div style={{ color: C.textDim, fontFamily: '"Cinzel", serif', fontSize: '13px' }}>
      Failed to load drama information.
    </div>
  )

  const type        = detectType(data)
  const tColor      = typeColor(type)
  const backdrop    = data.backdrop_path ? `${IMG_BASE}/w1280${data.backdrop_path}` : null
  const poster      = data.poster_path   ? `${IMG_BASE}/w500${data.poster_path}`    : null
  const year        = data.first_air_date ? data.first_air_date.split('-')[0] : null
  const tmdbRating  = data.vote_average ? data.vote_average.toFixed(1) : null
  const runtime     = data.episode_run_time?.[0]
  const cast        = credits?.cast || []
  const backdrops   = images?.backdrops || []
  const posters     = images?.posters   || []
  const trailerCount = (videos?.results || []).filter(v => v.site === 'YouTube').length
  const statusCfg   = existing ? (STATUS_CONFIG[existing.status] || {}) : null

  const myRatingColor = (r) => {
    if (!r) return C.textDim
    if (r >= 8) return C.green
    if (r >= 6) return C.goldBright
    if (r >= 4) return C.ember
    return C.red
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {/* ── Back ── */}
      <div style={{ marginBottom: '36px' }}>
        <button
          onClick={onBack}
          style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.25em', color: C.textDim, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = C.electric}
          onMouseLeave={e => e.currentTarget.style.color = C.textDim}
        >← Back to Search</button>
      </div>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', marginBottom: '60px' }}>
        {backdrop && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${backdrop})`, backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 0.1, filter: 'blur(3px)' }} />
        )}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '52px', alignItems: 'flex-start', flexWrap: 'wrap', padding: backdrop ? '36px 0 52px' : '0' }}>

          {/* Poster + action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '4%', flexShrink: 0 }}>
            <div style={{ width: '230px', height: '335px', background: C.surface, border: `1px solid ${tColor}55`, overflow: 'hidden', position: 'relative', boxShadow: `0 20px 70px rgba(0,0,0,0.85), 0 0 0 1px ${tColor}22, 0 0 50px ${tColor}0a` }}>
              <Corners color={tColor} size={13} opacity={0.55} />
              {poster
                ? <img src={poster} alt={data.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '44px' }}>📺</div>
              }
            </div>

            <div style={{ width: '230px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <button
                onClick={() => setShowTrailers(s => !s)}
                style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: showTrailers ? C.bg : C.electric, background: showTrailers ? C.electric : C.electricSoft, border: `1px solid ${C.electric}66`, padding: '12px', cursor: 'pointer', transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textTransform: 'uppercase' }}
              >
                ▶ Trailers {trailerCount > 0 && <span style={{ fontSize: '10px', opacity: 0.7 }}>({trailerCount})</span>}
              </button>

              <button
                onClick={() => { if (!user) { navigate('/profile'); return } setShowModal(true) }}
                style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.18em', color: existing ? (statusCfg?.color || C.green) : C.goldBright, background: existing ? `${statusCfg?.color || C.green}15` : 'rgba(202,138,4,0.12)', border: `1px solid ${existing ? (statusCfg?.color || C.green) + '55' : C.gold + '66'}`, padding: '12px', cursor: 'pointer', transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textTransform: 'uppercase' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {existing ? <>{statusCfg?.icon} {existing.status}</> : <>+ Add to My List</>}
              </button>
            </div>
          </div>

          {/* Info panel */}
          <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', letterSpacing: '0.18em', color: tColor, padding: '5px 13px', border: `1px solid ${tColor}55`, background: tColor + '10', fontFamily: '"Cinzel", serif', fontWeight: 700 }}>{type}</span>
              {data.status && (
                <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: data.status === 'Ended' ? C.textMuted : C.green, padding: '5px 13px', border: `1px solid ${data.status === 'Ended' ? C.textDim + '44' : C.green + '44'}`, background: data.status === 'Ended' ? 'transparent' : C.greenSoft, fontFamily: '"Cinzel", serif' }}>
                  {data.status}
                </span>
              )}
            </div>

            {/* Title */}
            <div>
              <h2 style={{ fontFamily: '"Cinzel", serif', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 700, letterSpacing: '0.05em', color: C.text, margin: 0, lineHeight: 1.15, textShadow: `0 0 50px ${tColor}18` }}>
                {data.name}
                {year && <span style={{ fontSize: 'clamp(15px, 1.8vw, 22px)', color: C.textDim, fontWeight: 400, marginLeft: '14px', letterSpacing: '0.1em' }}>({year})</span>}
              </h2>
              {data.original_name && data.original_name !== data.name && (
                <div style={{ fontSize: '14px', color: C.textMuted, marginTop: '8px', fontStyle: 'italic', letterSpacing: '0.04em' }}>{data.original_name}</div>
              )}
            </div>

            {/* Ratings */}
            <div style={{ display: 'flex', gap: '36px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {tmdbRating && parseFloat(tmdbRating) > 0 && (
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '5px' }}>ᛏ TMDB</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontFamily: '"Cinzel", serif', fontSize: '38px', fontWeight: 700, color: C.goldBright, textShadow: `0 0 24px rgba(245,158,11,0.5)`, lineHeight: 1 }}>★ {tmdbRating}</span>
                    <span style={{ fontSize: '12px', color: C.textDim }}>/10</span>
                  </div>
                  {data.vote_count > 0 && <div style={{ fontSize: '10px', color: C.textDim, marginTop: '3px', letterSpacing: '0.05em' }}>{data.vote_count.toLocaleString()} votes</div>}
                </div>
              )}
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '5px' }}>★ Mine</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontFamily: '"Cinzel", serif', fontSize: '38px', fontWeight: 700, color: myRatingColor(existing?.rating), lineHeight: 1, transition: 'color 0.3s' }}>
                    {existing?.rating || '—'}
                  </span>
                  <span style={{ fontSize: '12px', color: C.textDim }}>/10</span>
                </div>
                {!existing && <div style={{ fontSize: '10px', color: C.textDim, marginTop: '3px', letterSpacing: '0.05em' }}>Not in list</div>}
              </div>
            </div>

            {/* Seasons / Episodes / Runtime / My Progress */}
            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
              {[
                data.number_of_seasons > 0 && { label: 'Seasons',     value: data.number_of_seasons, rune: 'ᚢ' },
                data.number_of_episodes > 0 && { label: 'Episodes',    value: data.number_of_episodes, rune: 'ᚹ' },
                runtime                     && { label: 'Runtime',     value: `${runtime}m`, rune: 'ᛏ' },
                existing?.episodes?.total > 0 && { label: 'My Progress', value: `${existing.episodes.current}/${existing.episodes.total}`, rune: 'ᛗ', color: tColor },
              ].filter(Boolean).map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '4px' }}>{item.rune} {item.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: item.color || C.text, fontFamily: '"Cinzel", serif' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Genres */}
            {data.genres?.length > 0 && (
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {data.genres.map(g => (
                  <span key={g.id} style={{ fontSize: '10px', letterSpacing: '0.12em', color: C.textMuted, padding: '5px 13px', border: `1px solid ${C.borderGold}`, background: C.surface, fontFamily: '"Cinzel", serif' }}>{g.name}</span>
                ))}
              </div>
            )}

            {/* Networks */}
            {data.networks?.length > 0 && (
              <div style={{ fontSize: '12px', color: C.textDim, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: C.gold + '77', fontFamily: '"Cinzel", serif', fontSize: '14px' }}>ᚾ</span>
                <span style={{ color: C.textMuted }}>{data.networks.map(n => n.name).join(' · ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Trailers ── */}
      {showTrailers && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Trailers" rune="▶" right={`${trailerCount} available`} />
          <TrailerSection videos={videos?.results} />
        </div>
      )}

      {/* ── My Review ── */}
      {existing?.review && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="My Review" rune="ᚾ" />
          <div style={{ padding: '22px 26px', background: C.surface, border: `1px solid ${C.borderGold}`, position: 'relative' }}>
            <Corners color={C.gold} size={10} opacity={0.2} />
            <p style={{ fontSize: '14px', color: C.textMuted, lineHeight: 1.85, margin: 0, letterSpacing: '0.02em', fontStyle: 'italic' }}>"{existing.review}"</p>
          </div>
        </div>
      )}

      {/* ── Synopsis ── */}
      {data.overview && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Synopsis" rune="ᛊ" />
          <div style={{ padding: '24px 28px', background: C.surface, border: `1px solid ${C.borderGold}`, position: 'relative' }}>
            <Corners color={C.gold} size={10} opacity={0.2} />
            <p style={{ fontSize: '15px', color: C.textMuted, lineHeight: 1.9, margin: 0, letterSpacing: '0.02em' }}>{data.overview}</p>
          </div>
        </div>
      )}

      {/* ── Overview ── */}
      <div style={{ marginBottom: '56px' }}>
        <SectionDivider title="Overview" rune="ᚱ" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

          {/* TMDB data grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Status',      value: data.status,        rune: 'ᛊ' },
              { label: 'First Aired', value: data.first_air_date, rune: 'ᛞ' },
              { label: 'Last Aired',  value: data.last_air_date,  rune: 'ᛞ' },
              { label: 'Runtime',     value: runtime ? `${runtime} min/ep` : null, rune: 'ᛏ' },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.borderGold}` }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '6px' }}>
                  <span style={{ color: C.gold + '77', marginRight: '6px' }}>{row.rune}</span>{row.label}
                </div>
                <div style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* My entry data */}
          {existing && (() => {
            const myRows = [
              existing.dateStarted    && { label: 'My Start Date', value: existing.dateStarted.split('T')[0],              rune: 'ᛞ' },
              existing.dateCompleted  && { label: 'My End Date',   value: existing.dateCompleted.split('T')[0],            rune: 'ᛞ' },
              existing.rewatchCount > 0 && { label: 'Rewatched',   value: `${existing.rewatchCount}×`,                    rune: 'ᚲ' },
              existing.platforms?.length > 0 && { label: 'Watching On', value: existing.platforms.map(p => p.name).join(', '), rune: 'ᛚ' },
            ].filter(Boolean)

            if (!myRows.length) return null

            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '12px' }}>ᛗ My Entry</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
                  {myRows.map(row => (
                    <div key={row.label} style={{ padding: '14px 16px', background: `${C.electric}08`, border: `1px solid ${C.electric}33` }}>
                      <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: C.electric + 'aa', fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '6px' }}>
                        <span style={{ color: C.electric + '88', marginRight: '6px' }}>{row.rune}</span>{row.label}
                      </div>
                      <div style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Seasons breakdown */}
          {data.seasons?.filter(s => s.season_number > 0).length > 0 && (
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '12px' }}>ᚢ Seasons Breakdown</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {data.seasons.filter(s => s.season_number > 0).map(season => (
                  <div key={season.id} style={{ padding: '12px 16px', background: C.surface, border: `1px solid ${C.borderGold}`, minWidth: '110px', position: 'relative' }}>
                    <Corners color={C.gold} size={7} opacity={0.15} />
                    <div style={{ fontSize: '9px', color: C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.15em', marginBottom: '4px' }}>Season {season.season_number}</div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: C.text, fontFamily: '"Cinzel", serif' }}>
                      {season.episode_count} <span style={{ fontSize: '10px', color: C.textDim, fontWeight: 400 }}>eps</span>
                    </div>
                    {season.air_date && <div style={{ fontSize: '10px', color: C.textDim, marginTop: '3px' }}>{season.air_date.split('-')[0]}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '12px' }}>ᚷ Keywords</div>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {keywords.map(k => (
                  <span key={k.id} style={{ fontSize: '11px', color: C.textDim, padding: '4px 10px', border: `1px solid ${C.textDim}33`, background: C.surface, letterSpacing: '0.05em' }}>{k.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Cast ── */}
      {cast.length > 0 && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Cast" rune="ᛈ" right={`${cast.length} members`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px 12px' }}>
            {(showAllCast ? cast : cast.slice(0, 12)).map(p => <CastCard key={p.id} person={p} />)}
          </div>
          {cast.length > 12 && (
            <button
              onClick={() => setShowAllCast(s => !s)}
              style={{ marginTop: '22px', fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.2em', color: C.electric, background: C.electricSoft, border: `1px solid ${C.electric}44`, padding: '10px 24px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = C.electricSoft}
            >{showAllCast ? '▲ Show Less' : `▼ Show All ${cast.length} Cast Members`}</button>
          )}
        </div>
      )}

      {/* ── Images ── */}
      {(backdrops.length > 0 || posters.length > 0) && (
        <div style={{ marginBottom: '56px' }}>
          <SectionDivider title="Images" rune="ᛒ" right={`${backdrops.length + posters.length} total`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
            {backdrops.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Backdrops <span style={{ color: C.electric + '88', marginLeft: '8px' }}>({backdrops.length})</span>
                </div>
                <ImageGrid images={backdrops} type="backdrop" />
              </div>
            )}
            {posters.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Posters <span style={{ color: C.electric + '88', marginLeft: '8px' }}>({posters.length})</span>
                </div>
                <ImageGrid images={posters} type="poster" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <AddToListModal
          tmdbData={data}
          existingEntry={existing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchExisting(data.id) }}
          onDeleted={() => { setShowModal(false); setExisting(null) }}
        />
      )}
    </div>
  )
}