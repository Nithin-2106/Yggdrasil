import { Component } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// Shared error boundary — themed via `colors` prop so each realm can pass
// its own C palette (Midgard first, per source-of-truth convention; port
// to Alfheim/Valhalla by just passing their C objects in).
//
// Usage:
//   <ErrorBoundary colors={C} realmName="Midgard" onReturnHome={() => onNavigate('Dashboard')}>
//     {...realm content...}
//   </ErrorBoundary>
// ─────────────────────────────────────────────────────────────────────────

function Corners({ color, size = 14, opacity = 0.5 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 10, left: 10,    borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 10, right: 10,   borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 10, left: 10,  borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 10, right: 10, borderBottom: b, borderRight: b }} />
    </>
  )
}

function ErrorFallback({ colors: C, realmName, error, onRetry, onReturnHome }) {
  return (
    <div style={{
      minHeight: '50vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        position: 'relative',
        maxWidth: '480px',
        width: '100%',
        padding: '56px 40px',
        textAlign: 'center',
        border: `1px dashed ${C.borderGold}`,
        background: C.surface || 'transparent',
      }}>
        <Corners color={C.gold} size={14} opacity={0.5} />

        <div style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '32px',
          color: (C.gold || C.goldBright) + '55',
          letterSpacing: '0.4em',
          marginBottom: '20px',
        }}>ᛟ</div>

        <div style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '15px',
          fontWeight: 700,
          letterSpacing: '0.25em',
          color: C.text,
          textTransform: 'uppercase',
          marginBottom: '14px',
        }}>
          The Well Has Run Dry
        </div>

        <div style={{
          fontSize: '13px',
          color: C.textMuted,
          lineHeight: 1.7,
          letterSpacing: '0.02em',
          marginBottom: '32px',
        }}>
          Something went wrong rendering {realmName ? `this corner of ${realmName}` : 'this page'}.
          The rest of the realm is safe — try again, or head back to the dashboard.
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onRetry}
            style={{
              fontFamily: '"Cinzel", serif',
              fontSize: '11px',
              letterSpacing: '0.2em',
              color: C.electric || C.goldBright,
              background: C.electricSoft || 'transparent',
              border: `1px solid ${(C.electric || C.goldBright)}55`,
              padding: '10px 24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
            }}
          >
            ↻ Try Again
          </button>
          {onReturnHome && (
            <button
              onClick={onReturnHome}
              style={{
                fontFamily: '"Cinzel", serif',
                fontSize: '11px',
                letterSpacing: '0.2em',
                color: C.textMuted,
                background: 'transparent',
                border: `1px solid ${C.borderGold}`,
                padding: '10px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'uppercase',
              }}
            >
              Return to Dashboard
            </button>
          )}
        </div>

        {import.meta.env?.DEV && error && (
          <div style={{
            marginTop: '28px',
            padding: '12px 14px',
            textAlign: 'left',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: C.textDim,
            background: 'rgba(0,0,0,0.25)',
            border: `1px solid ${C.borderGold}`,
            maxHeight: '160px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}>
            {error.toString()}
          </div>
        )}
      </div>
    </div>
  )
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.handleRetry = this.handleRetry.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // TODO: POST to /api/log-error (or wire Sentry) once monitoring lands —
    // item 8.4 in the roadmap. For now, surface it in the console so it's
    // at least visible during dev/manual QA.
    console.error(`[ErrorBoundary${this.props.realmName ? ` — ${this.props.realmName}` : ''}]`, error, info)
  }

  handleRetry() {
    this.setState({ error: null })
  }

  handleReturnHome() {
    this.setState({ error: null })
    this.props.onReturnHome?.()
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          colors={this.props.colors}
          realmName={this.props.realmName}
          error={this.state.error}
          onRetry={this.handleRetry}
          onReturnHome={this.props.onReturnHome ? () => this.handleReturnHome() : null}
        />
      )
    }
    return this.props.children
  }
}