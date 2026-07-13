import mongoose, { Document, Model, Types } from 'mongoose'
import type { IPlatform } from './Anime.js'

export type DramaStatus = 'Watching' | 'Completed' | 'Dropped' | 'Plan to Watch' | 'On Hold'
export type DramaType = 'Kdrama' | 'Cdrama' | 'Jdrama'
export type DramaFormat = 'Series' | 'Movie' | 'Special'

export interface IDrama extends Document {
  title: string
  tmdbId: number | null
  coverImage: string
  status: DramaStatus
  type: DramaType
  format: DramaFormat
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

const dramaSchema = new mongoose.Schema<IDrama>({
  title:        { type: String, required: true },
  tmdbId:       { type: Number, default: null },
  coverImage:   { type: String, default: '' },
  status:       { type: String, enum: ['Watching', 'Completed', 'Dropped', 'Plan to Watch', 'On Hold'], required: true },
  type:         { type: String, enum: ['Kdrama', 'Cdrama', 'Jdrama'], required: true },
  format:       { type: String, enum: ['Series', 'Movie', 'Special'], required: true },
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

export default (mongoose.models.Drama as Model<IDrama>) || mongoose.model<IDrama>('Drama', dramaSchema)