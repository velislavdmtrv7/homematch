const mongoose = require('mongoose');

const savedPropertySchema = new mongoose.Schema({
  // Заменихме owner_id с provider_id, за да съвпада с фронтенда
  provider_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  price: { type: Number, required: true },
  property_type: { type: String, required: true },
  rental_type: { type: String, required: true },
  bedrooms: { type: Number, required: true },
  size_sqm: { type: Number, required: true },
  furnished: { type: String, required: true },
  approx_location: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'active' },

  // Географските данни
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [дължина, ширина]
  },
  privacy_radius: { type: Number, default: 500 },

  // Снимки
  photos: [{
    data: { type: String, required: true },
    is_cover: { type: Boolean, default: false }
  }]
}, { timestamps: true });

// Географски индекс
savedPropertySchema.index({ location: "2dsphere" });

module.exports = mongoose.model('SavedProperty', savedPropertySchema);