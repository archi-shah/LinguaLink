const mongoose = require('mongoose');

// --- DATABASE SCHEMA: USER ---
// A Schema is like a blueprint or a template for our database. 
// It tells MongoDB exactly what information every User must have (like name and password)
// and what data types those fields should be (String, Boolean, etc.).
const userSchema = new mongoose.Schema({
  // Core identity - The most important information about a user
  name:       { type: String, required: true, trim: true },
  identifier: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:   { type: String, required: true },
  initials:   { type: String },

  // Profile
  profilePic: { type: String, default: '' },
  bio:        { type: String, default: '', maxlength: 200 },
  language:   { type: String, default: 'en' },

  // Roles & Moderation
  role:       { type: String, enum: ['user', 'admin'], default: 'user' },
  isBanned:   { type: Boolean, default: false },

  // Preferences
  preferences: {
    darkMode:      { type: Boolean, default: false },
    autoTranslate: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true },
    readReceipts:  { type: Boolean, default: true },
  },

  // Contacts & Social
  contacts:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  starredMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],

  // Online presence
  onlineStatus: { type: String, enum: ['online', 'away', 'offline'], default: 'offline' },
  lastSeen:     { type: Date, default: Date.now },

  // OTP verification
  otp:        { type: String },
  otpExpiry:  { type: Date },
  isVerified: { type: Boolean, default: false },

  // Two-Factor Authentication
  twoFactorSecret: { type: String },
  isTwoFactorEnabled: { type: Boolean, default: false },


}, { timestamps: true });

// Index for fast search - explicitly disable language override to avoid errors with 'language' field
userSchema.index({ name: 'text', identifier: 'text' }, { 
  default_language: 'none', 
  language_override: 'dummy' 
});

module.exports = mongoose.model('User', userSchema);
