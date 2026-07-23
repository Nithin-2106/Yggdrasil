// client/src/utils/jikanSearch.js
import { withCache } from './apiCache'

const TTL_SEARCH = 5 * 60 * 1000 // 5 min — only applies to *successful* responses
const BASE = 'https://api.jikan.moe/v4'

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 3
const FETCH_TIMEOUT_MS = 8000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Thrown when Jikan/MAL can't be reached after retries, so callers can
// show "the API is down, try again" instead of a fake "no results" state.
export class JikanUnavailableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'JikanUnavailableError'
  }
}

async function safeFetch(url, { signal } = {}) {
  let lastError = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    if (attempt > 0) {
      // ~1s, then ~2s, with a little jitter so retries don't all land in sync
      await sleep(1000 * 2 ** (attempt - 1) + Math.random() * 300)
    }

    const controller = new AbortController()
    const onOuterAbort = () => controller.abort()
    signal?.addEventListener('abort', onOuterAbort)
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      signal?.removeEventListener('abort', onOuterAbort)

      if (RETRYABLE_STATUSES.has(res.status)) {
        lastError = new JikanUnavailableError(`Jikan returned ${res.status}`)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onOuterAbort)

      if (err.name === 'AbortError' && signal?.aborted) throw err // caller cancelled — bail immediately
      if (err.name === 'AbortError') {
        lastError = new JikanUnavailableError('Request to Jikan timed out')
        continue
      }
      lastError = err
    }
  }

  throw lastError instanceof JikanUnavailableError
    ? lastError
    : new JikanUnavailableError('Jikan is currently unreachable')
}

export async function searchAnime(query, { signal } = {}) {
  if (!query?.trim()) return []
  const q = query.trim()

  // IMPORTANT: no try/catch here. If safeFetch throws, that rejection must
  // propagate past withCache uncaught — otherwise a transient MAL outage
  // gets cached as a real "zero results" answer for TTL_SEARCH.
  return withCache(`jikan:search:${q}`, TTL_SEARCH, async () => {
    await sleep(400)
    const data = await safeFetch(
      `${BASE}/anime?q=${encodeURIComponent(q)}&limit=20&sfw=false`,
      { signal }
    )
    return data?.data || []
  })
}

export function detectAnimeFormat(item) {
  const type = (item.type || '').toLowerCase()
  if (type === 'movie') return 'Movie'
  if (type === 'ova') return 'OVA'
  if (type === 'special' || type === 'ona') return 'Special'
  return 'Series'
}

export function getAnimeYear(item) {
  if (item.year) return item.year
  if (item.aired?.from) return new Date(item.aired.from).getFullYear()
  return null
}