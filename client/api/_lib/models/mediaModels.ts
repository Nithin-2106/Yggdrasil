import type { Model } from 'mongoose'
import Anime, { IAnime } from './Anime.js'
import Manga, { IManga } from './Manga.js'
import Drama, { IDrama } from './Drama.js'

export type MediaType = 'anime' | 'manga' | 'drama'
export type MediaDocument = IAnime | IManga | IDrama

// Maps the `type` route param (/api/media/:type) to its Mongoose model.
export const MEDIA_MODELS: Record<MediaType, Model<MediaDocument>> = {
  anime: Anime as unknown as Model<MediaDocument>,
  manga: Manga as unknown as Model<MediaDocument>,
  drama: Drama as unknown as Model<MediaDocument>,
}

export function isMediaType(value: string | string[] | undefined): value is MediaType {
  return typeof value === 'string' && value in MEDIA_MODELS
}