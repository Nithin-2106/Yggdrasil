import { withCache } from './apiCache'

const TTL_SEARCH = 5 * 60 * 1000
// client/src/utils/tmdbSearch.js
// Robust TMDB drama search with fallback, scoring, and typo tolerance

const BASE = '/api/tmdb'

// ── Country / language allowlist ──────────────────────────────────────────────
const ALLOWED_COUNTRIES = new Set(['KR', 'CN', 'TW', 'HK', 'JP'])
const ALLOWED_LANGUAGES = new Set(['ko', 'zh', 'ja'])

// ── Genre blocklist (non-drama content) ──────────────────────────────────────
// 16 = Animation, 10764 = Reality, 10767 = Talk Show, 10763 = News, 10766 = Soap
const BLOCKED_GENRES = new Set([16, 10764, 10767, 10763, 10766])

// ── Safe fetch with timeout ───────────────────────────────────────────────────
async function safeFetch(url, timeoutMs = 6000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') throw new Error('Request timed out', { cause: err })
    throw err
  }
}

// ── Fetch one page of TV search results ──────────────────────────────────────
async function fetchPage(query, page = 1) {
  try {
    const data = await safeFetch(
      `${BASE}?path=search/tv&query=${encodeURIComponent(query)}&include_adult=false&page=${page}`
    )
    return data.results || []
  } catch {
    return []
  }
}

// ── Check if an item is a valid Asian drama ───────────────────────────────────
function isValidDrama(item) {
  const countries = (item.origin_country || []).map(c => c.toUpperCase())
  const lang      = (item.original_language || '').toLowerCase()
  const genres    = item.genre_ids || []

  const validOrigin =
    countries.some(c => ALLOWED_COUNTRIES.has(c)) ||
    ALLOWED_LANGUAGES.has(lang)

  if (!validOrigin) return false
  if (genres.some(g => BLOCKED_GENRES.has(g))) return false
  return true
}

// ── Deduplicate by TMDB id ────────────────────────────────────────────────────
function dedupe(items) {
  const seen = new Set()
  return items.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

// ── Simple Levenshtein distance for typo tolerance ───────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// ── Score an item against the query ──────────────────────────────────────────
function scoreItem(item, query) {
  const q      = query.toLowerCase().trim()
  const titles = [
    (item.name          || '').toLowerCase(),
    (item.original_name || '').toLowerCase(),
  ].filter(Boolean)

  let score = 0

  for (const title of titles) {
    if (title === q)           { score += 10000; break }
    if (title.startsWith(q))   { score += 5000;  break }
    if (title.includes(q))     { score += 2000;  break }

    const words        = q.split(/\s+/)
    const matchedWords = words.filter(w => title.includes(w))
    score += (matchedWords.length / words.length) * 1500

    const dist = levenshtein(q, title.slice(0, q.length + 3))
    if (dist <= 2) score += Math.max(0, 800 - dist * 300)
  }

  // Trust signal: blend popularity, rating, and vote count
  const pop        = Math.min(item.popularity  || 0, 500)
  const voteAvg    = item.vote_average          || 0
  const voteCount  = Math.min(item.vote_count  || 0, 50000)
  score += pop * 0.4 + voteAvg * 20 + (voteCount / 1000) * 5

  return score
}

// ── Build fallback query variants ─────────────────────────────────────────────
function buildQueryVariants(query) {
  const q        = query.trim()
  const variants = new Set([q])
  const words    = q.split(/\s+/)

  if (words.length > 2) variants.add(words.slice(0, 2).join(' '))
  if (words.length > 3) variants.add(words.slice(0, 3).join(' '))

  const noiseWords = ['season', 'part', 'ep', 'episode', 'ost', 'special']
  const cleaned    = words.filter(w => !noiseWords.includes(w.toLowerCase())).join(' ')
  if (cleaned && cleaned !== q) variants.add(cleaned)

  return [...variants]
}

// ── Main exported search function ─────────────────────────────────────────────
export async function searchDramas(query) {
  if (!query?.trim()) return []
  const q = query.trim()

  return withCache(`tmdb:search:${q}`, TTL_SEARCH, async () => {
    const variants = buildQueryVariants(q)

    const fetches = [
      fetchPage(variants[0], 1),
      fetchPage(variants[0], 2),
      ...variants.slice(1).map(v => fetchPage(v, 1)),
    ]

    const pages      = await Promise.allSettled(fetches)
    const allResults = pages.flatMap(p => p.status === 'fulfilled' ? p.value : [])

    const unique = dedupe(allResults)
    const valid  = unique.filter(isValidDrama)
    const scored = valid.map(item => ({ item, score: scoreItem(item, q) }))
    scored.sort((a, b) => b.score - a.score)

    return scored.map(s => s.item)
  })
}

// ── Helper to detect drama type from a result item ────────────────────────────
export function detectDramaType(item) {
  const countries = (item.origin_country || []).map(c => c.toUpperCase())
  const lang      = (item.original_language || '').toLowerCase()

  if (countries.includes('KR') || lang === 'ko') return 'Kdrama'
  if (['CN', 'TW', 'HK'].some(c => countries.includes(c)) || lang === 'zh') return 'Cdrama'
  if (countries.includes('JP') || lang === 'ja') return 'Jdrama'
  return 'Drama'
}