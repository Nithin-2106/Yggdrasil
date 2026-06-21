const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url:  { type: String, default: '' }
}, { _id: false });

const animeSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  malId:        { type: Number, default: null },
  coverImage:   { type: String, default: '' },
  status:       { type: String, enum: ['Watching', 'Completed', 'Dropped', 'Plan to Watch', 'On Hold'], required: true },
  format:       { type: String, enum: ['Series', 'Movie', 'Special', 'OVA'], required: true },
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
  customTags:   [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Anime', animeSchema);