import Anime from './Anime.js'
import Manga from './Manga.js'
import Drama from './Drama.js'

// Maps the `type` route param (/api/media/:type) to its Mongoose model.
export const MEDIA_MODELS = {
  anime: Anime,
  manga: Manga,
  drama: Drama,
}