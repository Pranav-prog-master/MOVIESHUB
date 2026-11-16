const mongoose = require('mongoose');

// A single authorized source (streaming / rental / purchase / download).
// XP Movies ONLY stores links to legal, official providers.
const sourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['Streaming', 'Rental', 'Purchase', 'Download'],
      default: 'Streaming'
    },
    url: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['Movie', 'Series'], default: 'Movie', index: true },
    category: { type: String, enum: ['Hollywood', 'Bollywood', 'South', 'Anime', 'Cartoon'], default: 'Hollywood', index: true },
    poster: { type: String, default: '' },
    screenshots: { type: [String], default: [] },
    backdrop: { type: String, default: '' },
    releaseYear: { type: Number },
    releaseDate: { type: Date },
    runtime: { type: Number, min: 0 },
    genres: [{ type: String, trim: true }],
    rating: { type: Number, min: 0, max: 10, default: 0 },
    cast: [{ type: String, trim: true }],
    director: { type: String, default: '' },
    trailerUrl: { type: String, default: '' },
    watchUrl: { type: String, default: '' },
    downloadUrl: { type: String, default: '' },
    episodes: { type: [{ label: { type: String, trim: true }, url: { type: String, trim: true } }], default: [] },
    sources: { type: [sourceSchema], default: [] },
    status: { type: String, enum: ['published', 'draft'], default: 'published' },
    popularity: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
);

movieSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Text index enables searching by title / description / cast / director.
movieSchema.index({ title: 'text', description: 'text', cast: 'text', director: 'text' });

module.exports = mongoose.model('Movie', movieSchema);
