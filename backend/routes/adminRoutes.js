const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const Community = require('../models/Community');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');
const { onlineUsers } = require('../socket/socketHandler');

// ─────────────────────────────────────────────────────────────
// OVERVIEW STATS
// ─────────────────────────────────────────────────────────────
router.get('/stats', protect, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = onlineUsers.size; // Real-time count from active sockets
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const totalMessages = await Message.countDocuments();
    const totalCommunities = await Community.countDocuments();
    const totalChats = await Chat.countDocuments();

    // Messages per day for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const messagesLast7Days = await Message.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // User signups last 7 days
    const signupsLast7Days = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Language distribution
    const languageDist = await User.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // Recent signups
    const recentSignups = await User.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select('name identifier createdAt profilePic onlineStatus isVerified language role isBanned');

    res.json({
      totalUsers,
      activeUsers,
      bannedUsers,
      verifiedUsers,
      totalMessages,
      totalCommunities,
      totalChats,
      messagesLast7Days,
      signupsLast7Days,
      languageDist,
      recentSignups
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics.' });
  }
});

// ─────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────
router.get('/users', protect, isAdmin, async (req, res) => {
  try {
    const { search, status, role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { identifier: { $regex: search, $options: 'i' } }
      ];
    }
    if (status === 'banned') query.isBanned = true;
    if (status === 'online') query.onlineStatus = 'online';
    if (status === 'verified') query.isVerified = true;
    if (role) query.role = role;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('name identifier role isBanned onlineStatus createdAt lastSeen profilePic isVerified language preferences');

    const total = await User.countDocuments(query);
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// Get single user profile (basic)
router.get('/users/:id', protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp -otpExpiry');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PER-USER FULL PROFILE (for admin user detail drawer)
// ─────────────────────────────────────────────────────────────
router.get('/users/:id/profile', protect, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const mongoose = require('mongoose');
    const objectId = new mongoose.Types.ObjectId(userId);

    // 1. Full user document
    const user = await User.findById(userId).select('-password -otp -otpExpiry');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 2. Total messages sent
    const totalMessages = await Message.countDocuments({ senderId: objectId });

    // 3. Messages sent today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const messagesToday = await Message.countDocuments({
      senderId: objectId,
      createdAt: { $gte: startOfDay }
    });

    // 4. Messages per day for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const messagesLast7Days = await Message.aggregate([
      { $match: { senderId: objectId, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 5. All chats user is part of (with member info)
    const userChats = await Chat.find({ members: objectId })
      .populate('members', 'name identifier profilePic onlineStatus language')
      .populate({ path: 'latestMessage', select: 'originalText createdAt mediaType' })
      .sort({ updatedAt: -1 })
      .limit(30);

    // For each chat, count total messages
    const chatIds = userChats.map(c => c._id);
    const msgCountPerChat = await Message.aggregate([
      { $match: { chatId: { $in: chatIds } } },
      { $group: { _id: '$chatId', count: { $sum: 1 } } }
    ]);
    const msgCountMap = {};
    msgCountPerChat.forEach(r => { msgCountMap[String(r._id)] = r.count; });

    const chatsFormatted = userChats.map(chat => ({
      _id: chat._id,
      isGroup: chat.isGroup,
      chatName: chat.chatName,
      members: chat.members.map(m => ({
        _id: m._id,
        name: m.name,
        identifier: m.identifier,
        profilePic: m.profilePic,
        onlineStatus: m.onlineStatus,
      })),
      latestMessage: chat.latestMessage ? {
        text: chat.latestMessage.originalText,
        createdAt: chat.latestMessage.createdAt,
        mediaType: chat.latestMessage.mediaType,
      } : null,
      messageCount: msgCountMap[String(chat._id)] || 0,
      updatedAt: chat.updatedAt,
    }));

    // 5. Recent 20 messages sent by user
    const recentMessages = await Message.find({ senderId: objectId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('chatId', 'chatName isGroup members')
      .select('originalText mediaType createdAt chatId status isReported');

    const recentFormatted = recentMessages.map(msg => ({
      _id: msg._id,
      text: msg.isReported ? msg.originalText : "🔒 Encrypted Message",
      mediaType: msg.mediaType,
      createdAt: msg.createdAt,
      status: msg.status,
      chat: msg.chatId ? {
        _id: msg.chatId._id,
        isGroup: msg.chatId.isGroup,
        chatName: msg.chatId.chatName,
        memberCount: msg.chatId.members?.length || 0,
      } : null,
    }));

    res.json({
      user,
      stats: {
        totalMessages,
        messagesToday,
        totalChats: userChats.length,
        messagesLast7Days,
      },
      chats: chatsFormatted,
      recentMessages: recentFormatted,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile.' });
  }
});

// Toggle Ban / Block
router.put('/users/:id/ban', protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot block another admin' });
    user.isBanned = !user.isBanned;
    await user.save();
    
    // Emit socket event to the blocked user's personal room so they get notified instantly
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${user._id}`).emit('admin_action', {
        type: user.isBanned ? 'blocked' : 'unblocked',
        message: user.isBanned
          ? 'Your account has been blocked by an administrator. You have been signed out.'
          : 'Your account has been reinstated by an administrator. You may now sign in.',
      });
    }
    
    res.json({ message: `User ${user.isBanned ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user status.' });
  }
});

// Change user role (promote/demote admin)
router.put('/users/:id/role', protect, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User role updated to ${role}`, user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update role.' });
  }
});

// Edit user profile (by admin)
router.put('/users/:id', protect, isAdmin, async (req, res) => {
  try {
    const { name, language, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...(name && { name }), ...(language && { language }), ...(bio !== undefined && { bio }) },
      { new: true }
    ).select('-password -otp -otpExpiry');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user.' });
  }
});

// Delete User
router.delete('/users/:id', protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete another admin' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user.' });
  }
});

// ─────────────────────────────────────────────────────────────
// CHAT LOGS
// ─────────────────────────────────────────────────────────────
router.get('/chatlogs', protect, isAdmin, async (req, res) => {
  try {
    const { search, mediaType, page = 1, limit = 30 } = req.query;
    const query = { isReported: true };
    if (search) query.$or = [
      { originalText: { $regex: search, $options: 'i' } },
      { text: { $regex: search, $options: 'i' } }
    ];
    if (mediaType && mediaType !== 'all') query.mediaType = mediaType;

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('senderId', 'name identifier profilePic')
      .populate('chatId', 'isGroup chatName')
      .populate('reports.reportedBy', 'name identifier');

    const total = await Message.countDocuments(query);
    res.json({ messages, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching chat logs:', error);
    res.status(500).json({ message: 'Failed to fetch chat logs.' });
  }
});

// Admin get chat context
router.get('/chatlogs/context/:chatId', protect, isAdmin, async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name identifier profilePic');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch chat context.' });
  }
});

// Admin delete a message
router.delete('/chatlogs/:id', protect, isAdmin, async (req, res) => {
  try {
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json({ message: 'Message deleted by admin' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete message.' });
  }
});

// ─────────────────────────────────────────────────────────────
// USER ACTIVITY
// ─────────────────────────────────────────────────────────────
router.get('/activity', protect, isAdmin, async (req, res) => {
  try {
    // Top senders
    const topSenders = await Message.aggregate([
      { $group: { _id: '$senderId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          count: 1,
          'user.name': 1,
          'user.identifier': 1,
          'user.profilePic': 1,
          'user.onlineStatus': 1,
          'user.role': 1
        }
      }
    ]);

    // Most active communities
    const communities = await Community.find()
      .sort({ 'members.length': -1 })
      .limit(5)
      .select('name description members channels');

    // Online users now (from real-time sockets)
    const onlineNowArray = Array.from(onlineUsers);
    const onlineNow = await User.find({ _id: { $in: onlineNowArray } })
      .limit(20)
      .select('name identifier profilePic lastSeen language role');

    // Recently active (last seen within 24h)
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const recentlyActive = await User.find({ lastSeen: { $gte: dayAgo } })
      .sort({ lastSeen: -1 })
      .limit(10)
      .select('name identifier profilePic lastSeen onlineStatus language role');

    res.json({ topSenders, communities, onlineNow, recentlyActive });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ message: 'Failed to fetch activity.' });
  }
});

// ─────────────────────────────────────────────────────────────
// SYSTEM BROADCAST
// ─────────────────────────────────────────────────────────────
router.post('/broadcast', protect, isAdmin, (req, res) => {
  try {
    const { message, severity } = req.body;
    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({ message: 'Socket server not available' });
    }
    
    io.emit('system_announcement', { 
      message, 
      severity: severity || 'info', 
      timestamp: new Date() 
    });
    
    res.json({ message: 'Broadcast sent globally to all users' });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ message: 'Failed to send broadcast.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GENERATE REPORTS
// ─────────────────────────────────────────────────────────────
router.get('/reports', protect, isAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const newUsers = await User.countDocuments({ createdAt: { $gte: fromDate, $lte: toDate } });
    const totalMessages = await Message.countDocuments({ createdAt: { $gte: fromDate, $lte: toDate } });
    const mediaMessages = await Message.countDocuments({ 
      createdAt: { $gte: fromDate, $lte: toDate }, 
      mediaType: { $ne: 'text' } 
    });
    const bannedInPeriod = await User.countDocuments({ isBanned: true, updatedAt: { $gte: fromDate, $lte: toDate } });

    // Daily breakdown
    const dailyMessages = await Message.aggregate([
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          messages: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          signups: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Media type distribution
    const mediaTypeDist = await Message.aggregate([
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      { $group: { _id: '$mediaType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      period: { from: fromDate, to: toDate },
      summary: { newUsers, totalMessages, mediaMessages, bannedInPeriod },
      dailyMessages,
      dailySignups,
      mediaTypeDist
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Failed to generate report.' });
  }
});

// ─────────────────────────────────────────────────────────────
// SYSTEM CONFIG (Persisted in MongoDB)
// ─────────────────────────────────────────────────────────────
const SystemConfig = require('../models/SystemConfig');

router.get('/config', protect, isAdmin, async (req, res) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({});
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch config', error: err.message });
  }
});

router.put('/config', protect, isAdmin, async (req, res) => {
  try {
    const { section, updates } = req.body;
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({});
    }
    if (!config[section]) return res.status(400).json({ message: 'Invalid config section' });
    
    // Merge updates into the section
    Object.assign(config[section], updates);
    await config.save();
    
    res.json({ message: 'Configuration updated successfully', config: config[section] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update config', error: err.message });
  }
});

module.exports = router;
