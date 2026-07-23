import { z } from 'zod'

const platformSchema = z.object({
  name: z.string().trim().min(1),
  url: z.string().trim().optional().default(''),
})

const progressSchema = z.object({
  current: z.number().int().nonnegative().optional().default(0),
  total: z.number().int().nonnegative().nullable().optional(),
})

// Shared fields across all three media types
const baseFields = {
  title: z.string().trim().min(1, 'Title is required'),
  coverImage: z.string().trim().optional().default(''),
  rating: z.number().min(1).max(10).nullable().optional(),
  year: z.number().int().nullable().optional(),
  genres: z.array(z.string()).optional().default([]),
  review: z.string().optional().default(''),
  dateStarted: z.string().nullable().optional(),
  dateCompleted: z.string().nullable().optional(),
  platforms: z.array(platformSchema).optional().default([]),
  customTags: z.array(z.string()).optional().default([]),
}

export const animeCreateSchema = z.object({
  ...baseFields,
  anilistId: z.number().int().nullable().optional(),
  status: z.enum(['Watching', 'Completed', 'Dropped', 'Plan to Watch', 'On Hold']),
  format: z.enum(['Series', 'Movie', 'Special', 'OVA']),
  episodes: progressSchema.optional().default({}),
  rewatchCount: z.number().int().nonnegative().optional().default(0),
})

export const mangaCreateSchema = z.object({
  ...baseFields,
  anilistId: z.number().int().nullable().optional(),
  status: z.enum(['Reading', 'Completed', 'Dropped', 'Plan to Read', 'On Hold']),
  type: z.enum(['Manhwa', 'Manga', 'Manhua']),
  format: z.enum(['Series', 'Special']),
  chapters: progressSchema.optional().default({}),
  rereadCount: z.number().int().nonnegative().optional().default(0),
})

export const dramaCreateSchema = z.object({
  ...baseFields,
  tmdbId: z.number().int().nullable().optional(),
  status: z.enum(['Watching', 'Completed', 'Dropped', 'Plan to Watch', 'On Hold']),
  type: z.enum(['Kdrama', 'Cdrama', 'Jdrama']),
  format: z.enum(['Series', 'Movie', 'Special']),
  episodes: progressSchema.optional().default({}),
  rewatchCount: z.number().int().nonnegative().optional().default(0),
})

export const MEDIA_SCHEMAS = {
  anime: animeCreateSchema,
  manga: mangaCreateSchema,
  drama: dramaCreateSchema,
}

// PUT allows partial updates — Mongoose's findOneAndUpdate doesn't
// require a full document, and every realm's AddToListModal happens to
// resend the full form anyway, but there's no reason to require that
// at the validation layer when the model itself doesn't.
export const MEDIA_UPDATE_SCHEMAS = {
  anime: animeCreateSchema.partial(),
  manga: mangaCreateSchema.partial(),
  drama: dramaCreateSchema.partial(),
}