// controllers/userController.js — All user-related endpoints
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');

// GET /api/users/users?search=&limit=
exports.searchUsers = async (req, res) => {
  try {
    const { search = '', limit = 10 } = req.query;
    const currentUserId = req.user._id;

    const users = await User.find({
      _id: { $ne: currentUserId },
      isVerified: true,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { identifier: { $regex: search, $options: 'i' } },
      ],
    })
      .select('name identifier initials profilePic language onlineStatus lastSeen')
      .limit(parseInt(limit));

    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to search users.', error: err.message });
  }
};

// GET /api/users/users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name identifier initials profilePic language onlineStatus lastSeen bio');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get user.', error: err.message });
  }
};

// POST /api/users/follow
exports.sendFollowRequest = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === targetUserId) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "User not found." });

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: targetUserId },
        { sender: targetUserId, receiver: senderId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === 'accepted') return res.status(400).json({ message: "You are already following each other." });
      if (existingRequest.status === 'pending') return res.status(400).json({ message: "A follow request already exists." });
    }

    const newRequest = await FriendRequest.create({
      sender: senderId,
      receiver: targetUserId,
      status: 'pending'
    });

    await Notification.create({
      recipient: targetUserId,
      type: 'friend_request',
      content: `${req.user.name} sent you a follow request.`,
      referenceId: newRequest._id
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetUserId}`).emit('new_notification');
    }

    return res.status(200).json({ message: 'Follow request sent.', request: newRequest });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send follow request.', error: err.message });
  }
};

// POST /api/users/follow/accept
exports.acceptFollowRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FriendRequest.findById(requestId);
    
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: "Request not found or already processed." });
    }
    
    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized." });
    }

    request.status = 'accepted';
    await request.save();

    await User.findByIdAndUpdate(request.sender, { $addToSet: { contacts: request.receiver } });
    await User.findByIdAndUpdate(request.receiver, { $addToSet: { contacts: request.sender } });

    await Notification.create({
      recipient: request.sender,
      type: 'follow_accept',
      content: `${req.user.name} accepted your follow request.`,
      referenceId: request.receiver
    });

    await Notification.findOneAndUpdate(
      { recipient: req.user._id, referenceId: request._id, type: 'friend_request' },
      { actionDone: 'accepted', isRead: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${request.sender}`).emit('new_notification');
      io.to(`user:${req.user._id}`).emit('new_notification');
    }

    return res.status(200).json({ message: "Follow request accepted." });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to accept request.', error: err.message });
  }
};

// POST /api/users/follow/reject
exports.rejectFollowRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FriendRequest.findById(requestId);
    
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: "Request not found or already processed." });
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized." });
    }

    request.status = 'rejected';
    await request.save();

    await Notification.findOneAndUpdate(
      { recipient: req.user._id, referenceId: request._id, type: 'friend_request' },
      { actionDone: 'rejected', isRead: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user._id}`).emit('new_notification');
    }

    return res.status(200).json({ message: "Follow request rejected." });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to reject request.', error: err.message });
  }
};

// GET /api/users/follow-requests
exports.getFollowRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const received = await FriendRequest.find({ receiver: userId, status: 'pending' }).populate('sender', 'name profilePic initials identifier');
    const sent = await FriendRequest.find({ sender: userId, status: 'pending' }).populate('receiver', 'name profilePic initials identifier');
    return res.status(200).json({ received, sent });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch follow requests.', error: err.message });
  }
};

// POST /api/users/contacts/remove
exports.removeContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $pull: { contacts: contactId } });
    return res.status(200).json({ message: 'Contact removed successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to remove contact.', error: err.message });
  }
};

// GET /api/users/contacts
exports.getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contacts', 'name identifier initials profilePic language onlineStatus lastSeen');
    return res.status(200).json({ contacts: user.contacts });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get contacts.', error: err.message });
  }
};

// POST /api/users/block
exports.blockUser = async (req, res) => {
  try {
    const { blockedUserId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: blockedUserId } });
    return res.status(200).json({ message: 'User blocked.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to block user.', error: err.message });
  }
};

// POST /api/users/unblock
exports.unblockUser = async (req, res) => {
  try {
    const { blockedUserId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: blockedUserId } });
    return res.status(200).json({ message: 'User unblocked.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to unblock user.', error: err.message });
  }
};

// PATCH /api/users/status
exports.updateOnlineStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['online', 'away', 'offline'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }
    await User.findByIdAndUpdate(req.user._id, { onlineStatus: status, lastSeen: new Date() });
    return res.status(200).json({ message: 'Status updated.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update status.', error: err.message });
  }
};

// POST /api/users/match-contacts  (match device contacts against app users)
exports.matchContacts = async (req, res) => {
  try {
    const { emails = [], phones = [] } = req.body;
    const identifiers = [...emails, ...phones].map(i => i.toLowerCase());

    const users = await User.find({
      identifier: { $in: identifiers },
      _id: { $ne: req.user._id },
      isVerified: true,
    }).select('name identifier initials profilePic language onlineStatus');

    return res.status(200).json({ users });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to match contacts.', error: err.message });
  }
};

// POST /api/users/report  — report a user to admins
exports.reportUser = async (req, res) => {
  try {
    const { reportedUserId, reason, details = '' } = req.body;
    if (!reportedUserId || !reason) {
      return res.status(400).json({ message: 'reportedUserId and reason are required.' });
    }

    const reportedUser = await User.findById(reportedUserId).select('name');
    if (!reportedUser) return res.status(404).json({ message: 'User not found.' });

    // Store as an admin notification so it shows in the admin panel
    const admins = await User.find({ role: 'admin' }).select('_id');
    const notifContent = `🚨 Report: ${req.user.name} reported ${reportedUser.name} — Reason: ${reason}${details ? `. Details: ${details}` : ''}.`;

    await Promise.all(admins.map(admin =>
      Notification.create({
        recipient: admin._id,
        type: 'report',
        content: notifContent,
        referenceId: reportedUserId,
      })
    ));

    // Also find the latest message between the two users and report it so it appears in AdminChatLogs
    const Chat = require('../models/Chat');
    const Message = require('../models/Message');
    const sharedChat = await Chat.findOne({
      isGroup: false,
      members: { $all: [req.user._id, reportedUserId] }
    });
    
    if (sharedChat) {
      const latestMsg = await Message.findOne({ chatId: sharedChat._id }).sort({ createdAt: -1 });
      if (latestMsg) {
        latestMsg.isReported = true;
        latestMsg.reports.push({
          reportedBy: req.user._id,
          reason: reason,
          details: details,
          createdAt: new Date()
        });
        await latestMsg.save();
      }
    }

    // Notify admins via socket
    const io = req.app.get('io');
    if (io) {
      admins.forEach(admin => io.to(`user:${admin._id}`).emit('new_notification'));
    }

    return res.status(200).json({ message: 'Report submitted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to submit report.', error: err.message });
  }
};
