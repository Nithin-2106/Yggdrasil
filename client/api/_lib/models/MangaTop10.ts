import mongoose, { Document, Model, Types } from 'mongoose'

export interface IMangaTop10Entry {
  position: number
  anilistId: number | null
  title: string
  coverImage: string
  year: number | null
  type: string
  format: string
}

export interface IMangaTop10 extends Document {
  entries: IMangaTop10Entry[]
  userId: Types.ObjectId
}

const mangaTop10EntrySchema = new mongoose.Schema<IMangaTop10Entry>({
  position:   { type: Number, required: true },
  anilistId:  { type: Number, default: null },
  title:      { type: String, default: '' },
  coverImage: { type: String, default: '' },
  year:       { type: Number, default: null },
  type:       { type: String, default: '' },
  format:     { type: String, default: '' },
}, { _id: false })

const mangaTop10Schema = new mongoose.Schema<IMangaTop10>({
  entries: [mangaTop10EntrySchema],
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export default (mongoose.models.MangaTop10 as Model<IMangaTop10>) || mongoose.model<IMangaTop10>('MangaTop10', mangaTop10Schema)