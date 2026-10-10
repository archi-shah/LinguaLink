const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['friend_request', 'follow_accept', 'new_message', 'missed_call', 'report'], required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  referenceId: { type: mongoose.Schema.Types.ObjectId }, // e.g., userId or chatId
  actionDone: { type: String, enum: ['accepted', 'rejected', null], default: null },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
