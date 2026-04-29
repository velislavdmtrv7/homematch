const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }, // unique: true автоматично прави индекс
  password: { type: String, required: true },
  full_name: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['seeker', 'broker', 'owner'], required: true },
  provider_type: { type: String, enum: ['agency', 'freelance', 'broker', 'owner', null], default: null },
  blocked: { type: Boolean, default: false }
}, { timestamps: true });

// Премахнахме дублиращия се ред userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
