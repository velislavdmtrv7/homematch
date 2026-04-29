const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  seeker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  city: { type: String, required: true },
  property_type: { type: String, enum: ['apartment', 'house', 'either'], required: true },
  rental_type: { type: String, enum: ['short_term', 'long_term', 'flexible'], required: true },
  budget: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  specs: {
    bedrooms: { type: Number, required: true },
    min_area_sqm: { type: Number },
    furnished: { type: String, enum: ['yes', 'no', 'flexible'] },
    pets: { type: String, enum: ['yes', 'no', 'flexible'] }
  },
  neighborhoods: [{ type: String }],
  move_in_date: { type: Date },
  location_preferences: { type: String, maxLength: 300 },
  notes: { type: String, maxLength: 1000 },
  allow_brokers: { type: String, enum: ['yes', 'owners_only', 'both'], default: 'both' },
  description: { type: String, required: true },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  expires_at: { type: Date, required: true }
}, { timestamps: true });

// ИНДЕКСИ:
// 1. COMPOUND INDEX: Оптимизира BrowseRequests. Когато брокер филтрира по град и тип едновременно.
requestSchema.index({ city: 1, property_type: 1 });

// 2. TEXT INDEX: За пълнотекстово търсене в описанието и града (ключово изискване)
requestSchema.index({ description: 'text', city: 'text' });

// 3. INDEX за сортиране и филтриране на активни/изтекли заявки
requestSchema.index({ expires_at: 1, status: 1 });

module.exports = mongoose.model('Request', requestSchema);
