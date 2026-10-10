// controllers/communityController.js
// Full CRUD + join/leave + channel management for Communities

const Community = require('../models/Community');
const Chat      = require('../models/Chat');
const User      = require('../models/User');

// ── Helper: shape a community doc into a safe API response ───────────────────
async function shapeCommunity(community, userId) {
  const isMember = community.members.some(
    (m) => (m._id || m).toString() === userId.toString()
  );

  // Populate member details
  let memberDetails = []
  try {
    const populated = await Community.findById(community._id)
      .populate('members', 'name initials profilePic language onlineStatus')
      .lean()
    memberDetails = populated?.members || []
    console.log('[shapeCommunity] Populated members length:', memberDetails.length)
  } catch (err) {
    console.error('[shapeCommunity] Error populating members:', err)
  }

  return {
    _id:         community._id,
    name:        community.name,
    description: community.description,
    category:    community.category,
    color:       community.color,
    emoji:       community.emoji,
    isPublic:    community.isPublic,
    memberCount: community.members.length,
    isMember,
    createdBy:   community.createdBy,
    admins:      [String(community.createdBy)],
    members:     memberDetails,
    channels:    community.channels.map((ch) => ({
      _id:            ch._id,
      name:           ch.name,
      description:    ch.description,
      chatId:         ch.chatId,
      isAnnouncement: ch.isAnnouncement,
    })),
    createdAt: community.createdAt,
  };
}

// ── GET /api/communities ─────────────────────────────────────────────────────
// List all public communities
exports.getAllCommunities = async (req, res) => {
  try {
    const userId = req.user.id;
    const communities = await Community.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .lean();

    const result = communities.map((c) => ({
      _id:         c._id,
      name:        c.name,
      description: c.description,
      category:    c.category,
      color:       c.color,
      emoji:       c.emoji,
      memberCount: c.members.length,
      channelCount: c.channels.length,
      isMember:    c.members.some((m) => m.toString() === userId),
      createdAt:   c.createdAt,
    }));

    res.json(result);
  } catch (err) {
    console.error('[Community] getAllCommunities:', err.message);
    res.status(500).json({ message: 'Failed to load communities' });
  }
};

// ── GET /api/communities/:id ─────────────────────────────────────────────────
exports.getCommunity = async (req, res) => {
  try {
    const userId    = req.user.id;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    res.json(await shapeCommunity(community, userId));
  } catch (err) {
    console.error('[Community] getCommunity:', err.message);
    res.status(500).json({ message: 'Failed to load community' });
  }
};

// ── POST /api/communities ────────────────────────────────────────────────────
// Create a new community + auto-create an Announcements channel (group chat)
exports.createCommunity = async (req, res) => {
  try {
    const { name, description, category, color, emoji } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Community name is required' });
    }

    // 1. Create the community record (creator is a member automatically)
    const community = new Community({
      name:        name.trim(),
      description: description?.trim() || '',
      category:    category || 'General',
      color:       color || '#4C74F9',
      emoji:       emoji || '🌐',
      createdBy:   userId,
      members:     [userId],
      channels:    [],
    });

    // 2. Auto-create an "Announcements" group chat for the community
    const announcementsChat = await Chat.create({
      isGroup:  true,
      chatName: `${name.trim()} — Announcements`,
      members:  [userId],
      admins:   [userId],
    });

    community.channels.push({
      name:           'Announcements',
      description:    'Official updates from admins',
      chatId:         announcementsChat._id,
      isAnnouncement: true,
    });

    // 3. Also auto-create a "General" channel
    const generalChat = await Chat.create({
      isGroup:  true,
      chatName: `${name.trim()} — General`,
      members:  [userId],
      admins:   [userId],
    });

    community.channels.push({
      name:           'general',
      description:    'General discussion for all members',
      chatId:         generalChat._id,
      isAnnouncement: false,
    });

    await community.save();

    res.status(201).json(await shapeCommunity(community, userId));
  } catch (err) {
    console.error('[Community] createCommunity:', err.message);
    res.status(500).json({ message: 'Failed to create community' });
  }
};

// ── POST /api/communities/:id/join ───────────────────────────────────────────
exports.joinCommunity = async (req, res) => {
  try {
    const userId    = req.user.id;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });

    const alreadyMember = community.members.some((m) => m.toString() === userId);
    if (alreadyMember) {
      return res.json(await shapeCommunity(community, userId));
    }

    // Add user to community members
    community.members.push(userId);

    // Also add user to every channel's group chat
    for (const ch of community.channels) {
      if (ch.chatId) {
        await Chat.findByIdAndUpdate(ch.chatId, {
          $addToSet: { members: userId },
        });
      }
    }

    await community.save();
    res.json(await shapeCommunity(community, userId));
  } catch (err) {
    console.error('[Community] joinCommunity:', err.message);
    res.status(500).json({ message: 'Failed to join community' });
  }
};

// ── POST /api/communities/:id/leave ──────────────────────────────────────────
exports.leaveCommunity = async (req, res) => {
  try {
    const userId    = req.user.id;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });

    community.members = community.members.filter(
      (m) => m.toString() !== userId
    );

    // Remove from all channel chats too
    for (const ch of community.channels) {
      if (ch.chatId) {
        await Chat.findByIdAndUpdate(ch.chatId, {
          $pull: { members: userId },
        });
      }
    }

    await community.save();
    res.json(await shapeCommunity(community, userId));
  } catch (err) {
    console.error('[Community] leaveCommunity:', err.message);
    res.status(500).json({ message: 'Failed to leave community' });
  }
};

// ── POST /api/communities/:id/channels ───────────────────────────────────────
// Add a new channel to an existing community
exports.addChannel = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId    = req.user.id;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });

    // Only creator or members can add channels
    const isMember = community.members.some((m) => m.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Join the community first' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Channel name is required' });
    }

    // Create a real group chat for this channel with all current members
    const chat = await Chat.create({
      isGroup:  true,
      chatName: `${community.name} — ${name.trim()}`,
      members:  community.members,
      admins:   [community.createdBy],
    });

    community.channels.push({
      name:           name.trim().toLowerCase().replace(/\s+/g, '-'),
      description:    description?.trim() || '',
      chatId:         chat._id,
      isAnnouncement: false,
    });

    await community.save();
    res.status(201).json(await shapeCommunity(community, userId));
  } catch (err) {
    console.error('[Community] addChannel:', err.message);
    res.status(500).json({ message: 'Failed to add channel' });
  }
};
