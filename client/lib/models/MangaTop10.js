import mongoose from 'mongoose'

const mangaTop10EntrySchema = new mongoose.Schema({
  position:   { type: Number, required: true },
  anilistId:  { type: Number, default: null },
  title:      { type: String, default: '' },
  coverImage: { type: String, default: '' },
  year:       { type: Number, default: null },
  type:       { type: String, default: '' },
  format:     { type: String, default: '' },
}, { _id: false })

const mangaTop10Schema = new mongoose.Schema({
  entries: [mangaTop10EntrySchema],
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export default mongoose.models.MangaTop10 || mongoose.model('MangaTop10', mangaTop10Schema)