import mongoose, { Document, Model, Types } from 'mongoose'

export interface IPlatform {
  name: string
  url: string
}

export type AnimeStatus = 'Watching' | 'Completed' | 'Dropped' | 'Plan to Watch' | 'On Hold'
export type AnimeFormat = 'Series' | 'Movie' | 'Special' | 'OVA'

export interface IAnime extends Document {
  title: string
  anilistId: number | null
  coverImage: string
  status: AnimeStatus
  format: AnimeFormat
  rating: number | null
  episodes: { current: number; total: number | null }
  year: number | null
  genres: string[]
  review: string
  rewatchCount: number
  dateStarted: Date | null
  dateCompleted: Date | null
  platforms: IPlatform[]
  customTags: string[]
  userId: Types.ObjectId
}

const platformSchema = new mongoose.Schema<IPlatform>({
  name: { type: String, required: true },
  url:  { type: String, default: '' }
}, { _id: false })

const animeSchema = new mongoose.Schema<IAnime>({
  title:        { type: String, required: true },
  anilistId:        { type: Number, default: null },
  coverImage:   { type: String, default: '' },
  status:       { type: String, enum: ['Watching', 'Completed', 'Dropped', 'Plan to Watch', 'On Hold'], required: true },
  format:       { type: String, enum: ['Series', 'Movie', 'Special', 'OVA'], required: true },
  rating:       { type: Number, min: 1, max: 10, default: null },
  episodes: {
    current:    { type: Number, default: 0 },
    total:      { type: Number, default: null }
  },
  year:         { type: Number, default: null },
  genres:       [{ type: String }],
  review:       { type: String, default: '' },
  rewatchCount: { type: Number, default: 0 },
  dateStarted:  { type: Date, default: null },
  dateCompleted:{ type: Date, default: null },
  platforms:    [platformSchema],
  customTags:   [{ type: String }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export default (mongoose.models.Anime as Model<IAnime>) || mongoose.model<IAnime>('Anime', animeSchema)