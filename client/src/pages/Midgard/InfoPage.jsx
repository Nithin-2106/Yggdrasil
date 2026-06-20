import { useState, useEffect } from 'react'
import axios from 'axios'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY
const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMG_BASE  = 'https://image.tmdb.org/t/p'
const API       = 'http://localhost:5000/api/drama'

const C = {
  bg:           '#080D1A',
  surface:      '#0F1829',
  surfaceHover: '#141F33',
  input:        '#0A1220',
  gold:         '#CA8A04',
  goldBright:   '#F59E0B',
  goldSoft:     'rgba(202,138,4,0.15)',
  electric:     '#38BDF8',
  electricSoft: 'rgba(56,189,248,0.12)',
  violet:       '#7C3AED',
  violetSoft:   'rgba(124,58,237,0.15)',
  ember:        '#C2410C',
  emberSoft:    'rgba(194,65,12,0.15)',
  green:        '#22C55E',
  greenSoft:    'rgba(34,197,94,0.12)',
  red:          '#EF4444',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderGold:   'rgba(202,138,4,0.2)',
  borderElec:   'rgba(56,189,248,0.15)',
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

function statusColor(status) {
  const map = {
    'Watching':      C.electric,
    'Completed':     C.green,
    'Dropped':       C.red,
    'Plan to Watch': C.violet,
    'On Hold':       C.goldBright,
  }
  return map[status] || C.textMuted
}

// ── Corner ornaments ──────────────────────────────────────────────────────────
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

// ── Loading spinner ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: '20px',
    }}>
      <div style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '28px', color: C.gold + '44',
        letterSpacing: '0.4em',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>ᛟ</div>
      <div style={{
        fontSize: '11px', letterSpacing: '0.3em',
        color: C.textDim, fontFamily: '"Cinzel", serif',
        textTransform: 'uppercase',
      }}>Loading...</div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: '10px', letterSpacing: '0.15em',
      color: color || C.textMuted,
      padding: '4px 10px',
      border: `1px solid ${(color || C.textMuted) + '55'}`,
      background: (color || C.textMuted) + '0f',
      fontFamily: '"Cinzel", serif',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, rune }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {rune && <span style={{ fontFamily: '"Cinzel", serif', fontSize: '15px', color: C.gold + '77' }}>{rune}</span>}
        <h3 style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '12px', fontWeight: 600,
          letterSpacing: '0.3em', color: C.text,
          margin: 0, textTransform: 'uppercase',
        }}>{title}</h3>
      </div>
      <div style={{
        height: '1px', marginTop: '12px',
        background: `linear-gradient(to right, ${C.gold}44, ${C.electric}22, transparent)`,
      }} />
    </div>
  )
}

// ── Interactive Rating Slider ─────────────────────────────────────────────────
function RatingSlider({ value, onChange }) {
  const [hovered, setHovered] = useState(null)
  const steps = []
  for (let i = 1; i <= 10; i += 0.5) steps.push(i)

  const display = hovered !== null ? hovered : value

  const ratingColor = (r) => {
    if (!r) return C.textDim
    if (r >= 8)  return C.green
    if (r >= 6)  return C.goldBright
    if (r >= 4)  return C.ember
    return C.red
  }

  return (
    <div>
      {/* Big number display */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: '6px',
        marginBottom: '16px',
      }}>
        <span style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '48px', fontWeight: 700,
          color: ratingColor(display),
          textShadow: display ? `0 0 30px ${ratingColor(display)}66` : 'none',
          lineHeight: 1,
          transition: 'all 0.15s ease',
        }}>
          {display || '—'}
        </span>
        <span style={{ fontSize: '14px', color: C.textDim, fontFamily: '"Cinzel", serif' }}>/10</span>
      </div>

      {/* Slider dots */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
                width: step % 1 === 0 ? '28px' : '14px',
                height: '28px',
                background: (isHov || isActive) ? col : C.surface,
                border: `1px solid ${(isHov || isActive) ? col : C.borderGold}`,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                boxShadow: (isHov || isActive) ? `0 0 8px ${col}66` : 'none',
                position: 'relative',
              }}
            >
              {step % 1 === 0 && (
                <span style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontFamily: '"Cinzel", serif',
                  color: (isHov || isActive) ? C.bg : C.textDim,
                  fontWeight: 700,
                }}>
                  {step}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Clear button */}
      {value && (
        <button
          onClick={() => onChange(null)}
          style={{
            marginTop: '10px',
            fontSize: '10px', letterSpacing: '0.15em',
            color: C.textDim, background: 'transparent',
            border: 'none', cursor: 'pointer',
            fontFamily: '"Cinzel", serif',
            padding: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.red}
          onMouseLeave={e => e.currentTarget.style.color = C.textDim}
        >
          × Clear rating
        </button>
      )}
    </div>
  )
}

// ── Cast card ─────────────────────────────────────────────────────────────────
function CastCard({ person }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100px', flexShrink: 0,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.25s ease',
      }}
    >
      <div style={{
        width: '100px', height: '130px',
        background: C.surface,
        border: `1px solid ${hovered ? C.electric + '66' : C.borderGold}`,
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.25s',
      }}>
        {person.profile_path ? (
          <img
            src={`${IMG_BASE}/w185${person.profile_path}`}
            alt={person.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.textDim, fontSize: '28px',
            background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
          }}>👤</div>
        )}
        {hovered && <Corners color={C.electric} size={8} opacity={0.6} />}
      </div>
      <div style={{
        marginTop: '6px',
        fontSize: '11px', fontWeight: 600,
        color: hovered ? C.text : C.textMuted,
        transition: 'color 0.25s',
        lineHeight: 1.3,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {person.name}
      </div>
      <div style={{
        fontSize: '10px', color: C.textDim,
        marginTop: '2px', lineHeight: 1.3,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        fontStyle: 'italic',
      }}>
        {person.character}
      </div>
    </div>
  )
}

// ── Image lightbox ────────────────────────────────────────────────────────────
function ImageGrid({ images, type = 'backdrop' }) {
  const [lightbox, setLightbox] = useState(null)
  const [showAll, setShowAll]   = useState(false)
  const [hov, setHov]           = useState(null)

  const list    = images || []
  const visible = showAll ? list : list.slice(0, 8)
  const isBack  = type === 'backdrop'

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isBack
          ? 'repeat(auto-fill, minmax(200px, 1fr))'
          : 'repeat(auto-fill, minmax(110px, 1fr))',
        gap: '8px',
      }}>
        {visible.map((img, i) => {
          const src = isBack ? img.file_path : img.file_path
          const w   = isBack ? 'w300' : 'w154'
          return (
            <div
              key={i}
              onClick={() => setLightbox(`${IMG_BASE}/original${src}`)}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
              style={{
                aspectRatio: isBack ? '16/9' : '2/3',
                overflow: 'hidden',
                cursor: 'pointer',
                border: `1px solid ${hov === i ? C.electric + '66' : C.borderGold}`,
                transition: 'all 0.2s ease',
                transform: hov === i ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <img
                src={`${IMG_BASE}/${w}${src}`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )
        })}
      </div>

      {list.length > 8 && (
        <button
          onClick={() => setShowAll(s => !s)}
          style={{
            marginTop: '14px',
            fontFamily: '"Cinzel", serif',
            fontSize: '11px', letterSpacing: '0.2em',
            color: C.electric, background: 'transparent',
            border: `1px solid ${C.electric}44`,
            padding: '8px 20px', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.electricSoft}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {showAll ? `▲ Show Less` : `▼ Show All ${list.length}`}
        </button>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(5,10,20,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={lightbox}
            alt=""
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain',
              border: `1px solid ${C.borderGold}`,
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Trailer row ───────────────────────────────────────────────────────────────
function TrailerRow({ videos }) {
  const [active, setActive] = useState(null)
  const trailers = (videos || []).filter(v => v.site === 'YouTube')

  if (!trailers.length) return (
    <div style={{ color: C.textDim, fontSize: '13px', letterSpacing: '0.05em' }}>
      No trailers available
    </div>
  )

  return (
    <div>
      {/* Thumbnail row */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
        {trailers.map(v => (
          <div
            key={v.key}
            onClick={() => setActive(active === v.key ? null : v.key)}
            style={{
              flexShrink: 0, cursor: 'pointer',
              width: '200px',
            }}
          >
            <div style={{
              position: 'relative',
              height: '112px',
              border: `1px solid ${active === v.key ? C.electric + '88' : C.borderGold}`,
              overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}>
              <img
                src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`}
                alt={v.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Play overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(8,13,26,0.5)',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: active === v.key ? C.electric : 'rgba(56,189,248,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px',
                  transition: 'background 0.2s',
                }}>▶</div>
              </div>
            </div>
            <div style={{
              marginTop: '6px', fontSize: '11px',
              color: active === v.key ? C.electric : C.textMuted,
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              transition: 'color 0.2s',
            }}>
              {v.name}
            </div>
          </div>
        ))}
      </div>

      {/* Embedded player */}
      {active && (
        <div style={{ marginTop: '16px', position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${active}?autoplay=1`}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              border: `1px solid ${C.borderElec}`,
            }}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="trailer"
          />
        </div>
      )}
    </div>
  )
}

// ── Form field wrapper ────────────────────────────────────────────────────────
function Field({ label, rune, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{
        fontSize: '10px', letterSpacing: '0.3em',
        color: C.textMuted, textTransform: 'uppercase',
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
  width: '100%', padding: '10px 13px',
  background: C.input,
  border: `1px solid ${C.borderGold}`,
  color: C.text, fontSize: '13px',
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

function FInput({ style, ...props }) {
  const [f, setF] = useState(false)
  return (
    <input {...props}
      onFocus={e => { setF(true); props.onFocus?.(e) }}
      onBlur={e => { setF(false); props.onBlur?.(e) }}
      style={{ ...inputStyle, borderColor: f ? C.electric + '88' : C.borderGold, boxShadow: f ? `0 0 14px ${C.electricSoft}` : 'none', ...style }}
    />
  )
}

function FSelect({ children, style, ...props }) {
  const [f, setF] = useState(false)
  return (
    <select {...props}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={{ ...inputStyle, borderColor: f ? C.electric + '88' : C.borderGold, boxShadow: f ? `0 0 14px ${C.electricSoft}` : 'none', cursor: 'pointer', ...style }}
    >
      {children}
    </select>
  )
}

function FTextarea({ style, ...props }) {
  const [f, setF] = useState(false)
  return (
    <textarea {...props}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={{ ...inputStyle, borderColor: f ? C.electric + '88' : C.borderGold, boxShadow: f ? `0 0 14px ${C.electricSoft}` : 'none', resize: 'vertical', minHeight: '80px', ...style }}
    />
  )
}

// ── My Entry form ─────────────────────────────────────────────────────────────
function MyEntryForm({ tmdbData, existingEntry, onSaved }) {
  const type = detectType(tmdbData)

  const buildDefault = () => ({
    title:         tmdbData.name || tmdbData.original_name || '',
    coverImage:    tmdbData.poster_path ? `${IMG_BASE}/w500${tmdbData.poster_path}` : '',
    status:        'Plan to Watch',
    type,
    format:        (tmdbData.number_of_seasons > 1 || !tmdbData.number_of_episodes) ? 'Series' : 'Series',
    rating:        null,
    episodes:      { current: 0, total: tmdbData.number_of_episodes || null },
    year:          tmdbData.first_air_date ? parseInt(tmdbData.first_air_date.split('-')[0]) : null,
    genres:        (tmdbData.genres || []).map(g => g.name),
    review:        '',
    rewatchCount:  0,
    dateStarted:   null,
    dateCompleted: null,
    platforms:     [],
    customTags:    [],
  })

  const [form, setForm]               = useState(existingEntry || buildDefault())
  const [coverOverride, setCoverOver] = useState('')
  const [genreInput, setGenreInput]   = useState((form.genres || []).join(', '))
  const [tagInput, setTagInput]       = useState((form.customTags || []).join(', '))
  const [platName, setPlatName]       = useState('')
  const [platUrl, setPlatUrl]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')

  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setEp  = (k, v) => setForm(f => ({ ...f, episodes: { ...f.episodes, [k]: v === '' ? null : Number(v) } }))
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
      const payload = {
        ...form,
        coverImage:  coverSrc,
        genres:      genreInput.split(',').map(g => g.trim()).filter(Boolean),
        customTags:  tagInput.split(',').map(t => t.trim()).filter(Boolean),
        rating:      form.rating ? Number(form.rating) : null,
        year:        form.year ? Number(form.year) : null,
        dateStarted:   form.dateStarted || null,
        dateCompleted: form.dateCompleted || null,
      }
      if (existingEntry?._id) {
        await axios.put(`${API}/${existingEntry._id}`, payload)
      } else {
        await axios.post(API, payload)
      }
      setSaved(true)
      setTimeout(() => { setSaved(false); onSaved?.() }, 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '36px', flexWrap: 'wrap' }}>

      {/* Left — cover */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>
        <div style={{
          width: '160px', height: '230px',
          background: C.surface,
          border: `1px solid ${C.borderGold}`,
          overflow: 'hidden', position: 'relative',
        }}>
          <Corners color={C.gold} size={10} opacity={0.4} />
          {coverSrc
            ? <img src={coverSrc} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '28px' }}>📺</div>
          }
        </div>
        <Field label="Override Cover URL" rune="ᛈ">
          <FInput
            placeholder="Paste image URL..."
            value={coverOverride}
            onChange={e => setCoverOver(e.target.value)}
            style={{ width: '160px', fontSize: '11px', boxSizing: 'border-box' }}
          />
        </Field>
      </div>

      {/* Right — fields */}
      <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <Field label="Title" rune="ᛏ">
          <FInput value={form.title} onChange={e => set('title', e.target.value)} placeholder="Drama title" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <Field label="Type" rune="ᚦ">
            <FSelect value={form.type} onChange={e => set('type', e.target.value)}>
              <option>Kdrama</option><option>Cdrama</option><option>Jdrama</option>
            </FSelect>
          </Field>
          <Field label="Format" rune="ᚠ">
            <FSelect value={form.format} onChange={e => set('format', e.target.value)}>
              <option>Series</option><option>Movie</option><option>Special</option>
            </FSelect>
          </Field>
          <Field label="Status" rune="ᛊ">
            <FSelect value={form.status} onChange={e => set('status', e.target.value)}>
              <option>Watching</option><option>Completed</option><option>Dropped</option>
              <option>Plan to Watch</option><option>On Hold</option>
            </FSelect>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
          <Field label="Ep Current" rune="ᚹ">
            <FInput type="number" min="0" value={form.episodes?.current ?? ''} onChange={e => setEp('current', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Ep Total" rune="ᚹ">
            <FInput type="number" min="0" value={form.episodes?.total ?? ''} onChange={e => setEp('total', e.target.value)} placeholder="—" />
          </Field>
          <Field label="Year" rune="ᚢ">
            <FInput type="number" value={form.year ?? ''} onChange={e => set('year', e.target.value)} placeholder="2024" />
          </Field>
          <Field label="Rewatches" rune="ᚲ">
            <FInput type="number" min="0" value={form.rewatchCount ?? 0} onChange={e => set('rewatchCount', Number(e.target.value))} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Date Started" rune="ᛞ">
            <FInput type="date" value={form.dateStarted?.split('T')[0] ?? ''} onChange={e => set('dateStarted', e.target.value)} />
          </Field>
          <Field label="Date Completed" rune="ᛞ">
            <FInput type="date" value={form.dateCompleted?.split('T')[0] ?? ''} onChange={e => set('dateCompleted', e.target.value)} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Genres" rune="ᚷ">
            <FInput value={genreInput} onChange={e => setGenreInput(e.target.value)} placeholder="Romance, Thriller..." />
          </Field>
          <Field label="Custom Tags" rune="ᚱ">
            <FInput value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Favourites, Rewatching..." />
          </Field>
        </div>

        {/* Rating slider */}
        <Field label="My Rating" rune="★">
          <RatingSlider value={form.rating} onChange={v => set('rating', v)} />
        </Field>

        {/* Platforms */}
        <Field label="Where to Watch" rune="ᛚ">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(form.platforms || []).map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px',
                background: C.input, border: `1px solid ${C.borderGold}`,
              }}>
                <span style={{ flex: 1, fontSize: '12px', color: C.text }}>{p.name}</span>
                {p.url && <span style={{ fontSize: '10px', color: C.textDim, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>}
                <button onClick={() => removePlat(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px' }}>
              <FInput placeholder="Platform" value={platName} onChange={e => setPlatName(e.target.value)} style={{ flex: 1 }} />
              <FInput placeholder="URL (optional)" value={platUrl} onChange={e => setPlatUrl(e.target.value)} style={{ flex: 2 }} />
              <button onClick={addPlat} style={{
                fontFamily: '"Cinzel", serif', fontSize: '11px',
                color: C.electric, background: C.electricSoft,
                border: `1px solid ${C.electric}44`,
                padding: '0 14px', cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}>+ Add</button>
            </div>
          </div>
        </Field>

        {/* Review */}
        <Field label="Review / Notes" rune="ᚾ">
          <FTextarea value={form.review} onChange={e => set('review', e.target.value)} placeholder="Your thoughts..." />
        </Field>

        {error && (
          <div style={{ fontSize: '12px', color: C.red, letterSpacing: '0.05em' }}>{error}</div>
        )}

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{
              fontFamily: '"Cinzel", serif',
              fontSize: '12px', letterSpacing: '0.25em',
              color: saved ? C.green : C.electric,
              background: saved ? C.greenSoft : C.electricSoft,
              border: `1px solid ${saved ? C.green + '55' : C.electric + '55'}`,
              padding: '13px 36px',
              cursor: saving ? 'wait' : 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseEnter={e => { if (!saved && !saving) e.currentTarget.style.background = 'rgba(56,189,248,0.2)' }}
            onMouseLeave={e => { if (!saved && !saving) e.currentTarget.style.background = C.electricSoft }}
          >
            {saved ? '✓ SAVED TO MIDGARD' : saving ? 'Saving...' : existingEntry ? 'UPDATE ENTRY' : 'ADD TO MY LIST'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, active, count, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '11px', letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: active ? C.electric : hov ? C.text : C.textMuted,
        background: active ? C.electricSoft : 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${C.electric}` : '2px solid transparent',
        padding: '10px 20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textShadow: active ? `0 0 12px ${C.electric}` : 'none',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: '10px', color: active ? C.electric : C.textDim,
          border: `1px solid ${active ? C.electric + '44' : C.borderGold}`,
          padding: '1px 6px',
          background: active ? C.electricSoft : 'transparent',
          transition: 'all 0.2s',
        }}>{count}</span>
      )}
    </button>
  )
}

// ── Main InfoPage ─────────────────────────────────────────────────────────────
export default function InfoPage({ tmdbId, onBack }) {
  const [data, setData]           = useState(null)
  const [credits, setCredits]     = useState(null)
  const [images, setImages]       = useState(null)
  const [videos, setVideos]       = useState(null)
  const [altTitles, setAltTitles] = useState([])
  const [existing, setExisting]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showAllCast, setShowAllCast] = useState(false)
  const [showAltTitles, setShowAltTitles] = useState(false)

  useEffect(() => {
    if (!tmdbId) return
    setLoading(true)
    setActiveTab('overview')
    setShowAllCast(false)

    const headers = {}
    Promise.all([
      fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_KEY}`).then(r => r.json()),
      fetch(`${TMDB_BASE}/tv/${tmdbId}/credits?api_key=${TMDB_KEY}`).then(r => r.json()),
      fetch(`${TMDB_BASE}/tv/${tmdbId}/images?api_key=${TMDB_KEY}`).then(r => r.json()),
      fetch(`${TMDB_BASE}/tv/${tmdbId}/videos?api_key=${TMDB_KEY}`).then(r => r.json()),
      fetch(`${TMDB_BASE}/tv/${tmdbId}/alternative_titles?api_key=${TMDB_KEY}`).then(r => r.json()),
      axios.get(API).then(r => r.data),
    ]).then(([d, c, img, v, alt, myList]) => {
      setData(d)
      setCredits(c)
      setImages(img)
      setVideos(v)
      setAltTitles((alt.results || []).slice(0, 20))
      const found = myList.find(entry =>
        entry.title?.toLowerCase() === (d.name || '').toLowerCase()
      )
      setExisting(found || null)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [tmdbId])

  if (loading) return <Spinner />
  if (!data)   return (
    <div style={{ color: C.textDim, fontFamily: '"Cinzel", serif', fontSize: '13px', letterSpacing: '0.15em' }}>
      Failed to load data.
    </div>
  )

  const type       = detectType(data)
  const tColor     = typeColor(type)
  const backdrop   = data.backdrop_path ? `${IMG_BASE}/w1280${data.backdrop_path}` : null
  const poster     = data.poster_path   ? `${IMG_BASE}/w500${data.poster_path}`   : null
  const year       = data.first_air_date ? data.first_air_date.split('-')[0] : '—'
  const tmdbRating = data.vote_average ? data.vote_average.toFixed(1) : null
  const tmdbVotes  = data.vote_count ? data.vote_count.toLocaleString() : null
  const runtime    = data.episode_run_time?.[0]
  const cast       = credits?.cast || []
  const backdrops  = images?.backdrops || []
  const posters    = images?.posters || []
  const trailers   = videos?.results || []
  const visibleCast = showAllCast ? cast : cast.slice(0, 12)

  return (
    <div>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '11px', letterSpacing: '0.2em',
          color: C.textMuted, background: 'transparent',
          border: 'none', cursor: 'pointer',
          padding: '0 0 20px 0',
          transition: 'color 0.2s',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}
        onMouseEnter={e => e.currentTarget.style.color = C.electric}
        onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
      >
        ← Back to Search
      </button>

      {/* ── HERO SECTION ── */}
      <div style={{
        position: 'relative',
        marginBottom: '48px',
        animation: 'fadeIn 0.5s ease',
      }}>
        {/* Backdrop */}
        {backdrop && (
          <div style={{
            position: 'absolute', inset: 0, top: '-20px',
            backgroundImage: `url(${backdrop})`,
            backgroundSize: 'cover', backgroundPosition: 'center top',
            opacity: 0.12,
            filter: 'blur(2px)',
            borderRadius: '2px',
          }} />
        )}

        {/* Hero content */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', gap: '36px', flexWrap: 'wrap',
          padding: backdrop ? '32px 0 48px' : '0 0 32px',
        }}>
          {/* Poster */}
          <div style={{
            flexShrink: 0,
            width: '180px', height: '260px',
            background: C.surface,
            border: `1px solid ${tColor}44`,
            overflow: 'hidden', position: 'relative',
            boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px ${tColor}22`,
          }}>
            <Corners color={tColor} size={10} opacity={0.6} />
            {poster
              ? <img src={poster} alt={data.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '36px' }}>📺</div>
            }
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Type + status badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Badge label={type} color={tColor} />
              {data.status && <Badge label={data.status} color={data.status === 'Ended' || data.status === 'Canceled' ? C.textMuted : C.green} />}
              {data.type && <Badge label={data.type === 'Scripted' ? 'Series' : data.type} color={C.textMuted} />}
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily: '"Cinzel", serif',
              fontSize: 'clamp(22px, 3vw, 36px)',
              fontWeight: 700, letterSpacing: '0.08em',
              color: C.text, margin: 0,
              textShadow: `0 0 40px ${tColor}33`,
              lineHeight: 1.2,
            }}>
              {data.name}
            </h2>

            {/* Original title */}
            {data.original_name && data.original_name !== data.name && (
              <div style={{ fontSize: '14px', color: C.textMuted, letterSpacing: '0.05em', fontStyle: 'italic' }}>
                {data.original_name}
              </div>
            )}

            {/* Meta row */}
            <div style={{
              display: 'flex', gap: '20px', flexWrap: 'wrap',
              fontSize: '12px', color: C.textMuted, letterSpacing: '0.08em',
              alignItems: 'center',
            }}>
              {year !== '—' && <span style={{ color: C.gold + 'cc' }}>{year}</span>}
              {data.number_of_seasons && (
                <span>{data.number_of_seasons} Season{data.number_of_seasons > 1 ? 's' : ''}</span>
              )}
              {data.number_of_episodes && (
                <span>{data.number_of_episodes} Episodes</span>
              )}
              {runtime && <span>{runtime} min/ep</span>}
              {data.origin_country?.length > 0 && (
                <span style={{ color: tColor + 'aa', fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.15em' }}>
                  {data.origin_country.join(' · ')}
                </span>
              )}
            </div>

            {/* Genres */}
            {data.genres?.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {data.genres.map(g => (
                  <span key={g.id} style={{
                    fontSize: '10px', letterSpacing: '0.1em',
                    color: C.textMuted, fontFamily: '"Cinzel", serif',
                    padding: '3px 10px',
                    border: `1px solid ${C.borderGold}`,
                    background: C.surface,
                  }}>{g.name}</span>
                ))}
              </div>
            )}

            {/* TMDB Rating */}
            {tmdbRating && parseFloat(tmdbRating) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: '4px',
                }}>
                  <span style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: '32px', fontWeight: 700,
                    color: C.goldBright,
                    textShadow: `0 0 20px ${C.gold}66`,
                    lineHeight: 1,
                  }}>★ {tmdbRating}</span>
                  <span style={{ fontSize: '12px', color: C.textDim }}>/10</span>
                </div>
                {tmdbVotes && (
                  <span style={{ fontSize: '11px', color: C.textDim, letterSpacing: '0.05em' }}>
                    {tmdbVotes} votes
                  </span>
                )}
              </div>
            )}

            {/* Networks */}
            {data.networks?.length > 0 && (
              <div style={{ fontSize: '11px', color: C.textDim, letterSpacing: '0.05em' }}>
                <span style={{ color: C.gold + '88', fontFamily: '"Cinzel", serif', marginRight: '8px' }}>ᚾ</span>
                {data.networks.map(n => n.name).join(' · ')}
              </div>
            )}

            {/* My list status pill */}
            {existing && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '6px 14px',
                background: statusColor(existing.status) + '18',
                border: `1px solid ${statusColor(existing.status)}44`,
                fontSize: '11px', letterSpacing: '0.15em',
                color: statusColor(existing.status),
                fontFamily: '"Cinzel", serif',
                alignSelf: 'flex-start',
              }}>
                ✓ In My List — {existing.status}
                {existing.rating && <span style={{ color: C.goldBright, marginLeft: '6px' }}>★ {existing.rating}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Synopsis */}
        {data.overview && (
          <div style={{
            position: 'relative', zIndex: 1,
            padding: '20px 24px',
            background: 'rgba(15,24,41,0.7)',
            border: `1px solid ${C.borderGold}`,
            backdropFilter: 'blur(8px)',
            marginTop: '8px',
          }}>
            <Corners color={C.gold} size={10} opacity={0.25} />
            <div style={{
              fontSize: '10px', letterSpacing: '0.3em',
              color: C.gold + '88', fontFamily: '"Cinzel", serif',
              textTransform: 'uppercase', marginBottom: '10px',
            }}>ᛊ Synopsis</div>
            <p style={{
              fontSize: '14px', color: '#B8C4D8',
              lineHeight: 1.75, margin: 0, letterSpacing: '0.02em',
            }}>
              {data.overview}
            </p>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div style={{
        display: 'flex', gap: '2px',
        borderBottom: `1px solid ${C.borderGold}`,
        marginBottom: '36px',
      }}>
        <Tab label="Overview"   active={activeTab === 'overview'}   onClick={() => setActiveTab('overview')} />
        <Tab label="Cast"       active={activeTab === 'cast'}       count={cast.length} onClick={() => setActiveTab('cast')} />
        <Tab label="Images"     active={activeTab === 'images'}     count={backdrops.length + posters.length} onClick={() => setActiveTab('images')} />
        <Tab label="Trailers"   active={activeTab === 'trailers'}   count={trailers.filter(v => v.site === 'YouTube').length} onClick={() => setActiveTab('trailers')} />
        <Tab label={existing ? 'Edit Entry' : 'Add to My List'} active={activeTab === 'myentry'} onClick={() => setActiveTab('myentry')} />
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ animation: 'fadeIn 0.3s ease' }} key={activeTab}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* Quick info grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
            }}>
              {[
                { label: 'Status',        value: data.status,                           rune: 'ᛊ' },
                { label: 'First Aired',   value: data.first_air_date,                   rune: 'ᛞ' },
                { label: 'Last Aired',    value: data.last_air_date,                    rune: 'ᛞ' },
                { label: 'Seasons',       value: data.number_of_seasons,                rune: 'ᚢ' },
                { label: 'Episodes',      value: data.number_of_episodes,               rune: 'ᚹ' },
                { label: 'Ep Runtime',    value: runtime ? `${runtime} min` : null,     rune: 'ᛏ' },
                { label: 'Origin',        value: data.origin_country?.join(', '),       rune: 'ᚱ' },
                { label: 'Language',      value: data.original_language?.toUpperCase(), rune: 'ᛚ' },
              ].filter(r => r.value).map(row => (
                <div key={row.label} style={{
                  padding: '14px 16px',
                  background: C.surface,
                  border: `1px solid ${C.borderGold}`,
                  position: 'relative',
                }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: C.textDim, fontFamily: '"Cinzel", serif', textTransform: 'uppercase', marginBottom: '6px' }}>
                    <span style={{ color: C.gold + '66', marginRight: '6px' }}>{row.rune}</span>{row.label}
                  </div>
                  <div style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{row.value}</div>
                </div>
              ))}
            </div>

            {/* Seasons breakdown */}
            {data.seasons?.length > 0 && (
              <div>
                <SectionHeader title="Seasons" rune="ᚢ" />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {data.seasons.filter(s => s.season_number > 0).map(season => (
                    <div key={season.id} style={{
                      padding: '12px 16px',
                      background: C.surface,
                      border: `1px solid ${C.borderGold}`,
                      minWidth: '120px',
                      position: 'relative',
                    }}>
                      <Corners color={C.gold} size={8} opacity={0.2} />
                      <div style={{ fontSize: '10px', color: C.textDim, fontFamily: '"Cinzel", serif', letterSpacing: '0.15em', marginBottom: '4px' }}>
                        Season {season.season_number}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{season.episode_count} eps</div>
                      {season.air_date && (
                        <div style={{ fontSize: '10px', color: C.textDim, marginTop: '4px' }}>
                          {season.air_date.split('-')[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative titles */}
            {altTitles.length > 0 && (
              <div>
                <SectionHeader title="Alternative Titles" rune="ᚨ" />
                <div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(showAltTitles ? altTitles : altTitles.slice(0, 6)).map((t, i) => (
                      <span key={i} style={{
                        fontSize: '12px', color: C.textMuted,
                        padding: '4px 12px',
                        border: `1px solid ${C.borderGold}`,
                        background: C.surface,
                        letterSpacing: '0.03em',
                      }}>
                        {t.title}
                        {t.iso_3166_1 && <span style={{ fontSize: '10px', color: C.textDim, marginLeft: '6px' }}>({t.iso_3166_1})</span>}
                      </span>
                    ))}
                  </div>
                  {altTitles.length > 6 && (
                    <button
                      onClick={() => setShowAltTitles(s => !s)}
                      style={{
                        marginTop: '10px', fontFamily: '"Cinzel", serif',
                        fontSize: '10px', letterSpacing: '0.15em',
                        color: C.textDim, background: 'transparent',
                        border: 'none', cursor: 'pointer', padding: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = C.electric}
                      onMouseLeave={e => e.currentTarget.style.color = C.textDim}
                    >
                      {showAltTitles ? '▲ Show Less' : `▼ Show All ${altTitles.length}`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Top cast preview */}
            {cast.length > 0 && (
              <div>
                <SectionHeader title="Top Cast" rune="ᛈ" />
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {cast.slice(0, 8).map(p => <CastCard key={p.id} person={p} />)}
                </div>
                <button
                  onClick={() => setActiveTab('cast')}
                  style={{
                    marginTop: '14px', fontFamily: '"Cinzel", serif',
                    fontSize: '10px', letterSpacing: '0.2em',
                    color: C.textDim, background: 'transparent',
                    border: 'none', cursor: 'pointer', padding: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = C.electric}
                  onMouseLeave={e => e.currentTarget.style.color = C.textDim}
                >
                  View All {cast.length} Cast Members →
                </button>
              </div>
            )}
          </div>
        )}

        {/* CAST TAB */}
        {activeTab === 'cast' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '16px 12px',
            }}>
              {visibleCast.map(p => <CastCard key={p.id} person={p} />)}
            </div>
            {cast.length > 12 && (
              <button
                onClick={() => setShowAllCast(s => !s)}
                style={{
                  marginTop: '24px', fontFamily: '"Cinzel", serif',
                  fontSize: '11px', letterSpacing: '0.2em',
                  color: C.electric, background: C.electricSoft,
                  border: `1px solid ${C.electric}44`,
                  padding: '10px 24px', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = C.electricSoft}
              >
                {showAllCast ? '▲ Show Less' : `▼ Show All ${cast.length} Cast Members`}
              </button>
            )}
          </div>
        )}

        {/* IMAGES TAB */}
        {activeTab === 'images' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {backdrops.length > 0 && (
              <div>
                <SectionHeader title={`Backdrops (${backdrops.length})`} rune="ᛒ" />
                <ImageGrid images={backdrops} type="backdrop" />
              </div>
            )}
            {posters.length > 0 && (
              <div>
                <SectionHeader title={`Posters (${posters.length})`} rune="ᛈ" />
                <ImageGrid images={posters} type="poster" />
              </div>
            )}
            {backdrops.length === 0 && posters.length === 0 && (
              <div style={{ color: C.textDim, fontSize: '13px', letterSpacing: '0.05em' }}>No images available</div>
            )}
          </div>
        )}

        {/* TRAILERS TAB */}
        {activeTab === 'trailers' && (
          <TrailerRow videos={videos?.results} />
        )}

        {/* MY ENTRY TAB */}
        {activeTab === 'myentry' && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '12px', color: C.textDim, letterSpacing: '0.08em', lineHeight: 1.7 }}>
                {existing
                  ? <>Editing your existing entry. All fields pre-filled from your saved data.</>
                  : <>Fields pre-filled from TMDB. Adjust anything before saving.</>
                }
              </div>
            </div>
            <MyEntryForm
              tmdbData={data}
              existingEntry={existing}
              onSaved={() => {
                // Refresh existing entry after save
                axios.get(API).then(r => {
                  const found = r.data.find(e =>
                    e.title?.toLowerCase() === (data.name || '').toLowerCase()
                  )
                  setExisting(found || null)
                })
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}