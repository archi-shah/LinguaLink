const express        = require('express');
const router         = express.Router();
const chatController = require('../controllers/chatController');
const { protect }    = require('../middleware/authMiddleware');

// All chat routes require authentication
router.use(protect);

// Chats
router.get('/backup', chatController.backupChats);
router.get('/',    chatController.fetchChats);
router.post('/',   chatController.createChat);
router.post('/:chatId/archive',   chatController.archiveChat);
router.post('/:chatId/pin',       chatController.togglePinChat);
router.post('/:chatId/mute',      chatController.toggleMuteChat);
router.post('/:chatId/unread',    chatController.toggleUnreadChat);
router.post('/:chatId/favourite', chatController.toggleFavouriteChat);
router.post('/:chatId/list',      chatController.toggleListChat);
router.post('/:chatId/clear',     chatController.clearChatHistory);
router.post('/:chatId/exit',      chatController.exitGroup);


const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest = 'documents';
    const mime = file.mimetype || '';
    const name = file.originalname || '';
    if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(name)) dest = 'audio';
    else if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) dest = 'images';
    else if (mime.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(name)) dest = 'videos';
    const dir = path.join(__dirname, `../uploads/${dest}/`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Include the original extension unless it's a legacy audio without one
    const ext = path.extname(file.originalname) || '';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Pre-create all upload subdirectories to avoid ENOENT errors
['audio', 'images', 'videos', 'documents'].forEach(sub => {
  fs.mkdirSync(path.join(__dirname, `../uploads/${sub}/`), { recursive: true });
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

// Messages within a chat
router.get('/:chatId/messages',        chatController.fetchMessages);
router.post('/:chatId/messages',       chatController.sendMessage);
router.post('/:chatId/messages/audio', upload.single('audio'), chatController.sendAudioMessage);
router.post('/:chatId/messages/file',  upload.single('file'), chatController.sendFileMessage);
router.patch('/:chatId/messages/read', chatController.markAsRead);

// Multer error handler — must be defined AFTER upload routes
router.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large. Maximum size is 50MB.' });
  }
  if (err && err.code && err.code.startsWith('LIMIT_')) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  next(err);
});

// Individual message actions (note: /messages/* prefix set in server.js)
router.patch('/messages/:messageId',           chatController.editMessage);
router.delete('/messages/:messageId',          chatController.deleteMessage);
router.post('/messages/:messageId/reaction',   chatController.addReaction);
router.post('/messages/:messageId/star',       chatController.toggleStarMessage);
router.post('/messages/:messageId/pin',        chatController.togglePinMessage);
router.post('/messages/:messageId/vote',       chatController.votePoll);
router.post('/messages/:messageId/report',     chatController.reportMessage);
router.post('/messages/:messageId/event-rsvp', chatController.eventRsvp);

module.exports = router;
