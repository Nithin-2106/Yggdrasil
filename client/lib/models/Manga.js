import mongoose from 'mongoose'

const platformSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url:  { type: String, default: '' }
}, { _id: false })

const mangaSchema = new mongoose.Schema({
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

export default mongoose.models.Manga || mongoose.model('Manga', mangaSchema)