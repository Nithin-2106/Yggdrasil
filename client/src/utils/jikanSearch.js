// client/src/utils/jikanSearch.js
const BASE = 'https://api.jikan.moe/v4'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function safeFetch(url, timeoutMs = 10000) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(2000 * attempt)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (res.status === 429) {
        await sleep(3000 * (attempt + 1))
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        if (attempt === 3) throw new Error('Request timed out', { cause: err })
        continue
      }
      if (attempt === 3) throw err
    }
  }
}

export async function searchAnime(query) {
  if (!query?.trim()) return []
  try {
    await sleep(400)
    const data = await safeFetch(
      `${BASE}/anime?q=${encodeURIComponent(query.trim())}&limit=20&sfw=false`
    )
    return data?.data || []
  } catch {
    return []
  }
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