const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  aiTranslation: {
    enabled: { type: Boolean, default: true },
    defaultEngine: { type: String, default: 'gemini' },
    autoTranslateDefault: { type: Boolean, default: true },
    maxCharPerRequest: { type: Number, default: 5000 }
  },
  chat: {
    maxFileUploadMB: { type: Number, default: 10 },
    messagePaginationLimit: { type: Number, default: 50 },
    allowVoiceMessages: { type: Boolean, default: true },
    allowVideoMessages: { type: Boolean, default: true },
    allowStatusUpdates: { type: Boolean, default: true }
  },
  security: {
    requireEmailVerification: { type: Boolean, default: true },
    maxLoginAttempts: { type: Number, default: 5 },
    sessionTimeoutHours: { type: Number, default: 72 }
  },
  notifications: {
    enablePushNotifications: { type: Boolean, default: false },
    emailDigestEnabled: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
