import { connectDB } from '../_lib/mongodb.js'
import { requireAuth } from '../_lib/auth.js'
import AiConversation from '../_lib/models/AiConversation.js'
import { TOOL_SCHEMAS, executeTool } from '../_lib/ai/tools.js'
import { callGemini } from '../_lib/ai/gemini.js'
import { countRecentAttempts, recordAttempt } from '../_lib/rateLimit.js'

const MAX_TOOL_ROUNDS = 6      // bounds runaway tool loops
const HISTORY_WINDOW = 20      // messages sent to the model per call (not stored history)
const RATE_WINDOW_MS = 60 * 1000
const RATE_MAX = 15            // chat messages per user per minute

const SYSTEM_INSTRUCTION = `You are Mimir, the AI assistant embedded in Yggdrasil, \
a personal media tracker with three realms: Alfheim (anime), Valhalla (manga/manhwa/manhua), \
and Midgard (Asian dramas). Use the available tools to search, add, update, delete, and query \
the user's lists and Top 10s. Always confirm destructive actions (delete) succeeded in your \
reply. Keep responses conversational and concise — the user sees your text plus small chips \
showing which tools ran, so don't narrate tool calls in prose.`

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  let convo = await AiConversation.findOne({ userId: user._id })
  if (!convo) convo = await AiConversation.create({ userId: user._id, messages: [] })

  if (req.method === 'GET') {
    return res.json({ messages: convo.messages })
  }

  if (req.method === 'DELETE') {
    convo.messages = []
    await convo.save()
    return res.json({ messages: [] })
  }

  if (req.method === 'POST') {
    const text = String(req.body?.message || '').trim()
    if (!text) return res.status(400).json({ message: 'message is required' })

    const rateKey = `ai-chat:${user._id}`
    const recent = await countRecentAttempts(rateKey, RATE_WINDOW_MS)
    if (recent >= RATE_MAX) {
      return res.status(429).json({ message: 'Too many messages — slow down a bit.' })
    }
    await recordAttempt(rateKey, RATE_WINDOW_MS)

    convo.messages.push({ role: 'user', content: { type: 'text', text } })

    const activity = [] // tool-call chips for this turn only, returned to frontend

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const windowed = convo.messages.slice(-HISTORY_WINDOW)

      let result
      try {
        result = await callGemini(windowed, TOOL_SCHEMAS, SYSTEM_INSTRUCTION)
      } catch (err) {
  console.error('Gemini call failed:', err?.response?.data || err.message)
  const isRateLimit = err?.response?.status === 429
  convo.messages.push({
    role: 'assistant',
    content: {
      type: 'text',
      text: isRateLimit
        ? "I'm getting rate-limited by Gemini's free tier right now — give it about a minute and try again."
        : "Sorry, I couldn't reach the model just now — try again in a moment.",
    },
  })
  await convo.save()
  return res.json({ messages: convo.messages, activity })
}

      if (result.type === 'text') {
        convo.messages.push({ role: 'assistant', content: { type: 'text', text: result.text } })
        break
      }

      // tool_use — record the call, execute every requested tool, feed results back
      convo.messages.push({ role: 'assistant', content: { type: 'tool_use', calls: result.calls } })

      const results = []
for (const call of result.calls) {
  const toolResult = await executeTool(call.name, call.args, user)
  results.push({ name: call.name, id: call.id, result: toolResult })  // added id
  activity.push({ name: call.name, args: call.args, ok: !toolResult?.error })
}
      convo.messages.push({ role: 'assistant', content: { type: 'tool_result', results } })

      if (round === MAX_TOOL_ROUNDS - 1) {
        convo.messages.push({
          role: 'assistant',
          content: { type: 'text', text: "That took more steps than expected — let me know if you'd like me to keep going." },
        })
      }
    }

    await convo.save()
    return res.json({ messages: convo.messages, activity })
  }

  res.status(405).json({ message: 'Method not allowed' })
}