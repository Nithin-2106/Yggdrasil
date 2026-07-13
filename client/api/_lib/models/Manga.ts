import mongoose, { Document, Model, Types } from 'mongoose'
import type { IPlatform } from './Anime.js'

export type MangaStatus = 'Reading' | 'Completed' | 'Dropped' | 'Plan to Read' | 'On Hold'
export type MangaType = 'Manhwa' | 'Manga' | 'Manhua'
export type MangaFormat = 'Series' | 'Special'

export interface IManga extends Document {
  title: string
  anilistId: number | null
  coverImage: string
  status: MangaStatus
  type: MangaType
  format: MangaFormat
  rating: number | null
  chapters: { current: number; total: number | null }
  year: number | null
  genres: string[]
  review: string
  rereadCount: number
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

const mangaSchema = new mongoose.Schema<IManga>({
  title:        { type: String, required: true },
  anilistId:    { type: Number, default: null },
  coverImage:   { type: String, default: '' },
  status:       { type: String, enum: ['Reading', 'Completed', 'Dropped', 'Plan to Read', 'On Hold'], required: true },
  type:         { type: String, enum: ['Manhwa', 'Manga', 'Manhua'], required: true },
  format:       { type: String, enum: ['Series', 'Special'], required: true },
  rating:       { type: Number, min: 1, max: 10, default: null },
  chapters: {
    current:    { type: Number, default: 0 },
    total:      { type: Number, default: null }
  },
  year:         { type: Number, default: null },
  genres:       [{ type: String }],
  review:       { type: String, default: '' },
  rereadCount:  { type: Number, default: 0 },
  dateStarted:  { type: Date, default: null },
  dateCompleted:{ type: Date, default: null },
  platforms:    [platformSchema],
  customTags:   [{ type: String }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export default (mongoose.models.Manga as Model<IManga>) || mongoose.model<IManga>('Manga', mangaSchema)