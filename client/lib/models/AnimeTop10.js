import mongoose from 'mongoose'

const animeTop10EntrySchema = new mongoose.Schema({
  position:   { type: Number, required: true },
  malId:      { type: Number, default: null },
  title:      { type: String, default: '' },
  coverImage: { type: String, default: '' },
  year:       { type: Number, default: null },
  format:     { type: String, default: '' },
}, { _id: false })

const animeTop10Schema = new mongoose.Schema({
  entries: [animeTop10EntrySchema],
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export default mongoose.models.AnimeTop10 || mongoose.model('AnimeTop10', animeTop10Schema)