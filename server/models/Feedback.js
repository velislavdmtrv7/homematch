const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['bug', 'idea', 'confusing', 'other'],
    default: 'other',
  },
  message: { type: String, required: true, maxlength: 2000 },
  page: { type: String, maxlength: 200 },
  user_agent: { type: String, maxlength: 300 },
}, { timestamps: true });

feedbackSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
