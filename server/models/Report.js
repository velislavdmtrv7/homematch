const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reported_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reported_response_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  reported_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
  reason: { type: String, required: true, maxLength: 1000 }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);