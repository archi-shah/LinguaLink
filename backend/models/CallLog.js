const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  caller:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: ['audio', 'video'], default: 'audio' },
  status:   { type: String, enum: ['answered', 'missed', 'rejected'], default: 'missed' },
  duration: { type: Number, default: 0 }, // seconds
  startedAt:  { type: Date, default: Date.now },
  endedAt:    { type: Date },
}, { timestamps: true });

callLogSchema.index({ caller: 1, createdAt: -1 });
callLogSchema.index({ receiver: 1, createdAt: -1 });

module.exports = mongoose.model('CallLog', callLogSchema);
