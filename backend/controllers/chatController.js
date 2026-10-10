// controllers/chatController.js — All chat & message endpoints
// This file handles the logic for everything related to chats: creating chats, sending messages, and translating.

// Models act as blueprints for how our data is saved in MongoDB.
const Chat    = require('../models/Chat');
const Message = require('../models/Message');
const User    = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// â”€â”€ Gemini Translation Helper â”€â”€
const LANGUAGE_LABELS = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
  ja: 'Japanese', zh: 'Chinese', ar: 'Arabic', de: 'German',
  it: 'Italian', pt: 'Portuguese', gu: 'Gujarati', mr: 'Marathi',
  bn: 'Bengali', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam',
  ru: 'Russian', ko: 'Korean', ur: 'Urdu', pa: 'Punjabi'
};
function getLanguageName(code) {
  return LANGUAGE_LABELS[code] || code;
}

// --- Gemini Translation Helper ---
// This function takes a text and a target language code, asks Google's Gemini AI to translate it,
// and returns the translated text.
async function translateText(text, targetLang) {
  if (!text || !text.trim() || !targetLang) return '' // If no text or language provided, return empty string
  try {
    const key = process.env.GEMINI_API_KEY
    if (!key) return '' // If we don't have an API key, we can't translate
    
    // We create a specific prompt asking Gemini to act as a translator
    const prompt = `Translate the following text to ${getLanguageName(targetLang)}. Return ONLY the translated text, nothing else:\n\n${text}`
    
    // We send an HTTP POST request to the Google API endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
      }
    )
    const data = await response.json()
    // We carefully dig into the nested JSON response to extract just the translated text
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
  } catch {
    // If anything fails (like network error), return empty string so the app doesn't crash
    return ''
  }
}

// GET /api/chats/backup
exports.backupChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const chats = await Chat.find({ members: userId })
      .populate('members', 'name identifier profilePic')
      .lean();
    
    const backupData = await Promise.all(chats.map(async (chat) => {
      const messages = await Message.find({ chatId: chat._id })
        .populate('senderId', 'name')
        .sort({ createdAt: 1 })
        .lean();
      return {
        chatId: chat._id,
        isGroup: chat.isGroup,
        chatName: chat.chatName,
        members: chat.members,
        messages: messages.map(m => ({
          sender: m.senderId?.name,
          text: m.originalText,
          time: m.createdAt,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType
        }))
      };
    }));

    res.json(backupData);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate backup' });
  }
};

// GET /api/chats
exports.fetchChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const chats = await Chat.find({ members: userId })
      .populate('members', 'name identifier initials profilePic language onlineStatus lastSeen bio')
      .populate({ path: 'latestMessage', populate: { path: 'senderId', select: 'name initials' } })
      .sort({ updatedAt: -1 });
      
    const chatsWithUnread = await Promise.all(chats.map(async (chat) => {
      let unreadCount = 0;
      if (chat.isGroup) {
        unreadCount = await Message.countDocuments({
          chatId: chat._id,
          senderId: { $ne: userId },
          readBy: { $ne: userId }
        });
      } else {
        unreadCount = await Message.countDocuments({
          chatId: chat._id,
          senderId: { $ne: userId },
          status: { $ne: 'read' },
          deletedForEveryone: { $ne: true }
        });
      }
      return { ...chat.toObject(), unreadCount };
    }));

    return res.status(200).json(chatsWithUnread);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch chats.', error: err.message });
  }
};

// --- LOGIC BLOCK: CREATE CHAT ---
// POST /api/chats
// This function creates a new conversation thread.
// It can handle both 1-on-1 private messages and Group Chats.
// For 1-on-1 chats, it verifies that both users follow each other first.
exports.createChat = async (req, res) => {
  try {
    const { participantIds, isGroup, isBroadcast, chatName } = req.body;
    const members = [...new Set([String(req.user._id), ...participantIds])];

    // For 1-on-1: enforce mutual follow before allowing chat creation
    if (!isGroup && !isBroadcast && members.length === 2) {
      const otherId = participantIds[0];
      const mutualRequest = await FriendRequest.findOne({
        $or: [
          { sender: req.user._id, receiver: otherId, status: 'accepted' },
          { sender: otherId, receiver: req.user._id, status: 'accepted' },
        ]
      });

      if (!mutualRequest) {
        return res.status(403).json({ message: 'You must be mutual followers to start a chat.' });
      }

      // Check if chat already exists
      const existing = await Chat.findOne({
        isGroup: false, isBroadcast: false,
        members: { $all: members, $size: 2 },
      }).populate('members', 'name identifier initials profilePic language onlineStatus');
      if (existing) return res.status(200).json(existing);
    }

    const chat = await Chat.create({ isGroup: !!isGroup, isBroadcast: !!isBroadcast, chatName: chatName || '', members });
    const populated = await chat.populate('members', 'name identifier initials profilePic language onlineStatus');
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create chat.', error: err.message });
  }
};

// GET /api/chats/:chatId/messages
exports.fetchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await Message.find({ chatId, deleted: false })
      .populate('senderId', 'name initials profilePic role')
      .sort({ createdAt: 1 }); // Natural ascending timeline map

    return res.status(200).json(messages);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch messages.', error: err.message });
  }
};

// POST /api/chats/:chatId/messages
// This is the core function where a user sends a new message to a chat.
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params; // We get the chat ID from the URL (e.g., /api/chats/123/messages)
    // We extract the message details from the incoming request body
    const { text, language, mediaUrl, mediaType, metadata } = req.body;

    if (!text && !mediaUrl && !metadata) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    const chat = await Chat.findById(chatId).populate('members', 'language blockedUsers');
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });
    if (!chat.members.map(m => String(m._id)).includes(String(req.user._id))) {
      return res.status(403).json({ message: 'You are not a member of this chat.' });
    }

    if (!chat.isGroup && chat.members.length === 2) {
      const sender = chat.members.find(m => String(m._id) === String(req.user._id));
      const receiver = chat.members.find(m => String(m._id) !== String(req.user._id));
      if (sender && receiver) {
        if (sender.blockedUsers?.map(id => String(id)).includes(String(receiver._id))) {
          return res.status(403).json({ message: 'You have blocked this user. Unblock to send messages.' });
        }
        if (receiver.blockedUsers?.map(id => String(id)).includes(String(sender._id))) {
          return res.status(403).json({ message: 'You have been blocked by this user.' });
        }
      }
    }

    // We figure out what language the sender is using
    const senderLang   = language || req.user.language || 'en'
    
    // We get a unique list of all languages used by the members in this chat
    const allMemberLangs = [...new Set(chat.members.map(m => m.language).filter(Boolean))]
    
    // We only need to translate the message into languages that are DIFFERENT from the sender's language
    const targetLangs = allMemberLangs.filter(l => l !== senderLang)

    // We create a dictionary to hold all the translations (e.g., { "es": "Hola", "fr": "Bonjour" })
    const translations = {}
    if (text && targetLangs.length > 0) {
      // Promise.all lets us translate to multiple languages simultaneously instead of waiting one by one!
      await Promise.all(targetLangs.map(async (lang) => {
        const trans = await translateText(text, lang)
        if (trans) translations[lang] = trans
      }))
    }
    // Always store the original text under its own language key for consistency
    if (text) translations[senderLang] = text

    // Figure out if this is a text, image, or other media type
    const finalMediaType = mediaType || (mediaUrl ? 'image' : 'text');

    // Step 1: Save the new message to the MongoDB database
    const message = await Message.create({
      chatId,
      senderId: req.user._id, // the ID of the person sending the message
      originalText: text || '',
      translatedText: targetLangs.length > 0 && translations[targetLangs[0]] ? translations[targetLangs[0]] : '', // fallback for 1st receiver
      translations,
      language: senderLang,
      mediaUrl:  mediaUrl  || '',
      mediaType: finalMediaType,
      metadata:  metadata  || {},
    });

    // Step 2: Update the Chat document to remember that this is the latest message
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

    // Step 3: Populate replaces the 'senderId' with the actual User profile details (name, profile pic, etc.)
    const populated = await message.populate('senderId', 'name initials profilePic language role');
    
    // Send the final saved message back to the frontend
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send message.', error: err.message });
  }
};


// POST /api/chats/:chatId/messages/audio
exports.sendAudioMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required.' });
    }

    const { text, replyTo } = req.body;
    
    const chat = await Chat.findById(chatId).populate('members', 'language');
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });
    if (!chat.members.map(m => String(m._id)).includes(String(req.user._id))) {
      return res.status(403).json({ message: 'You are not a member of this chat.' });
    }

    const senderLang   = req.user.language || 'en';
    const targetLangs  = [...new Set(chat.members
      .map(m => m.language)
      .filter(l => l && l !== senderLang)
    )];

    const filePath = req.file.path;
    const mediaUrl = `/uploads/audio/${req.file.filename}`;

    const metadata = { fileName: req.file.originalname, fileSize: req.file.size };
    if (replyTo) {
      try { metadata.replyTo = JSON.parse(replyTo); } catch(e) {}
    }

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      originalText: text || '',
      translatedText: '', // Legacy fallback
      translations: {},
      language: senderLang,
      mediaUrl: mediaUrl,
      mediaType: 'audio',
      metadata: metadata,
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

    const populated = await message.populate('senderId', 'name initials profilePic language role');
    return res.status(201).json(populated);
  } catch (err) {
    console.error('[sendAudioMessage Error]', err);
    return res.status(500).json({ message: 'Failed to send audio message.', error: err.message });
  }
};

// POST /api/chats/:chatId/messages/file
exports.sendFileMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'File is required.' });
    }

    const { text, replyTo } = req.body;

    const chat = await Chat.findById(chatId).populate('members', 'language');
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });
    if (!chat.members.map(m => String(m._id)).includes(String(req.user._id))) {
      return res.status(403).json({ message: 'You are not a member of this chat.' });
    }

    const senderLang   = req.user.language || 'en';
    const targetLangs  = [...new Set(chat.members
      .map(m => m.language)
      .filter(l => l && l !== senderLang)
    )];

    let dest = 'documents';
    let mediaType = 'document';
    const mime = req.file.mimetype || '';
    const name = req.file.originalname || '';
    if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(name)) { dest = 'audio'; mediaType = 'audio'; }
    else if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) { dest = 'images'; mediaType = 'image'; }
    else if (mime.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(name)) { dest = 'videos'; mediaType = 'video'; }

    const mediaUrl = `/uploads/${dest}/${req.file.filename}`;

    const metadata = { fileName: req.file.originalname, fileSize: req.file.size };
    if (replyTo) {
      try { metadata.replyTo = JSON.parse(replyTo); } catch(e) {}
    }

    const translations = {};
    if (text && targetLangs.length > 0) {
      await Promise.all(targetLangs.map(async (lang) => {
        const trans = await translateText(text, lang);
        if (trans) translations[lang] = trans;
      }));
    }

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      originalText: text || '',
      translatedText: targetLangs.length > 0 && translations[targetLangs[0]] ? translations[targetLangs[0]] : '',
      translations,
      language: senderLang,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      metadata: metadata,
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

    const populated = await message.populate('senderId', 'name initials profilePic language role');
    return res.status(201).json(populated);
  } catch (err) {
    console.error('[sendFileMessage Error]', err);
    return res.status(500).json({ message: 'Failed to send file message.', error: err.message });
  }
};

// POST /api/messages/:messageId/vote
exports.votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });
    if (msg.mediaType !== 'poll') return res.status(400).json({ message: 'Not a poll message.' });

    // metadata format: { question: '...', options: [{ text: 'A', votes: ['userId'] }], allowMultiple: boolean }
    const metadata = { ...msg.metadata };
    if (!metadata.options || !metadata.options[optionIndex]) {
      return res.status(400).json({ message: 'Invalid option.' });
    }

    const userIdStr = String(req.user._id);
    const allowMultiple = metadata.allowMultiple !== false;

    // If single choice, remove the user's vote from ALL other options first
    if (!allowMultiple) {
      metadata.options.forEach((opt, idx) => {
        if (idx !== optionIndex && opt.votes) {
          opt.votes = opt.votes.filter(id => id !== userIdStr);
        }
      });
    }

    let votes = metadata.options[optionIndex].votes || [];

    // Toggle vote on the selected option
    if (votes.includes(userIdStr)) {
      votes = votes.filter(id => id !== userIdStr);
    } else {
      votes.push(userIdStr);
    }

    metadata.options[optionIndex].votes = votes;
    
    // We mark the mixed field as modified for Mongoose to save it properly
    msg.metadata = metadata;
    msg.markModified('metadata');
    
    await msg.save();
    
    // Return the updated metadata
    return res.status(200).json(msg);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to vote on poll.', error: err.message });
  }
};

// PATCH /api/chats/:chatId/messages/read
exports.markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    await Message.updateMany(
      { chatId, senderId: { $ne: req.user._id } },
      { 
        $set: { status: 'read' },
        $addToSet: { readBy: req.user._id }
      }
    );
    return res.status(200).json({ message: 'Messages marked as read.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to mark as read.', error: err.message });
  }
};

// PATCH /api/messages/:messageId
exports.editMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const msg = await Message.findOne({ _id: req.params.messageId, senderId: req.user._id });
    if (!msg) return res.status(404).json({ message: 'Message not found or not yours.' });

    msg.originalText = text;
    msg.edited = true;
    await msg.save();
    return res.status(200).json(msg);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to edit message.', error: err.message });
  }
};



// POST /api/messages/:messageId/reaction
exports.addReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });

    // Toggle: remove if same emoji from same user, otherwise add/replace
    const existing = msg.reactions.findIndex(r => String(r.userId) === String(req.user._id));
    if (existing >= 0) {
      if (msg.reactions[existing].emoji === emoji) {
        msg.reactions.splice(existing, 1); // Remove reaction
      } else {
        msg.reactions[existing].emoji = emoji; // Change emoji
      }
    } else {
      msg.reactions.push({ userId: req.user._id, emoji });
    }
    await msg.save();
    return res.status(200).json(msg.reactions);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to add reaction.', error: err.message });
  }
};

// POST /api/messages/:messageId/star
exports.toggleStarMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = await User.findById(req.user._id);
    
    const index = user.starredMessages.indexOf(messageId);
    if (index > -1) {
      user.starredMessages.splice(index, 1);
    } else {
      user.starredMessages.push(messageId);
    }
    
    await user.save();
    return res.status(200).json({ starredMessages: user.starredMessages });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to toggle star.', error: err.message });
  }
};

// POST /api/messages/:messageId/pin
exports.togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });

    // Toggle pinned status in metadata
    const metadata = { ...(msg.metadata || {}) };
    metadata.pinned = !metadata.pinned;
    msg.metadata = metadata;
    
    await msg.save();
    const populated = await msg.populate('senderId', 'name initials profilePic language role');
    return res.status(200).json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to toggle pin.', error: err.message });
  }
};


// DELETE /api/chats/messages/:messageId
exports.deleteMessage = async (req, res) => {
  try {
    const { type } = req.body; // 'for_me' or 'for_everyone'
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });

    if (type === 'for_everyone') {
      // Only sender can delete for everyone
      if (String(msg.senderId) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Unauthorized to delete this message for everyone.' });
      }
      msg.deleted = true;
      msg.deletedForEveryone = true;
    } else {
      // Default to delete for me
      if (!msg.deletedBy) msg.deletedBy = [];
      if (!msg.deletedBy.includes(req.user._id)) {
        msg.deletedBy.push(req.user._id);
      }
    }

    await msg.save();
    return res.status(200).json(msg);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete message.', error: err.message });
  }
};

// POST /api/chats/:chatId/archive
exports.archiveChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    if (!chat.archivedBy) chat.archivedBy = [];
    
    const userIdStr = String(req.user._id);
    const index = chat.archivedBy.findIndex(id => String(id) === userIdStr);
    
    if (index > -1) {
      chat.archivedBy.splice(index, 1); // Unarchive
    } else {
      chat.archivedBy.push(req.user._id); // Archive
    }

    await chat.save();
    return res.status(200).json(chat);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to archive chat.', error: err.message });
  }
};

// POST /api/chats/:chatId/pin
exports.togglePinChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    if (!chat.pinnedBy) chat.pinnedBy = [];
    
    const userIdStr = String(req.user._id);
    const index = chat.pinnedBy.findIndex(id => String(id) === userIdStr);
    
    if (index > -1) {
      chat.pinnedBy.splice(index, 1); // Unpin
    } else {
      chat.pinnedBy.push(req.user._id); // Pin
    }

    await chat.save();
    return res.status(200).json(chat);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to pin chat.', error: err.message });
  }
};

// --- Context Menu Additions ---

// POST /api/chats/:chatId/mute
exports.toggleMuteChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    if (!chat.mutedBy) chat.mutedBy = [];
    
    const userIdStr = String(req.user._id);
    const index = chat.mutedBy.findIndex(id => String(id) === userIdStr);
    
    if (index > -1) {
      chat.mutedBy.splice(index, 1); // Unmute
    } else {
      chat.mutedBy.push(req.user._id); // Mute
    }

    await chat.save();
    return res.status(200).json(chat);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to mute chat.', error: err.message });
  }
};

// POST /api/chats/:chatId/unread
exports.toggleUnreadChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    if (!chat.unreadBy) chat.unreadBy = [];
    
    const userIdStr = String(req.user._id);
    const index = chat.unreadBy.findIndex(id => String(id) === userIdStr);
    
    if (index > -1) {
      chat.unreadBy.splice(index, 1); // Mark as read
    } else {
      chat.unreadBy.push(req.user._id); // Mark as unread
    }

    await chat.save();
    return res.status(200).json(chat);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to toggle unread status.', error: err.message });
  }
};

// POST /api/chats/:chatId/favourite
exports.toggleFavouriteChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    if (!chat.favouritedBy) chat.favouritedBy = [];
    
    const userIdStr = String(req.user._id);
    const index = chat.favouritedBy.findIndex(id => String(id) === userIdStr);
    
    if (index > -1) {
      chat.favouritedBy.splice(index, 1); // Unfavourite
    } else {
      chat.favouritedBy.push(req.user._id); // Favourite
    }

    await chat.save();
    return res.status(200).json(chat);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to favourite chat.', error: err.message });
  }
};

// POST /api/chats/:chatId/list
exports.toggleListChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    if (!chat.listedBy) chat.listedBy = [];
    
    const userIdStr = String(req.user._id);
    const index = chat.listedBy.findIndex(id => String(id) === userIdStr);
    
    if (index > -1) {
      chat.listedBy.splice(index, 1);
    } else {
      chat.listedBy.push(req.user._id);
    }

    await chat.save();
    return res.status(200).json(chat);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list chat.', error: err.message });
  }
};

// POST /api/chats/:chatId/clear
exports.clearChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    await Message.updateMany(
      { chatId, deletedBy: { $ne: req.user._id } },
      { $push: { deletedBy: req.user._id } }
    );
    return res.status(200).json({ message: 'Chat cleared successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to clear chat.', error: err.message });
  }
};

// POST /api/chats/:chatId/exit
exports.exitGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });
    if (!chat.isGroup) return res.status(400).json({ message: 'Not a group chat.' });
    const userIdStr = String(req.user._id);
    chat.members = chat.members.filter(id => String(id) !== userIdStr);
    await chat.save();
    return res.status(200).json({ message: 'Exited group successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to exit group.', error: err.message });
  }
};

// POST /api/messages/:messageId/report
exports.reportMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason is required to report.' });
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });
    msg.isReported = true;
    if (!msg.reports) msg.reports = [];
    const existingIndex = msg.reports.findIndex(r => String(r.reportedBy) === String(req.user._id));
    if (existingIndex > -1) {
      msg.reports[existingIndex].reason = reason;
      msg.reports[existingIndex].timestamp = new Date();
    } else {
      msg.reports.push({ reportedBy: req.user._id, reason, timestamp: new Date() });
    }
    await msg.save();
    return res.status(200).json({ message: 'Message reported successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to report message.', error: err.message });
  }
};

// POST /api/chats/messages/:messageId/event-rsvp
exports.eventRsvp = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { choice } = req.body;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });
    if (msg.mediaType !== 'event') return res.status(400).json({ message: 'Not an event message.' });
    const metadata = { ...(msg.metadata || {}) };
    if (!metadata.rsvp) metadata.rsvp = {};
    const userIdStr = String(req.user._id);
    if (!choice) {
      delete metadata.rsvp[userIdStr];
    } else {
      metadata.rsvp[userIdStr] = choice;
    }
    msg.metadata = metadata;
    msg.markModified('metadata');
    await msg.save();
    const populated = await msg.populate('senderId', 'name initials profilePic language role');
    // Broadcast to all members of the chat room
    const io = req.app.get('io');
    if (io) {
      io.to(String(msg.chatId)).emit('message_updated', populated);
    }
    return res.status(200).json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to save RSVP.', error: err.message });
  }
};