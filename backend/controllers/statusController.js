// controllers/statusController.js — WhatsApp-like stories/statuses
const Status = require('../models/Status');
const User   = require('../models/User');

// POST /api/status
exports.createStatus = async (req, res) => {
  try {
    const { content, mediaUrl, mediaType, backgroundColor } = req.body;
    const status = await Status.create({
      userId: req.user._id,
      content: content || '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || 'text',
      backgroundColor: backgroundColor || '#7C3AED',
    });

    // Re-fetch with populated user so frontend can render immediately
    const populated = await Status.findById(status._id)
      .populate('userId', 'name initials profilePic');

    return res.status(201).json({ message: 'Status created.', status: populated });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create status.', error: err.message });
  }
};

// GET /api/status  — all statuses from contacts + own
exports.getStatuses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('contacts');
    const allowedUsers = [...(user.contacts || []), req.user._id];

    const statuses = await Status.find({
      userId: { $in: allowedUsers },
      expiresAt: { $gt: new Date() },
    })
      .populate('userId', 'name initials profilePic')
      .populate('viewers', 'name initials profilePic identifier')
      .sort({ createdAt: -1 });

    return res.status(200).json(statuses);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get statuses.', error: err.message });
  }
};

// POST /api/status/:statusId/view
exports.viewStatus = async (req, res) => {
  try {
    await Status.findByIdAndUpdate(
      req.params.statusId,
      { $addToSet: { viewers: req.user._id } }
    );
    return res.status(200).json({ message: 'Status viewed.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to record view.', error: err.message });
  }
};

// DELETE /api/status/:statusId
exports.deleteStatus = async (req, res) => {
  try {
    const status = await Status.findOne({ _id: req.params.statusId, userId: req.user._id });
    if (!status) return res.status(404).json({ message: 'Status not found or not yours.' });
    await status.deleteOne();
    return res.status(200).json({ message: 'Status deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete status.', error: err.message });
  }
};

// GET /api/status/user/:userId
exports.getUserStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      userId: req.params.userId,
      expiresAt: { $gt: new Date() },
    })
      .populate('userId', 'name initials profilePic')
      .sort({ createdAt: -1 });
    return res.status(200).json(statuses);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get user statuses.', error: err.message });
  }
};

// POST /api/status/upload — upload an image for status
const path = require('path');
const fs   = require('fs');

exports.uploadStatusImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }
    // Build a public URL for the uploaded file
    const fileUrl = `/uploads/status/${req.file.filename}`;
    return res.status(200).json({ url: fileUrl });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to upload image.', error: err.message });
  }
};
