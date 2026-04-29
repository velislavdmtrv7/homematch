const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  response_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, maxLength: 500 }
}, { timestamps: true });

// UNIQUE COMPOUND INDEX: Гарантира, че един потребител гласува само веднъж за конкретна оферта
reviewSchema.index({ reviewer_id: 1, provider_id: 1, response_id: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);