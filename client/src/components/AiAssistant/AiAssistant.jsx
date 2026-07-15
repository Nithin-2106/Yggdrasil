import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

// ─────────────────────────────────────────────────────────────────────────
// Mimir — the assistant that lives above every realm.
//
// Wired to the real backend:
//   GET    /api/ai/chat            -> { messages }              (on mount)
//   POST   /api/ai/chat {message}  -> { messages, activity }    (on send)
//   DELETE /api/ai/chat            -> { messages: [] }          (new chat)
//
// Auth: assumes axios already carries the Authorization header globally
// (set once in AuthContext, per the existing app convention) — this
// component does not attach the token itself. It should only ever be
// mounted while a user is logged in; the caller in App.jsx is responsible
// for that gate (see integration notes).
// ─────────────────────────────────────────────────────────────────────────

const C = {
  bg:       '#0C0A07', // root-black — panel backdrop
  panel:    '#161209', // bark — assistant bubble / panel surface
  panelAlt: '#1F1911', // lighter bark — user bubble / hover states
  ink:      '#E9E1CC', // parchment — primary text
  inkDim:   '#A79A7D', // muted parchment — eyebrows, timestamps, placeholder
  wisdom:   '#C9A05B', // rune-gold — primary accent
  well:     '#4E8C86', // well-water teal — thinking / active accent only
  danger:   '#A6503D', // dried-rune red — errors only
  line:     'rgba(201,160,91,0.18)',
  lineBright: 'rgba(201,160,91,0.4)',
}

const FONT_BODY = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const ACTIVITY_LABELS = {
  search_media: 'Searched a realm',
  list_my_entries: 'Queried your list',
  add_entry: 'Added an entry',
  update_entry: 'Updated an entry',
  delete_entry: 'Removed an entry',
  get_top10: 'Checked Top 10',
  set_top10_slot: 'Updated Top 10',
  clear_top10_slot: 'Cleared a Top 10 slot',
}

// ─────────────────────────────────────────────────────────────────────────
// Icons — small inline SVGs, no icon-library dependency added.
// ─────────────────────────────────────────────────────────────────────────
function RuneMark({ size = 22, color = C.wisdom, ring = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      {ring && <circle cx="20" cy="20" r="18.5" stroke={color} strokeWidth="1" opacity="0.55" />}
      <circle cx="20" cy="20" r="3.2" fill={color} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="20" y1="20"
          x2={20 + 14 * Math.cos((deg * Math.PI) / 180)}
          y2={20 + 14 * Math.sin((deg * Math.PI) / 180)}
          stroke={color}
          strokeWidth="1.1"
          opacity={deg % 90 === 0 ? 0.9 : 0.45}
        />
      ))}
    </svg>
  )
}

function SendIcon({ color = C.bg }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12L21 3L14 21L11 13L3 12Z" fill={color} />
    </svg>
  )
}

function CloseIcon({ color = C.inkDim }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4L20 20M20 4L4 20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function NewChatIcon({ color = C.inkDim }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12a8 8 0 1 1 2.6 5.9M4 12V6M4 12h6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// "Consulting the well" — a root-vein line with a pulse of light
// traveling along it, used both for initial history load and per-turn
// thinking, rather than a generic spinner.
// ─────────────────────────────────────────────────────────────────────────
function ThinkingVein({ label = 'consulting the well…' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px' }}>
      <div
        style={{
          position: 'relative',
          width: 56,
          height: 2,
          background: C.line,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          className="mimir-vein-pulse"
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: '40%',
            background: `linear-gradient(90deg, transparent, ${C.well}, transparent)`,
          }}
        />
      </div>
      <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkDim, fontStyle: 'italic' }}>
        {label}
      </span>
    </div>
  )
}

function ActivityChip({ name, ok }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 9px',
        borderRadius: 999,
        border: `1px solid ${ok ? C.line : 'rgba(166,80,61,0.4)'}`,
        background: 'rgba(0,0,0,0.2)',
        fontFamily: FONT_BODY,
        fontSize: 11,
        color: ok ? C.wisdom : C.danger,
        marginTop: 6,
        marginRight: 6,
      }}
    >
      <span style={{ fontSize: 9 }}>{ok ? '◆' : '✕'}</span>
      {ACTIVITY_LABELS[name] || name}
    </div>
  )
}

function MessageBubble({ msg, activity }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
      <div style={{ maxWidth: '82%' }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: C.ink,
            background: isUser ? C.panelAlt : 'transparent',
            border: isUser ? `1px solid ${C.line}` : 'none',
            borderLeft: !isUser ? `2px solid ${C.wisdom}` : undefined,
            borderRadius: isUser ? 14 : 0,
            padding: isUser ? '8px 12px' : '2px 0 2px 12px',
          }}
        >
          {msg.content.text}
        </div>
        {!isUser && activity?.length > 0 && (
          <div style={{ paddingLeft: 12 }}>
            {activity.map((a, i) => (
              <ActivityChip key={i} {...a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: C.inkDim }}>
      <div style={{ marginBottom: 10, opacity: 0.6 }}>
        <RuneMark size={30} ring={false} />
      </div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.6 }}>
        Ask Mimir to search a title, add it to a realm, or reshape a Top 10.
      </div>
    </div>
  )
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div
      style={{
        margin: '0 16px 10px 16px',
        padding: '8px 10px',
        borderRadius: 10,
        border: `1px solid rgba(166,80,61,0.4)`,
        background: 'rgba(166,80,61,0.1)',
        color: C.danger,
        fontFamily: FONT_BODY,
        fontSize: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}
      >
        <CloseIcon color={C.danger} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────
export default function AiAssistant() {
  const { user, loading: authLoading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  // Chips only apply to the most recent turn — the backend doesn't
  // persist them per-message, so they're kept as ephemeral local state
  // rather than attached to the message objects themselves.
  const [lastActivity, setLastActivity] = useState([])
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // Load history once on mount — the widget is only ever mounted while
  // logged in (App.jsx gates it), so no auth check needed here.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      try {
        const { data } = await axios.get('/api/ai/chat')
        if (!cancelled) setMessages(data.messages || [])
      } catch {
        if (!cancelled) setErrorMsg("Couldn't load your conversation with Mimir.")
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, isThinking, isOpen])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 250)
  }, [isOpen])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  async function handleSend() {
    const text = input.trim()
    if (!text || isThinking) return
    setInput('')
    setErrorMsg(null)
    setLastActivity([])
    // Optimistic append so the user's own message shows immediately;
    // gets superseded by the server's authoritative history below.
    setMessages((prev) => [...prev, { role: 'user', content: { type: 'text', text } }])
    setIsThinking(true)

    try {
      const { data } = await axios.post('/api/ai/chat', { message: text })
      setMessages(data.messages || [])
      setLastActivity(data.activity || [])
    } catch (err) {
      const serverMsg = err.response?.data?.message
      setErrorMsg(serverMsg || "Mimir couldn't reach the well just now — try again in a moment.")
    } finally {
      setIsThinking(false)
    }
  }

  async function handleNewChat() {
    try {
      await axios.delete('/api/ai/chat')
      setMessages([])
      setLastActivity([])
      setErrorMsg(null)
    } catch {
      setErrorMsg("Couldn't start a new chat — try again in a moment.")
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Only 'text' content blocks render as bubbles — tool_use / tool_result
  // blocks exist in history for resumability but are never shown directly.
  const renderable = messages.filter((m) => m.content?.type === 'text')

  // Gate on auth *after* all hooks above have run, so hook order/count
  // stays identical across renders regardless of login state.
  if (authLoading || !user) return null

  return (
    <div style={{ fontFamily: FONT_BODY }}>
      <style>{`
        @keyframes mimir-breathe {
          0%, 100% { box-shadow: 0 0 0px 0px rgba(201,160,91,0.35), 0 0 18px 2px rgba(201,160,91,0.18); }
          50%      { box-shadow: 0 0 0px 0px rgba(201,160,91,0.5), 0 0 26px 6px rgba(201,160,91,0.3); }
        }
        @keyframes mimir-vein-travel {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes mimir-rise {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .mimir-orb { animation: mimir-breathe 3.6s ease-in-out infinite; }
        .mimir-vein-pulse { animation: mimir-vein-travel 1.4s ease-in-out infinite; }
        .mimir-panel { animation: mimir-rise 0.22s ease-out; }
        .mimir-input:focus { border-color: ${C.wisdom} !important; }
        .mimir-scroll::-webkit-scrollbar { width: 6px; }
        .mimir-scroll::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 4px; }
        @media (prefers-reduced-motion: reduce) {
          .mimir-orb, .mimir-vein-pulse, .mimir-panel { animation: none !important; }
        }
      `}</style>

      {isOpen && (
        <div
          className="mimir-panel"
          role="dialog"
          aria-label="Mimir assistant"
          style={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            width: 'min(92vw, 380px)',
            height: 'min(72vh, 560px)',
            background: C.bg,
            border: `1px solid ${C.line}`,
            borderRadius: 16,
            boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9998,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: `1px solid ${C.line}`,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <RuneMark size={22} />
              <div>
                <div
                  style={{
                    fontFamily: '"Cinzel Decorative", serif',
                    fontSize: 15,
                    color: C.ink,
                    letterSpacing: '0.5px',
                    lineHeight: 1.1,
                  }}
                >
                  MIMIR
                </div>
                <div
                  style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 9.5,
                    color: C.inkDim,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  keeper of the well
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={handleNewChat} aria-label="New chat" title="New chat" style={iconButtonStyle}>
                <NewChatIcon />
              </button>
              <button onClick={() => setIsOpen(false)} aria-label="Close Mimir" title="Close" style={iconButtonStyle}>
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="mimir-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 4px 16px' }}>
            {loadingHistory ? (
              <ThinkingVein label="opening the well…" />
            ) : renderable.length === 0 ? (
              <EmptyState />
            ) : (
              renderable.map((m, i) => (
                <MessageBubble
                  key={i}
                  msg={m}
                  activity={i === renderable.length - 1 && m.role === 'assistant' ? lastActivity : null}
                />
              ))
            )}
            {isThinking && <ThinkingVein />}
          </div>

          {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

          {/* Composer */}
          <div style={{ padding: 12, borderTop: `1px solid ${C.line}`, flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                background: C.panelAlt,
                border: `1px solid ${C.line}`,
                borderRadius: 12,
                padding: '8px 8px 8px 12px',
              }}
            >
              <textarea
                ref={inputRef}
                className="mimir-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Mimir…"
                rows={1}
                style={{
                  flex: 1,
                  resize: 'none',
                  background: 'transparent',
                  border: `1px solid transparent`,
                  outline: 'none',
                  color: C.ink,
                  fontFamily: FONT_BODY,
                  fontSize: 13.5,
                  lineHeight: 1.4,
                  maxHeight: 90,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                aria-label="Send message"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: 'none',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: !input.trim() || isThinking ? C.line : C.wisdom,
                  cursor: !input.trim() || isThinking ? 'default' : 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <SendIcon color={!input.trim() || isThinking ? C.inkDim : C.bg} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orb */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Close Mimir' : 'Open Mimir, your assistant'}
        className={isOpen ? '' : 'mimir-orb'}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${C.panelAlt}, ${C.bg})`,
          border: `1px solid ${C.lineBright}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
        }}
      >
        {isOpen ? <CloseIcon color={C.wisdom} /> : <RuneMark size={26} />}
      </button>
    </div>
  )
}

const iconButtonStyle = {
  width: 26,
  height: 26,
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}