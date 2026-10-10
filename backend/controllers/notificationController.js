const Notification = require('../models/Notification');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
      
    return res.status(200).json(notifications);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    return res.status(200).json(notification);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to mark as read', error: err.message });
  }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to mark all as read', error: err.message });
  }
};
