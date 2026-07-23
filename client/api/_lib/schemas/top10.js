import { z } from 'zod'

// Shared across all three Top10 variants (anime/manga/drama-region)
const baseSlotFields = {
  title: z.string().trim().optional().default(''),
  coverImage: z.string().trim().optional().default(''),
  year: z.number().int().nullable().optional(),
}

export const animeSlotSchema = z.object({
  ...baseSlotFields,
  anilistId: z.number().int().nullable().optional(),
  format: z.string().trim().optional().default(''),
})

export const mangaSlotSchema = z.object({
  ...baseSlotFields,
  anilistId: z.number().int().nullable().optional(),
  type: z.string().trim().optional().default(''),
  format: z.string().trim().optional().default(''),
})

export const dramaSlotSchema = z.object({
  ...baseSlotFields,
  tmdbId: z.number().int().nullable().optional(),
  type: z.string().trim().optional().default(''),
})

// Slot position must be an integer 1–10. Accepts the value already
// parsed as a number by each route (Number(position) / parseInt(...))
// before validation runs.
export const positionSchema = z
  .number()
  .int('Position must be an integer')
  .min(1, 'Position must be between 1 and 10')
  .max(10, 'Position must be between 1 and 10')