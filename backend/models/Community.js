// models/Community.js — MongoDB schema for Communities

const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  chatId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }, // real group chat
  isAnnouncement: { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now },
});

const communitySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category:    { type: String, default: 'General' },
  color:       { type: String, default: '#4C74F9' },
  emoji:       { type: String, default: '🌐' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  channels:    [channelSchema],
  isPublic:    { type: Boolean, default: true },
}, { timestamps: true });

// Virtual: member count
communitySchema.virtual('memberCount').get(function () {
  return this.members.length;
});

module.exports = mongoose.model('Community', communitySchema);
