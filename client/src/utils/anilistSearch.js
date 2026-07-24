import { withCache } from './apiCache'
import { anilistFetch } from './anilistClient'

const TTL_LIST   = 10 * 60 * 1000 // trending/popular/recent/sort pages
const TTL_SEARCH = 5 * 60 * 1000
const TTL_DETAIL = 10 * 60 * 1000
// client/src/utils/anilistSearch.js
// AniList GraphQL API utility for Valhalla (Manga / Manhwa / Manhua)
//
// anilistFetch now comes from the shared anilistClient — AniList enforces
// one rate-limit budget across the whole app (Alfheim + Valhalla both draw
// from it), so every call here goes through that shared, throttled,
// retrying queue instead of hitting graphql.anilist.co directly.

// ── Shared field fragment ─────────────────────────────────────────────────────
const MEDIA_FIELDS = `
  id
  title { english romaji native }
  coverImage { large extraLarge }
  format
  status
  countryOfOrigin
  averageScore
  popularity
  trending
  chapters
  volumes
  genres
  startDate { year month day }
  endDate { year month day }
`

// ── Type helpers ──────────────────────────────────────────────────────────────

// Derive Manga / Manhwa / Manhua from countryOfOrigin
export function detectMangaType(item) {
  const country = item.countryOfOrigin || ''
  if (country === 'KR') return 'Manhwa'
  if (country === 'CN') return 'Manhua'
  return 'Manga' // JP or anything else
}

// Derive display format from AniList format field
export function detectMangaFormat(item) {
  const f = (item.format || '').toUpperCase()
  if (f === 'ONE_SHOT') return 'Special'
  return 'Series'
}

// AniList score is 0–100; convert to 1 decimal /10
// FIX: use score == null instead of !score so a real 0 score isn't swallowed
export function formatScore(score) {
  if (score == null) return null
  return (score / 10).toFixed(1)
}

// Get best available title
export function getTitle(item) {
  return item.title?.english || item.title?.romaji || item.title?.native || ''
}

// Get year from startDate
export function getYear(item) {
  return item.startDate?.year || null
}

// Get best cover image
export function getCover(item) {
  return item.coverImage?.extraLarge || item.coverImage?.large || ''
}

// Human-readable publication status
export function formatStatus(status) {
  if (!status) return ''
  const map = {
    FINISHED:         'Finished',
    RELEASING:        'Releasing',
    NOT_YET_RELEASED: 'Upcoming',
    CANCELLED:        'Cancelled',
    HIATUS:           'On Hiatus',
  }
  return map[status] || status
}

// ── Search ────────────────────────────────────────────────────────────────────
export async function searchManga(query) {
  if (!query?.trim()) return []
  const q = query.trim()

  return withCache(`anilist:search:${q}`, TTL_SEARCH, async () => {
    const qGql = `
      query ($search: String) {
        Page(page: 1, perPage: 24) {
          media(
            search: $search
            type: MANGA
            format_not_in: [NOVEL, MUSIC]
            sort: [SEARCH_MATCH, POPULARITY_DESC]
            isAdult: false
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `
    const data = await anilistFetch(qGql, { search: q })
    return data?.Page?.media || []
  })
}

export async function fetchTrending(limit = 25) {
  return withCache(`anilist:trending:${limit}`, TTL_LIST, async () => {
    const q = `
      query ($limit: Int) {
        Page(page: 1, perPage: $limit) {
          media(
            type: MANGA
            format_not_in: [NOVEL]
            sort: [TRENDING_DESC]
            status_not: NOT_YET_RELEASED
            isAdult: false
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `
    const data = await anilistFetch(q, { limit })
    return data?.Page?.media || []
  })
}

export async function fetchPopular(limit = 50) {
  return withCache(`anilist:popular:${limit}`, TTL_LIST, async () => {
    const q = `
      query ($limit: Int) {
        Page(page: 1, perPage: $limit) {
          media(
            type: MANGA
            format_not_in: [NOVEL]
            sort: [POPULARITY_DESC]
            isAdult: false
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `
    const data = await anilistFetch(q, { limit })
    const media = data?.Page?.media || []
    return media.filter(item => getCover(item) !== '')
  })
}

export async function fetchBySort(sort, page = 1, perPage = 40) {
  return withCache(`anilist:sort:${sort}:${page}:${perPage}`, TTL_LIST, async () => {
    const q = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(
            type: MANGA
            format_not_in: [NOVEL]
            sort: [${sort}]
            isAdult: false
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `
    const data = await anilistFetch(q, { page, perPage })
    return data?.Page?.media || []
  })
}

export async function fetchRecentlyReleased(limit = 25) {
  return withCache(`anilist:recent:${limit}`, TTL_LIST, async () => {
    const q = `
      query ($limit: Int) {
        Page(page: 1, perPage: $limit) {
          media(
            type: MANGA
            format_not_in: [NOVEL]
            sort: [START_DATE_DESC]
            status_not: NOT_YET_RELEASED
            isAdult: false
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `
    const data = await anilistFetch(q, { limit })
    return data?.Page?.media || []
  })
}

export async function fetchMangaDetail(id) {
  return withCache(`anilist:detail:${id}`, TTL_DETAIL, async () => {
    const q = `
      query ($id: Int) {
        Media(id: $id, type: MANGA) {
          id
          title { english romaji native }
          coverImage { large extraLarge }
          bannerImage
          format
          status
          countryOfOrigin
          averageScore
          meanScore
          popularity
          favourites
          trending
          chapters
          volumes
          genres
          tags { name rank isMediaSpoiler }
          startDate { year month day }
          endDate { year month day }
          description(asHtml: false)
          siteUrl
          staff(sort: [RELEVANCE]) {
            edges {
              role
              node {
                id
                name { full native }
                image { medium large }
                siteUrl
              }
            }
          }
          characters(sort: [ROLE, RELEVANCE], perPage: 24) {
            edges {
              role
              node {
                id
                name { full native }
                image { medium large }
                description
              }
            }
          }
          relations {
            edges {
              relationType
              node {
                id
                title { english romaji }
                coverImage { large }
                type
                format
                status
              }
            }
          }
          externalLinks {
            url
            site
            type
          }
        }
      }
    `
    const data = await anilistFetch(q, { id })
    return data?.Media || null
  })
}