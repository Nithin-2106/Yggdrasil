import axios from 'axios'

// gemini-2.5-flash was retired for new API keys (404 "no longer available
// to new users") shortly after this was first wired up. Using the
// `-latest` alias instead of a pinned version avoids repeating that —
// Google keeps it pointed at whatever their current recommended Flash
// model is, rather than a fixed version that can be deprecated later.
// Override via GEMINI_MODEL if you want a pinned, predictable version instead.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// ─────────────────────────────────────────────────────────────────────────
// Provider-agnostic message shape stored in AiConversation.messages[].content
// ─────────────────────────────────────────────────────────────────────────
export type AgnosticContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; calls: { name: string; args: any; id?: string; thoughtSignature?: string }[] }
  | { type: 'tool_result'; results: { name: string; result: any; id?: string }[] }

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

// Our history -> Gemini `contents`. Tool-result turns use role "user" (the
// v1beta REST API rejects role "function"); tool_use turns from the model
// must echo back the exact functionCall id + thoughtSignature Gemini gave us.
function toGeminiContents(messages: AgnosticMessage[]) {
  return messages.map((msg) => {
    const c = msg.content

    if (c.type === 'text') {
      return { role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: c.text }] }
    }

    if (c.type === 'tool_use') {
      return {
        role: 'model',
        parts: c.calls.map(call => ({
          functionCall: {
            name: call.name,
            args: call.args,
            ...(call.id ? { id: call.id } : {}),
          },
          ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}),
        })),
      }
    }

    // tool_result
    return {
      role: 'user',
      parts: c.results.map(r => ({
        functionResponse: {
          name: r.name,
          response: { result: r.result },
          ...(r.id ? { id: r.id } : {}),
        },
      })),
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
  | { type: 'tool_use'; calls: { name: string; args: any; id?: string; thoughtSignature?: string }[] }

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
  const functionCallParts = parts.filter((p: any) => p.functionCall)

  if (functionCallParts.length > 0) {
    return {
      type: 'tool_use',
      calls: functionCallParts.map((p: any) => ({
        name: p.functionCall.name,
        args: p.functionCall.args || {},
        id: p.functionCall.id,               // nested inside functionCall
        thoughtSignature: p.thoughtSignature, // sibling of functionCall on the Part
      })),
    }
  }

  const text = parts.filter((p: any) => p.text).map((p: any) => p.text).join('')
  return { type: 'text', text }
}