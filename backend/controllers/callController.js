const CallLog = require('../models/CallLog');

// GET /api/calls — fetch call history for current user
exports.getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const logs = await CallLog.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .populate('caller', 'name initials profilePic')
      .populate('receiver', 'name initials profilePic')
      .sort({ createdAt: -1 })
      .limit(100);

    const myId = String(userId);
    const formatted = logs.map(log => {
      const isCaller = String(log.caller._id) === myId;
      const other = isCaller ? log.receiver : log.caller;
      const dur = log.duration || 0;
      return {
        id: log._id,
        name: other.name || 'Unknown',
        initials: other.initials || other.name?.substring(0, 2).toUpperCase() || '??',
        profilePic: other.profilePic || '',
        otherId: String(other._id),
        type: log.type,
        dir: isCaller ? 'outgoing' : 'incoming',
        status: log.status,
        duration: dur > 0 ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : null,
        durationSec: dur,
        time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: log.createdAt,
      };
    });

    return res.status(200).json(formatted);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch call history.', error: err.message });
  }
};

// POST /api/calls — create a call log entry
exports.createCallLog = async (req, res) => {
  try {
    const { receiverId, type, status, duration } = req.body;
    const log = await CallLog.create({
      caller: req.user._id,
      receiver: receiverId,
      type: type || 'audio',
      status: status || 'missed',
      duration: duration || 0,
      startedAt: new Date(),
      endedAt: duration ? new Date(Date.now() + (duration * 1000)) : new Date(),
    });
    const populated = await log.populate([
      { path: 'caller', select: 'name initials profilePic' },
      { path: 'receiver', select: 'name initials profilePic' },
    ]);
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create call log.', error: err.message });
  }
};

// DELETE /api/calls/:id — delete a single call log entry
exports.deleteCallLog = async (req, res) => {
  try {
    await CallLog.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Call log deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete call log.', error: err.message });
  }
};

// DELETE /api/calls — clear all call history for user
exports.clearCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    await CallLog.deleteMany({
      $or: [{ caller: userId }, { receiver: userId }],
    });
    return res.status(200).json({ message: 'Call history cleared.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to clear call history.', error: err.message });
  }
};
