// client/src/utils/jikanSearch.js
const BASE = 'https://api.jikan.moe/v4'

// Jikan has rate limiting — 3 requests/second, 60/minute
// We add a small delay between calls to be safe
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Safe fetch with timeout
async function safeFetch(url, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') throw new Error('Request timed out')
    throw err
  }
}

// Main search function
export async function searchAnime(query) {
  if (!query?.trim()) return []
  try {
    await sleep(300) // respect rate limit
    const data = await safeFetch(
      `${BASE}/anime?q=${encodeURIComponent(query.trim())}&limit=20&sfw=false`
    )
    return data.data || []
  } catch {
    return []
  }
}

// Detect format from Jikan type field
export function detectAnimeFormat(item) {
  const type = (item.type || '').toLowerCase()
  if (type === 'movie')  return 'Movie'
  if (type === 'ova')    return 'OVA'
  if (type === 'special' || type === 'ona') return 'Special'
  return 'Series'
}

// Get a clean year from Jikan aired data
export function getAnimeYear(item) {
  if (item.year) return item.year
  if (item.aired?.from) return new Date(item.aired.from).getFullYear()
  return null
}