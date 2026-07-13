import mongoose, { Document, Model, Types } from 'mongoose'

export type Top10Region = 'Korean' | 'Chinese' | 'Japanese'

export interface ITop10Entry {
  position: number
  tmdbId: number | null
  title: string
  coverImage: string
  year: number | null
  type: string
}

export interface ITop10 extends Document {
  region: Top10Region
  entries: ITop10Entry[]
  userId: Types.ObjectId
}

const top10EntrySchema = new mongoose.Schema<ITop10Entry>({
  position:   { type: Number, required: true },
  tmdbId:     { type: Number, default: null },
  title:      { type: String, default: '' },
  coverImage: { type: String, default: '' },
  year:       { type: Number, default: null },
  type:       { type: String, default: '' },
}, { _id: false })

const top10Schema = new mongoose.Schema<ITop10>({
  region:  { type: String, enum: ['Korean', 'Chinese', 'Japanese'], required: true },
  entries: [top10EntrySchema],
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

top10Schema.index({ userId: 1, region: 1 }, { unique: true })

export default (mongoose.models.Top10 as Model<ITop10>) || mongoose.model<ITop10>('Top10', top10Schema)