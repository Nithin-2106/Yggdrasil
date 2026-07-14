import axios from 'axios'
import { MEDIA_MODELS, MediaType } from '../models/mediaModels.js'
import Top10 from '../models/Top10.js'
import AnimeTop10 from '../models/AnimeTop10.js'
import MangaTop10 from '../models/MangaTop10.js'
import type { IUser } from '../models/User.js'

// ─────────────────────────────────────────────────────────────────────────
// Realm name → internal media type (matches /api/media/[type] convention)
// ─────────────────────────────────────────────────────────────────────────
const REALM_TYPE: Record<string, MediaType> = {
  alfheim: 'anime',  anime: 'anime',
  valhalla: 'manga', manga: 'manga',
  midgard: 'drama',  drama: 'drama',
}

function resolveType(realm: string): MediaType {
  const t = REALM_TYPE[(realm || '').toLowerCase()]
  if (!t) throw new Error(`Unknown realm: "${realm}". Use alfheim, valhalla, or midgard.`)
  return t
}

const IDENTIFIER_FIELD: Record<MediaType, string> = {
  anime: 'malId',
  manga: 'anilistId',
  drama: 'tmdbId',
}

const DEFAULT_STATUS: Record<MediaType, string> = {
  anime: 'Plan to Watch',
  manga: 'Plan to Read',
  drama: 'Plan to Watch',
}

// ─────────────────────────────────────────────────────────────────────────
// Tool schemas — Anthropic Messages API tool format
// ─────────────────────────────────────────────────────────────────────────
export const TOOL_SCHEMAS = [
  {
    name: 'search_media',
    description:
      'Search for anime (Alfheim), manga/manhwa/manhua (Valhalla), or Asian dramas (Midgard) by title. ' +
      'Returns up to 10 candidates with the realm-specific id needed for add_entry / set_top10_slot.',
    input_schema: {
      type: 'object',
      properties: {
        realm: { type: 'string', enum: ['alfheim', 'valhalla', 'midgard'] },
        query: { type: 'string', description: 'Search query (title)' },
      },
      required: ['realm', 'query'],
    },
  },
  {
    name: 'list_my_entries',
    description:
      "Query the user's list for a realm with optional filters. Use this to answer questions about " +
      'what the user has watched/read, e.g. "what dramas did I complete in 2025 rated above 8?"',
    input_schema: {
      type: 'object',
      properties: {
        realm:           { type: 'string', enum: ['alfheim', 'valhalla', 'midgard'] },
        status:          { type: 'string', description: 'Exact status match, e.g. Completed, Watching, Reading, Dropped, Plan to Watch, Plan to Read, On Hold' },
        minRating:       { type: 'number', description: 'Minimum personal rating (1-10)' },
        maxRating:       { type: 'number', description: 'Maximum personal rating (1-10)' },
        year:            { type: 'number', description: 'Release year filter' },
        completedAfter:  { type: 'string', description: 'ISO date — dateCompleted on/after this date' },
        completedBefore: { type: 'string', description: 'ISO date — dateCompleted on/before this date' },
        titleContains:   { type: 'string', description: 'Case-insensitive substring match on title' },
      },
      required: ['realm'],
    },
  },
  {
    name: 'add_entry',
    description: "Add a new title to the user's list for a realm.",
    input_schema: {
      type: 'object',
      properties: {
        realm: { type: 'string', enum: ['alfheim', 'valhalla', 'midgard'] },
        data: {
          type: 'object',
          description:
            'Entry fields. Must include title and the realm id from a prior search_media call ' +
            '(malId / anilistId / tmdbId). status defaults to a "plan to" state if omitted. ' +
            'Other optional fields: rating, episodes/chapters {current,total}, year, genres, review, ' +
            'dateStarted, dateCompleted, coverImage, format/type.',
        },
      },
      required: ['realm', 'data'],
    },
  },
  {
    name: 'update_entry',
    description:
      "Update fields on an existing entry in the user's list. Call list_my_entries first if you don't " +
      'already know the _id.',
    input_schema: {
      type: 'object',
      properties: {
        realm: { type: 'string', enum: ['alfheim', 'valhalla', 'midgard'] },
        id:    { type: 'string', description: 'MongoDB _id of the entry' },
        data:  { type: 'object', description: 'Partial fields to update' },
      },
      required: ['realm', 'id', 'data'],
    },
  },
  {
    name: 'delete_entry',
    description: "Remove an entry from the user's list.",
    input_schema: {
      type: 'object',
      properties: {
        realm: { type: 'string', enum: ['alfheim', 'valhalla', 'midgard'] },
        id:    { type: 'string', description: 'MongoDB _id of the entry' },
      },
      required: ['realm', 'id'],
    },
  },
  {
    name: 'get_top10',
    description: "Get the user's current Top 10 for a realm. Midgard requires a region.",
    input_schema: {
      type: 'object',
      properties: {
        realm:  { type: 'string', enum: ['alfheim', 'valhalla', 'midgard'] },
        region: { type: 'string', enum: ['Korean', 'Chinese', 'Japanese'], description: 'Required only for midgard' },
      },
      required: ['realm'],
    },
  },
  {
    name: 'set_top10_slot',
    description:
      'Set (overwrite) one slot (1-10) in the Top 10 for a realm. Use search_media first to get the id/title/cover/year.',
    input_schema: {
      type: 'object',
      properties: {
        realm:    { type: 'string', enum: ['alfheim', 'valhalla', 'midgard'] },
        region:   { type: 'string', enum: ['Korean', 'Chinese', 'Japanese'], description: 'Required only for midgard' },
        position: { type: 'number', description: '1 through 10' },
        data:     { type: 'object', description: 'Slot fields: realm id, title, coverImage, year, type/format' },
      },
      required: ['realm', 'position', 'data'],
    },
  },
  {
    name: 'clear_top10_slot',
    description: "Clear one slot (1-10) in the Top 10 for a realm.",
    input_schema: {
      type: 'object',
      properties: {
        realm:    { type: 'string', enum: ['alfheim', 'valhalla', 'midgard'] },
        region:   { type: 'string', enum: ['Korean', 'Chinese', 'Japanese'], description: 'Required only for midgard' },
        position: { type: 'number', description: '1 through 10' },
      },
      required: ['realm', 'position'],
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────
// External search helpers (server-side — no proxy needed except TMDB's key)
// ─────────────────────────────────────────────────────────────────────────
async function searchJikan(query: string) {
  const res = await axios.get('https://api.jikan.moe/v4/anime', {
    params: { q: query, limit: 10, sfw: false },
    timeout: 10000,
  })
  return (res.data?.data || []).map((item: any) => ({
    malId:      item.mal_id,
    title:      item.title_english || item.title,
    coverImage: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
    year:       item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null),
    format:     item.type === 'Movie' ? 'Movie' : item.type === 'OVA' ? 'OVA'
                : (item.type === 'Special' || item.type === 'ONA') ? 'Special' : 'Series',
    episodes:   item.episodes ?? null,
  }))
}

async function searchAniList(query: string) {
  const gql = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(
          search: $search
          type: MANGA
          format_not_in: [NOVEL, MUSIC]
          sort: [SEARCH_MATCH, POPULARITY_DESC]
          isAdult: false
        ) {
          id
          title { english romaji }
          coverImage { extraLarge large }
          countryOfOrigin
          format
          chapters
          startDate { year }
        }
      }
    }
  `
  const res = await axios.post(
    'https://graphql.anilist.co',
    { query: gql, variables: { search: query } },
    { timeout: 10000 }
  )
  const media = res.data?.data?.Page?.media || []
  return media.map((item: any) => ({
    anilistId:  item.id,
    title:      item.title?.english || item.title?.romaji || '',
    coverImage: item.coverImage?.extraLarge || item.coverImage?.large || '',
    year:       item.startDate?.year || null,
    type:       item.countryOfOrigin === 'KR' ? 'Manhwa' : item.countryOfOrigin === 'CN' ? 'Manhua' : 'Manga',
    format:     (item.format || '').toUpperCase() === 'ONE_SHOT' ? 'Special' : 'Series',
    chapters:   item.chapters ?? null,
  }))
}

const TMDB_ALLOWED_COUNTRIES = new Set(['KR', 'CN', 'TW', 'HK', 'JP'])
const TMDB_ALLOWED_LANGUAGES = new Set(['ko', 'zh', 'ja'])
const TMDB_BLOCKED_GENRES    = new Set([16, 10764, 10767, 10763, 10766])

function tmdbDramaType(item: any): string {
  const countries = (item.origin_country || []).map((c: string) => c.toUpperCase())
  const lang = (item.original_language || '').toLowerCase()
  if (countries.includes('KR') || lang === 'ko') return 'Kdrama'
  if (['CN', 'TW', 'HK'].some(c => countries.includes(c)) || lang === 'zh') return 'Cdrama'
  if (countries.includes('JP') || lang === 'ja') return 'Jdrama'
  return 'Drama'
}

async function searchTMDB(query: string) {
  const key = process.env.TMDB_KEY
  if (!key) throw new Error('TMDB_KEY not configured')

  const res = await axios.get('https://api.themoviedb.org/3/search/tv', {
    params: { query, include_adult: false, api_key: key },
    timeout: 10000,
  })

  const valid = (res.data?.results || []).filter((item: any) => {
    const countries = (item.origin_country || []).map((c: string) => c.toUpperCase())
    const lang = (item.original_language || '').toLowerCase()
    const genres = item.genre_ids || []
    const validOrigin =
      countries.some((c: string) => TMDB_ALLOWED_COUNTRIES.has(c)) || TMDB_ALLOWED_LANGUAGES.has(lang)
    return validOrigin && !genres.some((g: number) => TMDB_BLOCKED_GENRES.has(g))
  })

  return valid.slice(0, 10).map((item: any) => ({
    tmdbId:     item.id,
    title:      item.name || item.original_name || '',
    coverImage: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
    year:       item.first_air_date ? parseInt(item.first_air_date.split('-')[0], 10) : null,
    type:       tmdbDramaType(item),
    format:     'Series',
  }))
}

// ─────────────────────────────────────────────────────────────────────────
// Tool implementations — every one is scoped to `user` internally.
// The model never supplies or sees userId.
// ─────────────────────────────────────────────────────────────────────────

async function toolSearchMedia(input: any) {
  const type = resolveType(input.realm)
  const query = String(input.query || '').trim()
  if (!query) throw new Error('query is required')

  if (type === 'anime') return { results: await searchJikan(query) }
  if (type === 'manga') return { results: await searchAniList(query) }
  return { results: await searchTMDB(query) }
}

async function toolListMyEntries(input: any, user: IUser) {
  const type = resolveType(input.realm)
  const Model = MEDIA_MODELS[type]

  const filter: Record<string, any> = { userId: user._id }
  if (input.status) filter.status = input.status
  if (input.year) filter.year = input.year
  if (typeof input.minRating === 'number' || typeof input.maxRating === 'number') {
    filter.rating = {}
    if (typeof input.minRating === 'number') filter.rating.$gte = input.minRating
    if (typeof input.maxRating === 'number') filter.rating.$lte = input.maxRating
  }
  if (input.completedAfter || input.completedBefore) {
    filter.dateCompleted = {}
    if (input.completedAfter)  filter.dateCompleted.$gte = new Date(input.completedAfter)
    if (input.completedBefore) filter.dateCompleted.$lte = new Date(input.completedBefore)
  }
  if (input.titleContains) {
    filter.title = { $regex: String(input.titleContains), $options: 'i' }
  }

  const entries = await Model.find(filter).sort({ title: 1 }).limit(100)
  return { count: entries.length, entries }
}

async function toolAddEntry(input: any, user: IUser) {
  const type = resolveType(input.realm)
  const Model = MEDIA_MODELS[type]
  const idField = IDENTIFIER_FIELD[type]

  const data = { ...(input.data || {}) }
  if (!data.title) throw new Error('data.title is required')
  if (!data[idField]) throw new Error(`data.${idField} is required (get it from search_media first)`)
  if (!data.status) data.status = DEFAULT_STATUS[type]
  if (data.rating != null) data.rating = Number(data.rating)

  const entry = await Model.create({ ...data, userId: user._id })
  return { entry }
}

async function toolUpdateEntry(input: any, user: IUser) {
  const type = resolveType(input.realm)
  const Model = MEDIA_MODELS[type]
  if (!input.id) throw new Error('id is required')

  const entry = await Model.findOneAndUpdate(
    { _id: input.id, userId: user._id },
    input.data || {},
    { new: true, runValidators: true }
  )
  if (!entry) throw new Error('Entry not found')
  return { entry }
}

async function toolDeleteEntry(input: any, user: IUser) {
  const type = resolveType(input.realm)
  const Model = MEDIA_MODELS[type]
  if (!input.id) throw new Error('id is required')

  const entry = await Model.findOneAndDelete({ _id: input.id, userId: user._id })
  if (!entry) throw new Error('Entry not found')
  return { deleted: true, title: entry.title }
}

function emptyTop10Slots(idField: string, extra: Record<string, any> = {}) {
  return Array.from({ length: 10 }, (_, i) => ({
    position: i + 1, [idField]: null, title: '', coverImage: '', year: null, ...extra,
  }))
}

async function toolGetTop10(input: any, user: IUser) {
  const type = resolveType(input.realm)

  if (type === 'anime') {
    let doc = await AnimeTop10.findOne({ userId: user._id })
    if (!doc) doc = await AnimeTop10.create({ userId: user._id, entries: emptyTop10Slots('malId', { format: '' }) })
    return { entries: doc.entries }
  }
  if (type === 'manga') {
    let doc = await MangaTop10.findOne({ userId: user._id })
    if (!doc) doc = await MangaTop10.create({ userId: user._id, entries: emptyTop10Slots('anilistId', { type: '', format: '' }) })
    return { entries: doc.entries }
  }
  // drama — region required
  const region = input.region
  if (!region) throw new Error('region is required for midgard (Korean, Chinese, or Japanese)')
  let doc = await Top10.findOne({ userId: user._id, region })
  if (!doc) doc = await Top10.create({ userId: user._id, region, entries: emptyTop10Slots('tmdbId', { type: '' }) })
  return { entries: doc.entries }
}

async function toolSetTop10Slot(input: any, user: IUser) {
  const type = resolveType(input.realm)
  const pos = Number(input.position)
  if (!pos || pos < 1 || pos > 10) throw new Error('position must be 1-10')
  const data = input.data || {}

  if (type === 'anime') {
    let doc = await AnimeTop10.findOne({ userId: user._id })
    if (!doc) doc = await AnimeTop10.create({ userId: user._id, entries: emptyTop10Slots('malId', { format: '' }) })
    const idx = doc.entries.findIndex((e: any) => e.position === pos)
    doc.entries[idx] = { position: pos, malId: data.malId ?? null, title: data.title || '', coverImage: data.coverImage || '', year: data.year ?? null, format: data.format || '' }
    doc.markModified('entries'); await doc.save()
    return { entries: doc.entries }
  }
  if (type === 'manga') {
    let doc = await MangaTop10.findOne({ userId: user._id })
    if (!doc) doc = await MangaTop10.create({ userId: user._id, entries: emptyTop10Slots('anilistId', { type: '', format: '' }) })
    const idx = doc.entries.findIndex((e: any) => e.position === pos)
    doc.entries[idx] = { position: pos, anilistId: data.anilistId ?? null, title: data.title || '', coverImage: data.coverImage || '', year: data.year ?? null, type: data.type || '', format: data.format || '' }
    doc.markModified('entries'); await doc.save()
    return { entries: doc.entries }
  }
  const region = input.region
  if (!region) throw new Error('region is required for midgard')
  let doc = await Top10.findOne({ userId: user._id, region })
  if (!doc) doc = await Top10.create({ userId: user._id, region, entries: emptyTop10Slots('tmdbId', { type: '' }) })
  const idx = doc.entries.findIndex((e: any) => e.position === pos)
  doc.entries[idx] = { position: pos, tmdbId: data.tmdbId ?? null, title: data.title || '', coverImage: data.coverImage || '', year: data.year ?? null, type: data.type || '' }
  doc.markModified('entries'); await doc.save()
  return { entries: doc.entries }
}

async function toolClearTop10Slot(input: any, user: IUser) {
  return toolSetTop10Slot({ ...input, data: {} }, user)
}

// ─────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────
const HANDLERS: Record<string, (input: any, user: IUser) => Promise<any>> = {
  search_media:      (input) => toolSearchMedia(input),
  list_my_entries:    toolListMyEntries,
  add_entry:          toolAddEntry,
  update_entry:       toolUpdateEntry,
  delete_entry:       toolDeleteEntry,
  get_top10:          toolGetTop10,
  set_top10_slot:     toolSetTop10Slot,
  clear_top10_slot:   toolClearTop10Slot,
}

// Called from the agentic loop in chat.js. Never throws — tool errors are
// returned as { error } so the model can see them and recover/retry.
export async function executeTool(name: string, input: any, user: IUser) {
  const handler = HANDLERS[name]
  if (!handler) return { error: `Unknown tool: ${name}` }
  try {
    return await handler(input, user)
  } catch (err: any) {
    return { error: err?.message || 'Tool execution failed' }
  }
}