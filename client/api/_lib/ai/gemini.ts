import axios from 'axios'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// ─────────────────────────────────────────────────────────────────────────
// Provider-agnostic message shape stored in AiConversation.messages[].content
// ─────────────────────────────────────────────────────────────────────────
export type AgnosticContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; calls: { name: string; args: any }[] }
  | { type: 'tool_result'; results: { name: string; result: any }[] }

export interface AgnosticMessage {
  role: 'user' | 'assistant'
  content: AgnosticContent
}

// Anthropic-shaped TOOL_SCHEMAS (name, description, input_schema) map almost
// 1:1 onto Gemini's function_declarations (name, description, parameters) —
// both are OpenAPI-subset JSON Schema, lowercase types work on the REST
// endpoint (confirmed against Google's current curl examples).
function toGeminiTools(toolSchemas: any[]) {
  return [{
    function_declarations: toolSchemas.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    })),
  }]
}

// Our history -> Gemini `contents`. Tool results MUST use role "function"
// (not "user") — this is the part that's easy to get wrong and silently
// produces a model that "forgets" tool results.
function toGeminiContents(messages: AgnosticMessage[]) {
  return messages.map((msg) => {
    const c = msg.content
    if (c.type === 'text') {
      return { role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: c.text }] }
    }
    if (c.type === 'tool_use') {
      return {
        role: 'model',
        parts: c.calls.map(call => ({ functionCall: { name: call.name, args: call.args } })),
      }
    }
    // tool_result
    return {
      role: 'function',
      parts: c.results.map(r => ({ functionResponse: { name: r.name, response: { result: r.result } } })),
    }
  })
}

function apiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')
  return key
}

export type GeminiResult =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; calls: { name: string; args: any }[] }

// Single generateContent round-trip. Never throws for model-level issues —
// only for transport/auth failures, which the caller should catch.
export async function callGemini(
  messages: AgnosticMessage[],
  toolSchemas: any[],
  systemInstruction: string
): Promise<GeminiResult> {
  const { data } = await axios.post(
    GEMINI_URL,
    {
      contents: toGeminiContents(messages),
      tools: toGeminiTools(toolSchemas),
      systemInstruction: { parts: [{ text: systemInstruction }] },
    },
    {
      headers: { 'x-goog-api-key': apiKey(), 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  )

  const parts = data?.candidates?.[0]?.content?.parts || []
  const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall)

  if (functionCalls.length > 0) {
    return {
      type: 'tool_use',
      calls: functionCalls.map((fc: any) => ({ name: fc.name, args: fc.args || {} })),
    }
  }

  const text = parts.filter((p: any) => p.text).map((p: any) => p.text).join('')
  return { type: 'text', text }
}