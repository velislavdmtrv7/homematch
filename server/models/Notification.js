const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['new_response', 'contact_approved', 'offer_rejected', 'new_review', 'review_updated'], 
    required: true 
  },
  read: { type: Boolean, default: false },
  metadata: {
    response_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);