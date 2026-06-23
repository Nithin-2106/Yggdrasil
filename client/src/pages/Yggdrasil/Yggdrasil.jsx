import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileIcon from '../../components/ProfileIcon'

function Yggdrasil() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('landing')
  const [realmVisible, setRealmVisible] = useState(false)

  const handleEnter = () => {
    setPhase('realm')
    setTimeout(() => setRealmVisible(true), 50)
  }

  const realms = [
    {
      id: 'alfheim',
      name: 'Alfheim',
      subtitle: 'Realm of Anime',
      path: '/alfheim',
      accent: '#7EB8F7',
      glow: 'rgba(126,184,247,0.3)',
      border: 'rgba(126,184,247,0.45)',
      description: 'Where spirits dance between worlds, boundless and eternal',
      symbol: '᛭',
      rune: 'ᚨ ᛚ ᚠ ᚺ ᛖ ᛁ ᛗ',
      symbolColor: '#7EB8F7',
      nature: 'Light Elves · Sky · Wonder',
      image: '/alfheim.png'
    },
    {
      id: 'valhalla',
      name: 'Valhalla',
      subtitle: 'Realm of Manga',
      path: '/valhalla',
      accent: '#C084FC',
      glow: 'rgba(192,132,252,0.3)',
      border: 'rgba(192,132,252,0.45)',
      description: 'Hall of the chosen, where legends are written in ink and fate',
      symbol: '⚔',
      rune: 'ᚹ ᚨ ᛚ ᚺ ᚨ ᛚ ᛚ ᚨ',
      symbolColor: '#C084FC',
      nature: 'Warriors · Glory · Eternity',
      image: '/valhalla.png'
    },
    {
      id: 'midgard',
      name: 'Midgard',
      subtitle: 'Realm of Drama',
      path: '/midgard',
      accent: '#F4A261',
      glow: 'rgba(244,162,97,0.3)',
      border: 'rgba(244,162,97,0.45)',
      description: 'The world of mortals, where stories burn brightest of all',
      symbol: '🜂',
      rune: 'ᛗ ᛁ ᛞ ᚷ ᚨ ᚱ ᛞ',
      symbolColor: '#F4A261',
      nature: 'Mortals · Fire · Truth',
      image: '/midgard.png'
    }
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050c14', overflow: 'hidden' }}>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;600;700&display=swap"
      />

      {/* Profile icon — top right */}
      <div style={{ position: 'absolute', top: '20px', right: '24px', zIndex: 10 }}>
        <ProfileIcon borderColor="rgba(201,168,76,0.4)" size={36} />
      </div>

      {/* Background image */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/yggdrasil.png)',
        backgroundSize: '80%',
        backgroundPosition: 'center',
        filter: phase === 'realm' ? 'brightness(0.25) blur(2px)' : 'brightness(0.85)',
        transition: 'filter 1s ease',
      }} />

      {/* Vignette on landing */}
      {phase === 'landing' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 30%, #050c14 90%)',
        }} />
      )}

      {/* LANDING */}
      {phase === 'landing' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '48px 0 72px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: '"Cinzel Decorative", "Cinzel", "Georgia", serif',
              fontSize: 'clamp(30px, 6vw, 74px)',
              fontWeight: 700,
              letterSpacing: '0.25em',
              color: '#C9A84C',
              textShadow: '0 0 80px rgba(201,168,76,0.5), 0 2px 6px rgba(0,0,0,0.9)',
              lineHeight: 1,
              userSelect: 'none',
            }}>
              YGGDRASIL
            </div>
            <div style={{
              fontFamily: '"Cinzel", "Georgia", serif',
              fontSize: 'clamp(15px, 1.4vw, 17px)',
              letterSpacing: '0.5em',
              color: 'rgb(0, 255, 191)',
              marginTop: '21px',
              textTransform: 'uppercase',
              userSelect: 'none',
            }}>
              Keeper of Worlds
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <EnterButton onClick={handleEnter} />
            <div style={{
              fontSize: '15px',
              letterSpacing: '0.3em',
              color: 'rgb(255, 187, 0)',
              fontFamily: '"Cinzel", "Georgia", serif',
              userSelect: 'none',
            }}>
              ᛟ ᚹ ᛁ ᚷ ᛞ ᚱ ᚨ ᛊ ᛁ ᛚ ᛟ
            </div>
          </div>
        </div>
      )}

      {/* REALM SELECTION */}
      {phase === 'realm' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          opacity: realmVisible ? 1 : 0,
          transition: 'opacity 0.9s ease',
          padding: '24px',
          overflowY: 'auto',
        }}>

          {/* Top ornament */}
          <div style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '18px',
            color: 'rgba(201,168,76,0.4)',
            letterSpacing: '0.5em',
            marginBottom: '6px',
            userSelect: 'none',
          }}>
            ᛭ ᛭ ᛭
          </div>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{
              fontFamily: '"Cinzel", "Georgia", serif',
              fontSize: 'clamp(10px, 1.2vw, 12px)',
              letterSpacing: '0.6em',
              color: 'rgba(201,168,76,0.7)',
              textTransform: 'uppercase',
              marginBottom: '10px',
              userSelect: 'none',
            }}>
              The Nine Realms Await
            </div>
            <div style={{
              fontFamily: '"Cinzel Decorative", "Cinzel", "Georgia", serif',
              fontSize: 'clamp(26px, 3.5vw, 44px)',
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: '#C9A84C',
              textShadow: '0 0 60px rgba(201,168,76,0.4)',
              userSelect: 'none',
            }}>
              YGGDRASIL
            </div>
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            marginBottom: '40px', width: '100%', maxWidth: '600px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.4))' }} />
            <div style={{ color: 'rgba(201,168,76,0.6)', fontSize: '14px', fontFamily: '"Cinzel", serif' }}>ᚦ</div>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.4))' }} />
          </div>

          {/* Cards */}
          <div style={{
            display: 'flex', gap: '16px',
            flexWrap: 'wrap', justifyContent: 'center',
            width: '100%', maxWidth: '1040px',
          }}>
            {realms.map((realm, i) => (
              <RealmCard
                key={realm.id}
                realm={realm}
                delay={i * 150}
                visible={realmVisible}
                onClick={() => navigate(realm.path)}
              />
            ))}
          </div>

          {/* Bottom divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            marginTop: '36px', width: '100%', maxWidth: '600px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.25))' }} />
            <div style={{ color: 'rgba(201,168,76,0.4)', fontSize: '12px', letterSpacing: '0.4em', fontFamily: '"Cinzel", serif' }}>ᛟ ᚹ ᛁ ᚷ ᛞ ᚱ ᚨ ᛊ ᛁ ᛚ ᛟ</div>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.25))' }} />
          </div>

          <button
            onClick={() => { setPhase('landing'); setRealmVisible(false) }}
            style={{
              marginTop: '20px',
              fontFamily: '"Cinzel", "Georgia", serif',
              fontSize: '11px',
              letterSpacing: '0.4em',
              color: 'rgba(200,220,215,0.35)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'color 0.3s',
              padding: '8px',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(201,168,76,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(200,220,215,0.35)'}
          >
            ← Return to the Tree
          </button>
        </div>
      )}
    </div>
  )
}

function EnterButton({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", "Georgia", serif',
        fontSize: '14px',
        letterSpacing: '0.45em',
        color: hovered ? '#55ff00' : '#e8f4f0',
        background: hovered ? 'rgba(77,255,210,0.07)' : 'transparent',
        border: '1px solid rgb(201, 168, 76)',
        padding: '18px 52px',
        cursor: 'pointer',
        textTransform: 'uppercase',
        transition: 'all 0.35s ease',
        boxShadow: hovered
          ? '0 0 50px rgba(77,255,210,0.45), inset 0 0 30px rgba(77,255,210,0.1)'
          : '0 0 20px rgba(77,255,210,0.1), inset 0 0 16px rgba(77,255,210,0.04)',
      }}
    >
      Enter the Tree
    </button>
  )
}

function RealmCard({ realm, delay, visible, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 260px', maxWidth: '300px',
        padding: '36px 28px 32px',
        border: `1px solid ${hovered ? realm.border : 'rgba(201,168,76,0.12)'}`,
        background: hovered
          ? `linear-gradient(160deg, rgba(5,12,20,0.85), rgba(5,12,20,0.7))`
          : 'rgba(5,12,20,0.55)',
        backdropFilter: 'blur(6px)',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.4s ease',
        boxShadow: hovered
          ? `0 0 80px ${realm.glow}, 0 0 0 1px ${realm.border}, inset 0 0 40px rgba(0,0,0,0.3)`
          : '0 0 0 0 transparent',
        transform: visible
          ? hovered ? 'translateY(-12px) scale(1.02)' : 'translateY(0) scale(1)'
          : 'translateY(32px)',
        opacity: visible ? 1 : 0,
        transitionDelay: `${delay}ms`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Hover background image */}
      <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${realm.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: hovered ? 0.30 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
      }} />
      {/* Corner ornaments */}
      <div style={{
        position: 'absolute', top: '10px', left: '10px',
        width: '12px', height: '12px',
        borderTop: `1px solid ${hovered ? realm.accent : 'rgba(201,168,76,0.25)'}`,
        borderLeft: `1px solid ${hovered ? realm.accent : 'rgba(201,168,76,0.25)'}`,
        transition: 'border-color 0.4s',
      }} />
      <div style={{
        position: 'absolute', top: '10px', right: '10px',
        width: '12px', height: '12px',
        borderTop: `1px solid ${hovered ? realm.accent : 'rgba(201,168,76,0.25)'}`,
        borderRight: `1px solid ${hovered ? realm.accent : 'rgba(201,168,76,0.25)'}`,
        transition: 'border-color 0.4s',
      }} />
      <div style={{
        position: 'absolute', bottom: '10px', left: '10px',
        width: '12px', height: '12px',
        borderBottom: `1px solid ${hovered ? realm.accent : 'rgba(201,168,76,0.25)'}`,
        borderLeft: `1px solid ${hovered ? realm.accent : 'rgba(201,168,76,0.25)'}`,
        transition: 'border-color 0.4s',
      }} />
      <div style={{
        position: 'absolute', bottom: '10px', right: '10px',
        width: '12px', height: '12px',
        borderBottom: `1px solid ${hovered ? realm.accent : 'rgba(201,168,76,0.25)'}`,
        borderRight: `1px solid ${hovered ? realm.accent : 'rgba(201,168,76,0.25)'}`,
        transition: 'border-color 0.4s',
      }} />

      {/* Big symbol */}
      <div style={{
        fontSize: '36px',
        marginBottom: '12px',
        filter: hovered ? `drop-shadow(0 0 12px ${realm.accent})` : 'none',
        transition: 'filter 0.4s, transform 0.4s',
        transform: hovered ? 'scale(1.15)' : 'scale(1)',
        lineHeight: 1,
      }}>
        {realm.symbol}
      </div>

      {/* Rune line */}
      <div style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '11px',
        letterSpacing: '0.35em',
        color: hovered ? realm.accent : 'rgba(201,168,76,0.35)',
        marginBottom: '20px',
        transition: 'color 0.4s',
        userSelect: 'none',
      }}>
        {realm.rune}
      </div>

      {/* Accent line */}
      <div style={{
        width: hovered ? '70%' : '28px',
        height: '1px',
        background: `linear-gradient(to right, transparent, ${realm.accent}, transparent)`,
        margin: '0 auto 20px',
        transition: 'width 0.5s ease',
        boxShadow: hovered ? `0 0 8px ${realm.accent}` : 'none',
      }} />

      {/* Realm name */}
      <div style={{
        fontFamily: '"Cinzel Decorative", "Cinzel", "Georgia", serif',
        fontSize: 'clamp(18px, 2vw, 24px)',
        fontWeight: 700,
        letterSpacing: '0.15em',
        color: hovered ? realm.accent : '#d4c5a9',
        marginBottom: '6px',
        transition: 'all 0.35s ease',
        textShadow: hovered ? `0 0 20px ${realm.accent}` : 'none',
        userSelect: 'none',
      }}>
        {realm.name}
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: '"Cinzel", "Georgia", serif',
        fontSize: '10px',
        letterSpacing: '0.4em',
        color: hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
        textTransform: 'uppercase',
        marginBottom: '18px',
        transition: 'color 0.3s',
        userSelect: 'none',
      }}>
        {realm.subtitle}
      </div>

      {/* Nature tags */}
      <div style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '9px',
        letterSpacing: '0.25em',
        color: hovered ? realm.accent : 'rgba(201,168,76,0.3)',
        textTransform: 'uppercase',
        marginBottom: '16px',
        transition: 'color 0.4s',
        userSelect: 'none',
      }}>
        {realm.nature}
      </div>

      {/* Description */}
      <div style={{
        fontSize: '12px',
        color: hovered ? 'rgba(220,215,200,0.7)' : 'rgba(200,195,180,0.3)',
        lineHeight: 1.7,
        fontStyle: 'italic',
        letterSpacing: '0.03em',
        transition: 'color 0.4s',
      }}>
        {realm.description}
      </div>
    </div>
  )
}

export default Yggdrasil
