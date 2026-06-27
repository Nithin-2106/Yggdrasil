const mongoose = require('mongoose');

const mangaTop10EntrySchema = new mongoose.Schema({
  position:   { type: Number, required: true },
  anilistId:  { type: Number, default: null },
  title:      { type: String, default: '' },
  coverImage: { type: String, default: '' },
  year:       { type: Number, default: null },
  type:       { type: String, default: '' },   // Manga / Manhwa / Manhua
  format:     { type: String, default: '' },   // Series / Special
}, { _id: false });

const mangaTop10Schema = new mongoose.Schema({
  entries: [mangaTop10EntrySchema],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('MangaTop10', mangaTop10Schema);