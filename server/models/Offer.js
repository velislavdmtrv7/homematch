const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  responder_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  saved_property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedProperty' },
  
  price: { type: Number, required: true },
  property_type: { type: String, enum: ['apartment', 'house', 'either'], required: true },
  rental_type: { type: String, enum: ['short_term', 'long_term', 'flexible'], required: true },
  size_sqm: { type: Number, required: true },
  bedrooms: { type: Number, required: true },
  furnished: { type: String, enum: ['yes', 'no', 'flexible'], required: true },
  description: { type: String, required: true },
  custom_note: { type: String, maxLength: 1000 },
  approx_location: { type: String, required: true }, // Текстово описание (напр. "близо до Метростанция")
  
  // ГЕОГРАФСКИ ДАННИ: Формат GeoJSON за Geospatial Queries
  location: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], // [Longitude, Latitude]
      required: true 
    }
  },

  // БИЗНЕС ЛОГИКА: Параметър за "Privacy Circle"
  // Определя радиуса на замъгляване (в метри), който потребителят вижда преди одобрение
  privacy_radius: { 
    type: Number, 
    default: 500 
  },

  // Снимките се пазят като Base64 данни
  photos: [{
    data: { type: String, required: true }, 
    is_cover: { type: Boolean, default: false }
  }],

  // Статус на контакт (замества contact_requests)
  contact_status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  }
}, { timestamps: true });

// ==========================================
// ИНДЕКСИ (Задължителни за курсовата работа)
// ==========================================

// 1. GEOSPATIAL INDEX: За работа със заявки като $near, $geoWithin и $centerSphere
offerSchema.index({ location: '2dsphere' });

// 2. COMPOUND INDEX: Оптимизира извличането на оферти по конкретна заявка
offerSchema.index({ request_id: 1, createdAt: -1 });

// 3. INDEX: За бързи справки и Aggregation Pipelines за брокера
offerSchema.index({ responder_id: 1, contact_status: 1 });

// 4. INDEX: Връзка между портфолио имот и изпратени оферти
offerSchema.index({ saved_property_id: 1, contact_status: 1 });

module.exports = mongoose.model('Offer', offerSchema);
