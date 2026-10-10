const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 chars
const IV_LENGTH = 16;

function encryptText(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) { return text; }
}

function decryptText(text) {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text; // likely not encrypted
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) { return text; }
}

// Helper for the Mixed translations object
function encryptTranslations(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj = {};
  for (const key in obj) {
    newObj[key] = encryptText(obj[key]);
  }
  return newObj;
}

function decryptTranslations(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj = {};
  for (const key in obj) {
    newObj[key] = decryptText(obj[key]);
  }
  return newObj;
}

const messageSchema = new mongoose.Schema({
  chatId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Content (Encrypted at Rest)
  originalText:  { type: String, default: '', set: encryptText, get: decryptText },
  translatedText: { type: String, default: '', set: encryptText, get: decryptText },
  translations:  { type: mongoose.Schema.Types.Mixed, default: {}, set: encryptTranslations, get: decryptTranslations },
  language:      { type: String, default: 'en' },
  mediaUrl:      { type: String, default: '' },
  mediaType:     { type: String, enum: ['text', 'image', 'audio', 'video', 'document', 'file', 'poll', 'event', 'location', 'contact', 'sticker', 'task'], default: 'text' },
  metadata:      { type: mongoose.Schema.Types.Mixed, default: {} },

  // Status
  status:  { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  readBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Group read tracking
  deleted: { type: Boolean, default: false },
  deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  edited:  { type: Boolean, default: false },

  // Reactions — array of { userId, emoji }
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji:  { type: String },
  }],

  // Reporting / Moderation
  isReported: { type: Boolean, default: false },
  reports: [{
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],

}, { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } });

module.exports = mongoose.model('Message', messageSchema);
