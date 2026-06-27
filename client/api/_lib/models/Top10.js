import mongoose from 'mongoose'

const top10EntrySchema = new mongoose.Schema({
  position:   { type: Number, required: true }, 
  tmdbId:     { type: Number, default: null },
  title:      { type: String, default: '' },
  coverImage: { type: String, default: '' },
  year:       { type: Number, default: null },
  type:       { type: String, default: '' },
}, { _id: false })

const top10Schema = new mongoose.Schema({
  region:  { type: String, enum: ['Korean', 'Chinese', 'Japanese'], required: true },
  entries: [top10EntrySchema],
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

top10Schema.index({ userId: 1, region: 1 }, { unique: true })

export default mongoose.models.Top10 || mongoose.model('Top10', top10Schema)