import { withCache } from './apiCache'
import { anilistFetch } from './anilistClient'

const TTL_LIST   = 10 * 60 * 1000 // trending/popular/seasonal/sort pages
const TTL_SEARCH = 5 * 60 * 1000
const TTL_DETAIL = 10 * 60 * 1000
// client/src/utils/anilistAnimeSearch.js
// AniList GraphQL API utility for Alfheim (Anime)
// Replaces the retired Jikan/MyAnimeList integration — no MAL calls remain.
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
  season
  seasonYear
  averageScore
  popularity
  trending
  episodes
  duration
  genres
  startDate { year month day }
  endDate { year month day }
`

// ── Type helpers ──────────────────────────────────────────────────────────────

// Derive display format (Series / Movie / OVA / Special) from AniList's format enum
export function detectAnimeFormat(item) {
  const f = (item.format || '').toUpperCase()
  if (f === 'MOVIE')   return 'Movie'
  if (f === 'OVA')     return 'OVA'
  if (f === 'SPECIAL') return 'Special'
  return 'Series' // TV, TV_SHORT, ONA, MUSIC or anything else
}

// AniList score is 0–100; convert to 1 decimal /10
// score == null (not !score) so a real 0 score isn't swallowed
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

// Human-readable source material
export function formatSource(source) {
  if (!source) return null
  const map = {
    ORIGINAL:            'Original',
    MANGA:                'Manga',
    LIGHT_NOVEL:          'Light Novel',
    VISUAL_NOVEL:         'Visual Novel',
    VIDEO_GAME:           'Video Game',
    OTHER:                'Other',
    NOVEL:                'Novel',
    DOUJINSHI:            'Doujinshi',
    ANIME:                'Anime',
    WEB_NOVEL:            'Web Novel',
    LIVE_ACTION:          'Live Action',
    GAME:                 'Game',
    COMIC:                'Comic',
    MULTIMEDIA_PROJECT:   'Multimedia Project',
    PICTURE_BOOK:         'Picture Book',
  }
  return map[source] || source
}

// Current AniList season + year, used for "Recently Released" (this season airing)
export function getCurrentSeason() {
  const m = new Date().getMonth()
  const y = new Date().getFullYear()
  const season = m < 3 ? 'WINTER' : m < 6 ? 'SPRING' : m < 9 ? 'SUMMER' : 'FALL'
  return { year: y, season }
}

// ── Search ────────────────────────────────────────────────────────────────────
export async function searchAnime(query) {
  if (!query?.trim()) return []
  const q = query.trim()

  return withCache(`anilist:anime:search:${q}`, TTL_SEARCH, async () => {
    const qGql = `
      query ($search: String) {
        Page(page: 1, perPage: 24) {
          media(
            search: $search
            type: ANIME
            format_not_in: [MUSIC]
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
  return withCache(`anilist:anime:trending:${limit}`, TTL_LIST, async () => {
    const q = `
      query ($limit: Int) {
        Page(page: 1, perPage: $limit) {
          media(
            type: ANIME
            format_not_in: [MUSIC]
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
    const media = data?.Page?.media || []
    return media.filter(item => getCover(item) !== '')
  })
}

export async function fetchPopular(limit = 50) {
  return withCache(`anilist:anime:popular:${limit}`, TTL_LIST, async () => {
    const q = `
      query ($limit: Int) {
        Page(page: 1, perPage: $limit) {
          media(
            type: ANIME
            format_not_in: [MUSIC]
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
  return withCache(`anilist:anime:sort:${sort}:${page}:${perPage}`, TTL_LIST, async () => {
    const q = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(
            type: ANIME
            format_not_in: [MUSIC]
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

// Current-season airing anime — replaces the old seasons/now Jikan fallback chain.
// AniList's season/seasonYear filter is accurate server-side, so no client-side
// thinning or pooling across pages is needed here.
export async function fetchSeasonal(limit = 25) {
  const { year, season } = getCurrentSeason()
  return withCache(`anilist:anime:season:${season}:${year}:${limit}`, TTL_LIST, async () => {
    const q = `
      query ($year: Int, $season: MediaSeason, $limit: Int) {
        Page(page: 1, perPage: $limit) {
          media(
            type: ANIME
            format_not_in: [MUSIC]
            season: $season
            seasonYear: $year
            sort: [POPULARITY_DESC]
            status_not: NOT_YET_RELEASED
            isAdult: false
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `
    const data = await anilistFetch(q, { year, season, limit })
    const media = data?.Page?.media || []
    return media.filter(item => getCover(item) !== '')
  })
}

export async function fetchAnimeDetail(id) {
  return withCache(`anilist:anime:detail:${id}`, TTL_DETAIL, async () => {
    const q = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { english romaji native }
          coverImage { large extraLarge }
          bannerImage
          format
          status
          season
          seasonYear
          source
          countryOfOrigin
          averageScore
          meanScore
          popularity
          favourites
          trending
          episodes
          duration
          genres
          tags { name rank isMediaSpoiler }
          startDate { year month day }
          endDate { year month day }
          description(asHtml: false)
          siteUrl
          trailer { id site thumbnail }
          studios(sort: [FAVOURITES_DESC]) {
            edges {
              isMain
              node { id name siteUrl }
            }
          }
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
              voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
                id
                name { full native }
              }
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