const mongoose = require('mongoose');

// --- DATABASE SCHEMA: CHAT ---
// This file acts as the blueprint for both 1-on-1 private messages AND Group Chats.
// Instead of having two separate tables/collections in our database for groups and 1-on-1s, 
// we store them all here and use the 'isGroup' boolean (true/false) to tell them apart.
const chatSchema = new mongoose.Schema({
  // Is this a 1-on-1 direct message or a group chat? (Can be used to conditionally render group avatars)
  isGroup: { type: Boolean, default: false },
  
  // Is this a broadcast list? (Messages sent here are delivered as 1-on-1s)
  isBroadcast: { type: Boolean, default: false },

  // Name of the group (if it is a group). Otherwise left entirely blank for 1-on-1s.
  chatName: { type: String },

  // Array of Users participating in this chat thread
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Array of Users who are admins of this group chat
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // The latest message sent in the thread, allowing the sidebar to show preview text quickly!
  latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },

  // Array of Users who have archived this chat
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Array of Users who have pinned this chat
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Array of Users who have muted notifications for this chat
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Array of Users who have manually marked this chat as unread
  unreadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Array of Users who have favourited this chat
  favouritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Array of Users who have added this chat to a list
  listedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Chat', chatSchema);
