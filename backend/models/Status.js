const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content:   { type: String, default: '' },
  mediaUrl:  { type: String, default: '' },
  mediaType: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
  backgroundColor: { type: String, default: '#7C3AED' },
  viewers:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
}, { timestamps: true });

// Auto-delete expired statuses
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Status', statusSchema);
