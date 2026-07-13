import mongoose, { Document, Model, Types } from 'mongoose'

export interface IAnimeTop10Entry {
  position: number
  malId: number | null
  title: string
  coverImage: string
  year: number | null
  format: string
}

export interface IAnimeTop10 extends Document {
  entries: IAnimeTop10Entry[]
  userId: Types.ObjectId
}

const animeTop10EntrySchema = new mongoose.Schema<IAnimeTop10Entry>({
  position:   { type: Number, required: true },
  malId:      { type: Number, default: null },
  title:      { type: String, default: '' },
  coverImage: { type: String, default: '' },
  year:       { type: Number, default: null },
  format:     { type: String, default: '' },
}, { _id: false })

const animeTop10Schema = new mongoose.Schema<IAnimeTop10>({
  entries: [animeTop10EntrySchema],
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export default (mongoose.models.AnimeTop10 as Model<IAnimeTop10>) || mongoose.model<IAnimeTop10>('AnimeTop10', animeTop10Schema)