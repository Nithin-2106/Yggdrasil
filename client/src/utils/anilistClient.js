// client/src/utils/anilistClient.js
//
// Shared, rate-limited, retrying client for the AniList GraphQL API.
//
// WHY THIS EXISTS: AniList enforces ONE budget per client IP across the
// entire GraphQL endpoint — anime queries (Alfheim) and manga queries
// (Valhalla) draw from the exact same pool, currently capped at 30
// requests/minute (degraded mode; normally 90), with a 1-minute lockout
// on top if you exceed it. Every AniList call in the app — from either
// realm — MUST funnel through this module. If any file makes its own
// direct fetch() to graphql.anilist.co, it bypasses the shared queue and
// can blow the budget for the whole app, which is exactly what was
// happening before this file existed.

const ENDPOINT = 'https://graphql.anilist.co'

// Conservative cap — stays under AniList's current 30/min degraded-mode
// limit with margin, so normal usage never triggers the 1-minute lockout.
const MAX_REQUESTS_PER_MINUTE = 25
const WINDOW_MS = 60 * 1000
const MAX_RETRIES = 3

const queue = []
let processing = false
const requestTimestamps = [] // rolling window of request start times

function msUntilSlotFree() {
  const now = Date.now()
  while (requestTimestamps.length && now - requestTimestamps[0] > WINDOW_MS) {
    requestTimestamps.shift()
  }
  if (requestTimestamps.length < MAX_REQUESTS_PER_MINUTE) return 0
  return WINDOW_MS - (now - requestTimestamps[0]) + 50 // small safety buffer
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Single global loop drains the queue, spacing requests out so the
// rolling 60s window never exceeds MAX_REQUESTS_PER_MINUTE — regardless
// of how many components across either realm enqueue at once.
async function processQueue() {
  if (processing) return
  processing = true
  while (queue.length) {
    const wait = msUntilSlotFree()
    if (wait > 0) await sleep(wait)
    requestTimestamps.push(Date.now())
    const job = queue.shift()
    job()
  }
  processing = false
}

function enqueue(run) {
  return new Promise((resolve) => {
    queue.push(() => resolve(run()))
    processQueue()
  })
}

async function rawFetch(query, variables) {
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
}

/**
 * Rate-limited, retrying AniList GraphQL fetch. Use this everywhere
 * instead of calling graphql.anilist.co directly.
 *
 * On a 429, retries with backoff honoring AniList's Retry-After header
 * (falls back to exponential backoff if the header is missing) instead
 * of failing immediately. Returns the `data` object on success, or null
 * if the query ultimately fails — matching the old per-realm anilistFetch
 * return shape so call sites don't need to change their handling.
 */
export async function anilistFetch(query, variables = {}, attempt = 0) {
  try {
    const res = await enqueue(() => rawFetch(query, variables))

    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) {
        console.error('AniList rate limit exceeded after retries — giving up on this query')
        return null
      }
      const retryAfterHeader = Number(res.headers.get('Retry-After'))
      const retryAfterSeconds = retryAfterHeader > 0 ? retryAfterHeader : (2 ** attempt) * 2
      await sleep(retryAfterSeconds * 1000)
      return anilistFetch(query, variables, attempt + 1)
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    // AniList can return HTTP 200 with an errors array — handle gracefully
    if (json.errors?.length) {
      console.warn('AniList error:', json.errors[0].message)
      return null
    }
    return json.data || null
  } catch (err) {
    console.error('AniList fetch error:', err)
    return null
  }
}