import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileIcon from '../../components/ProfileIcon'
import { useIsMobile } from '../../hooks/useMediaQuery'

const REALMS = [
  {
    id: 'alfheim',
    name: 'Alfheim',
    subtitle: 'Realm of Anime',
    path: '/alfheim',
    accent: '#4ADE80',
    glow: 'rgba(74,222,128,0.32)',
    border: 'rgba(74,222,128,0.5)',
    description: 'Where spirits dance between worlds, boundless and eternal',
    symbol: '✶',
    rune: 'ᚨ ᛚ ᚠ ᚺ ᛖ ᛁ ᛗ',
    nature: 'Elves · Sky · Wonder',
    image: '/alfheim.png',
  },
  {
    id: 'valhalla',
    name: 'Valhalla',
    subtitle: 'Realm of Manga',
    path: '/valhalla',
    accent: '#C084FC',
    glow: 'rgba(192,132,252,0.32)',
    border: 'rgba(192,132,252,0.5)',
    description: 'Hall of the chosen, where legends are written in ink and fate',
    symbol: '⚔︎',
    rune: 'ᚹ ᚨ ᛚ ᚺ ᚨ ᛚ ᛚ ᚨ',
    nature: 'Warriors · Glory · Eternity',
    image: '/valhalla.png',
  },
  {
    id: 'midgard',
    name: 'Midgard',
    subtitle: 'Realm of Drama',
    path: '/midgard',
    accent: '#38BDF8',
    glow: 'rgba(56,189,248,0.32)',
    border: 'rgba(56,189,248,0.5)',
    description: 'The world of mortals, where stories burn brightest of all',
    symbol: '⟐',
    rune: 'ᛗ ᛁ ᛞ ᚷ ᚨ ᚱ ᛞ',
    nature: 'Mortals · Fire · Truth',
    image: '/midgard.png',
  },
]

const SCRAMBLE_CHARS = 'ᚨᛚᚠᚺᛖᛁᛗᚹᚨᛚᛚᚨᛗᛁᛞᚷᚨᚱᛞᛟᚦᚱᛊABCDEFGHIJKLMNOPQRSTUVWXYZ'


function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// ── Flip-fade text (per-character reveal) ───────────────────────────────────
function FlipFadeText({ text, as = 'div', baseDelay = 0, stagger = 35, style }) {
  const Tag = as
  const chars = text.split('')
  return (
    <Tag style={{ ...style, perspective: 500 }}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className="ygg-flip-char"
          style={{ animationDelay: `${baseDelay + i * stagger}ms` }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </Tag>
  )
}

// ── Scramble/"generate" text hook ───────────────────────────────────────────
function useScrambleText(finalText, { duration = 2500, delay = 500 } = {}) {
  const [display, setDisplay] = useState(finalText)
  useEffect(() => {
    if (prefersReducedMotion()) return
    let frameId
    let startTimeout
    const letters = finalText.split('')
    const frameMs = 200
    const totalFrames = Math.max(1, Math.round(duration / frameMs))
    let frame = 0

    const tick = () => {
      frame++
      const revealCount = Math.floor((frame / totalFrames) * letters.length)
      setDisplay(
        letters
          .map((ch, i) => {
            if (ch === ' ') return ' '
            if (i < revealCount) return ch
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          })
          .join('')
      )
      if (frame < totalFrames) {
        frameId = setTimeout(tick, frameMs)
      } else {
        setDisplay(finalText)
      }
    }

    startTimeout = setTimeout(tick, delay)
    return () => {
      clearTimeout(startTimeout)
      clearTimeout(frameId)
    }
  }, [finalText, duration, delay])
  return display
}

// ── Enter button ──────────────────────────────────────────────────────────────
function EnterButton({ onClick, isMobile }) {
  const [hovered, setHovered] = useState(false)
  const display = useScrambleText('ENTER THE TREE', { duration: 1600, delay: 500 })

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", "Georgia", serif',
        fontSize: isMobile ? 12 : 14,
        letterSpacing: isMobile ? '0.28em' : '0.45em',
        color: hovered ? '#55ff00' : '#e8f4f0',
        background: hovered ? 'rgba(77,255,210,0.07)' : 'transparent',
        border: '1px solid rgb(201,168,76)',
        padding: isMobile ? '16px 30px' : '18px 52px',
        cursor: 'pointer',
        textTransform: 'uppercase',
        transition: 'all 0.35s ease',
        minHeight: '48px',
        minWidth: isMobile ? 220 : 260,
        boxShadow: hovered
          ? '0 0 50px rgba(77,255,210,0.45), inset 0 0 30px rgba(77,255,210,0.1)'
          : '0 0 20px rgba(77,255,210,0.1), inset 0 0 16px rgba(77,255,210,0.04)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {display}
    </button>
  )
}

// ── Realm card ────────────────────────────────────────────────────────────────
function RealmCard({ realm, index, visible, onClick, isMobile }) {
  const [hovered, setHovered] = useState(false)
  // No real hover on touch devices — treat mobile cards as always "activated"
  // so the accent glow, border, and background art are visible up front.
  const active = isMobile || hovered

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: isMobile ? '1 1 100%' : '1 1 260px',
        maxWidth: isMobile ? 260 : 300,
        padding: isMobile ? '28px 20px 24px' : '36px 28px 32px',
        border: `1px solid ${active ? realm.border : 'rgba(217,184,92,0.14)'}`,
        background: active
          ? 'linear-gradient(160deg, rgba(4,14,10,0.85), rgba(4,14,10,0.7))'
          : 'rgba(4,14,10,0.55)',
        backdropFilter: 'blur(6px)',
        cursor: 'pointer',
        textAlign: 'center',
        // Stagger delay only on entry (when visible becomes true), not on hover changes
        transition: `opacity 0.6s ease ${index * 150}ms, transform 0.6s ease ${index * 150}ms, border 0.4s ease, box-shadow 0.4s ease, background 0.4s ease`,
        boxShadow: active
          ? `0 0 80px ${realm.glow}, 0 0 0 1px ${realm.border}, inset 0 0 40px rgba(0,0,0,0.3)`
          : 'none',
        transform: visible
          ? hovered && !isMobile ? 'translateY(-12px) scale(1.02)' : 'translateY(0) scale(1)'
          : 'translateY(32px)',
        opacity: visible ? 1 : 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background art */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${realm.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: active ? 0.30 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'none',
      }} />

      {/* Corner ornaments */}
      {[
        { top: 10,    left: 10,  borderTop: true,    borderLeft: true   },
        { top: 10,    right: 10, borderTop: true,    borderRight: true  },
        { bottom: 10, left: 10,  borderBottom: true, borderLeft: true   },
        { bottom: 10, right: 10, borderBottom: true, borderRight: true  },
      ].map((pos, i) => {
        const borderColor = active ? realm.accent : 'rgba(217,184,92,0.25)'
        return (
          <div key={i} style={{
            position: 'absolute',
            width: 12, height: 12,
            ...pos,
            borderTop:    pos.borderTop    ? `1px solid ${borderColor}` : undefined,
            borderBottom: pos.borderBottom ? `1px solid ${borderColor}` : undefined,
            borderLeft:   pos.borderLeft   ? `1px solid ${borderColor}` : undefined,
            borderRight:  pos.borderRight  ? `1px solid ${borderColor}` : undefined,
            transition: 'border-color 0.4s',
          }} />
        )
      })}

      {/* Symbol */}
      <div style={{
        fontSize: isMobile ? 26 : 36, marginBottom: 12, lineHeight: 1, color: active ? realm.accent : '#d4c5a9',
        filter: active ? `drop-shadow(0 0 12px ${realm.accent})` : 'none',
        transform: hovered && !isMobile ? 'scale(1.15)' : 'scale(1)',
        transition: 'filter 0.4s, transform 0.4s',
      }}>
        {realm.symbol}
      </div>

      {/* Rune line */}
      <div style={{
        fontFamily: 'Cinzel, serif',
        color: active ? realm.accent : 'rgba(217,184,92,0.35)',
        marginBottom: isMobile ? 16 : 20,
        transition: 'color 0.4s',
        userSelect: 'none',
        ...(isMobile ? { fontSize: 9, letterSpacing: '0.18em' } : { fontSize: 11, letterSpacing: '0.25em' })
      }}>
        {realm.rune}
      </div>

      {/* Animated accent divider */}
      <div style={{
        width: active ? '70%' : 28, height: 1,
        background: `linear-gradient(to right, transparent, ${realm.accent}, transparent)`,
        margin: '0 auto 20px',
        transition: 'width 0.5s ease',
        boxShadow: active ? `0 0 8px ${realm.accent}` : 'none',
      }} />

      {/* Realm name */}
      <div style={{
        fontFamily: '"Cinzel Decorative", "Cinzel", "Georgia", serif',
        fontSize: isMobile ? 'clamp(16px, 5vw, 20px)' : 'clamp(18px, 2vw, 24px)', fontWeight: 700,
        letterSpacing: '0.15em',
        color: active ? realm.accent : '#d4c5a9',
        marginBottom: 6, transition: 'all 0.35s ease',
        textShadow: active ? `0 0 20px ${realm.accent}` : 'none',
        userSelect: 'none',
      }}>
        {realm.name}
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: '"Cinzel", "Georgia", serif', fontSize: 10,
        letterSpacing: '0.4em', textTransform: 'uppercase',
        color: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
        marginBottom: 18, transition: 'color 0.3s', userSelect: 'none',
      }}>
        {realm.subtitle}
      </div>

      {/* Nature tags */}
      <div style={{
        fontFamily: '"Cinzel", serif', fontSize: 9,
        letterSpacing: '0.25em', textTransform: 'uppercase',
        color: active ? realm.accent : 'rgba(217,184,92,0.3)',
        marginBottom: 16, transition: 'color 0.4s', userSelect: 'none',
      }}>
        {realm.nature}
      </div>

      {/* Description */}
      <div style={{
        fontSize: 12, lineHeight: 1.7, fontStyle: 'italic', letterSpacing: '0.03em',
        color: active ? 'rgba(220,215,200,0.7)' : 'rgba(200,195,180,0.3)',
        transition: 'color 0.4s',
      }}>
        {realm.description}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Yggdrasil() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [phase, setPhase] = useState('landing')
  const [realmVisible, setRealmVisible] = useState(false)
  const stylesInjected = useRef(false)

  // Inject Google Fonts + animation keyframes once on mount.
  useEffect(() => {
    const fontId = 'yggdrasil-fonts'
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link')
      link.id = fontId
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;600;700&display=swap'
      document.head.appendChild(link)
    }

    if (!stylesInjected.current && !document.getElementById('yggdrasil-anim-styles')) {
      const style = document.createElement('style')
      style.id = 'yggdrasil-anim-styles'
      style.textContent = `
        @keyframes yggFlipFade {
          0% { opacity: 0; transform: rotateX(80deg) translateY(14px); }
          100% { opacity: 1; transform: rotateX(0deg) translateY(0); }
        }
        .ygg-flip-char {
          display: inline-block;
          animation: yggFlipFade 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .ygg-flip-char { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `
      document.head.appendChild(style)
    }
    stylesInjected.current = true
  }, [])

  const handleEnter = () => {
    setPhase('realm')
    // Small delay lets the background transition start before cards fade in
    setTimeout(() => setRealmVisible(true), 100)
  }

  const handleBack = () => {
    setRealmVisible(false)
    // Wait for card fade-out before switching phase
    setTimeout(() => setPhase('landing'), 400)
  }

  const isLanding = phase === 'landing'
  const bgImage = isMobile ? '/yggdrasil_mobile.png' : '/yggdrasil.png'
  const bgSize = isMobile ? '100%' : '80%'

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050c14', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 20, right: isMobile ? 16 : 24, zIndex: 10 }}>
        <ProfileIcon borderColor="rgba(201,168,76,0.4)" size={isMobile ? 32 : 36} />
      </div>

      {/* Background image */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: bgSize,
        backgroundPosition: 'center',
        filter: isLanding ? 'brightness(0.85)' : 'brightness(0.25) blur(2px)',
        transition: 'filter 1s ease',
      }} />

      {/* Landing vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 30%, #050c14 90%)',
        opacity: isLanding ? 1 : 0,
        transition: 'opacity 0.8s ease',
      }} />

      {/* LANDING */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '40px 20px 56px' : '48px 0 72px',
        opacity: isLanding ? 1 : 0,
        pointerEvents: isLanding ? 'auto' : 'none',
        transition: 'opacity 0.5s ease',
      }}>
        <div style={{ textAlign: 'center', marginTop: isMobile ? 30 : 0 }}>
          <FlipFadeText
            text="YGGDRASIL"
            as="div"
            baseDelay={150}
            stagger={70}
            style={{
              fontFamily: '"Cinzel Decorative", "Cinzel", "Georgia", serif',
              fontSize: 'clamp(28px, 11vw, 74px)',
              fontWeight: 700,
              letterSpacing: isMobile ? '0.15em' : '0.25em',
              color: '#C9A84C',
              textShadow: '0 0 80px rgba(201,168,76,0.5), 0 2px 6px rgba(0,0,0,0.9)',
              lineHeight: 1, userSelect: 'none',
            }}
          />
          <FlipFadeText
            text="Keeper of Worlds"
            as="div"
            baseDelay={1100}
            stagger={45}
            style={{
              fontFamily: '"Cinzel", "Georgia", serif',
              fontSize: isMobile ? 12 : 'clamp(15px, 1.4vw, 17px)',
              letterSpacing: isMobile ? '0.3em' : '0.5em',
              color: 'rgb(0,255,191)',
              marginTop: 18, textTransform: 'uppercase', userSelect: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <EnterButton onClick={handleEnter} isMobile={isMobile} />
          <div style={{
            fontSize: isMobile ? 11 : 15,
            letterSpacing: isMobile ? '0.15em' : '0.3em',
            color: 'rgb(255,187,0)',
            fontFamily: '"Cinzel", "Georgia", serif',
            userSelect: 'none',
            textAlign: 'center',
          }}>
            ᛟ ᚹ ᛁ ᚷ ᛞ ᚱ ᚨ ᛊ ᛁ ᛚ ᛟ
          </div>
        </div>
      </div>

      {/* REALM SELECTION */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-start' : 'center',
        opacity: realmVisible ? 1 : 0,
        pointerEvents: phase === 'realm' ? 'auto' : 'none',
        transition: 'opacity 0.9s ease',
        padding: isMobile ? '30px 14px 24px' : 24,
        overflowY: 'auto',
      }}>
        <div style={{
          fontFamily: '"Cinzel", serif', fontSize: isMobile ? 14 : 18,
          color: 'rgba(201,168,76,0.4)', letterSpacing: isMobile ? '0.3em' : '0.5em',
          marginBottom: 6, userSelect: 'none', flexShrink: 0,
        }}>
          ᛭ ᛭ ᛭
        </div>

        <div style={{ textAlign: 'center', marginBottom: 8, flexShrink: 0 }}>
          <div style={{
            fontFamily: '"Cinzel", "Georgia", serif',
            fontSize: isMobile ? 9 : 'clamp(10px, 1.2vw, 12px)',
            letterSpacing: isMobile ? '0.3em' : '0.6em',
            color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase',
            marginBottom: 10, userSelect: 'none',
          }}>
            The Nine Realms Await
          </div>
          <div style={{
            fontFamily: '"Cinzel Decorative", "Cinzel", "Georgia", serif',
            fontSize: 'clamp(24px, 9vw, 44px)',
            fontWeight: 700,
            letterSpacing: isMobile ? '0.12em' : '0.2em',
            color: '#C9A84C',
            textShadow: '0 0 60px rgba(201,168,76,0.4)', userSelect: 'none',
          }}>
            YGGDRASIL
          </div>
        </div>

        <Divider mb={isMobile ? 22 : 40} isMobile={isMobile} />

        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap',
          justifyContent: 'center', width: '100%', maxWidth: 1040,
        }}>
          {REALMS.map((realm, i) => (
            <RealmCard
              key={realm.id} realm={realm} index={i}
              visible={realmVisible} isMobile={isMobile}
              onClick={() => navigate(realm.path)}
            />
          ))}
        </div>

        <Divider mt={isMobile ? 20 : 36} mb={0} dim isMobile={isMobile} />

        <button
          onClick={handleBack}
          style={{
            marginTop: 20,
            fontFamily: '"Cinzel", "Georgia", serif',
            fontSize: isMobile ? 10 : 11,
            letterSpacing: isMobile ? '0.25em' : '0.4em',
            color: 'rgba(200,220,215,0.35)',
            background: 'transparent', border: 'none',
            cursor: 'pointer', textTransform: 'uppercase',
            transition: 'color 0.3s', padding: 12,
            minHeight: '44px', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(201,168,76,0.8)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(200,220,215,0.35)'}
        >
          ← Return to the Tree
        </button>
      </div>
    </div>
  )
}

// ── Divider helper ────────────────────────────────────────────────────────────
function Divider({ mt = 0, mb = 0, dim = false, isMobile = false }) {
  const goldBase = dim ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.4)'
  const runeColor = dim ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.6)'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      width: '100%', maxWidth: 600,
      marginTop: mt, marginBottom: mb,
    }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${goldBase})` }} />
      {dim
        ? <div style={{ color: runeColor, fontSize: isMobile ? 10 : 12, letterSpacing: isMobile ? '0.25em' : '0.4em', fontFamily: '"Cinzel", serif' }}>ᛟ ᚹ ᛁ ᚷ ᛞ ᚱ ᚨ ᛊ ᛁ ᛚ ᛟ</div>
        : <div style={{ color: runeColor, fontSize: 14, fontFamily: '"Cinzel", serif' }}>ᚦ</div>
      }
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${goldBase})` }} />
    </div>
  )
}


