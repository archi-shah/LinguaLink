// backend/socket/socketHandler.js
// ─────────────────────────────────────────────────────────────────────────────
// KEY DESIGN: Every user automatically joins a personal room `user:<userId>`.
// All P2P events (calls, signals) are routed to that room — eliminates every
// possible socket-ID / user-ID mismatch bug.
//
// FIX: webrtc_signal now forwards the FULL { to, signal } wrapper's `signal`
// field correctly. Previously the server was re-emitting the partial inner
// object in a way that lost the { type:'candidate', candidate:{...} } wrapper,
// causing the client-side candidate extraction to fail silently.
// ─────────────────────────────────────────────────────────────────────────────

const socketIo = require('socket.io')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const onlineUsers = new Set()
// Group Call Tracker: chatId -> Set(userIds)
const activeGroupCalls = new Map()
const toStr = (id) => (id ? String(id) : null)

function setupSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // ── Auth middleware (Security Guard) ──────────────────────────────────────
  // Before letting anyone connect to our WebSockets, we check if they have a valid token (JWT).
  // If they don't, we disconnect them. This prevents hackers from listening to chats.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret')
      socket.userId = toStr(decoded.id || decoded._id || decoded.userId)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.userId
    const userRoom = `user:${userId}`

    console.log(`🟢 Connected: ${userId} (socket: ${socket.id})`)

    // ── Join personal room immediately ────────────────────────────────────
    socket.join(userRoom)

    // ── Auto-join all chats for global background real-time sync ────────
    const Chat = require('../models/Chat')
    Chat.find({ members: userId }).select('_id').then(chats => {
      chats.forEach(c => socket.join(String(c._id)))
    }).catch(() => {})

    // ── Online presence ───────────────────────────────────────────────────
    onlineUsers.add(userId)
    io.emit('user_online', { userId })
    socket.emit('online_users_list', { userIds: Array.from(onlineUsers) })
    // Persist to DB (fire-and-forget) so loadChats returns fresh status
    User.findByIdAndUpdate(userId, { onlineStatus: 'online', lastSeen: new Date() }).catch(() => {})

    // ── Chat rooms ────────────────────────────────────────────────────────
    socket.on('join_chat', (chatId) => { socket.join(chatId) })
    socket.on('leave_chat', (chatId) => { socket.leave(chatId) })

    // ── Messaging (Passing the Note) ──────────────────────────────────────
    // When someone sends a message, they emit 'send_message'.
    // We instantly forward it to everyone in that specific 'chatId' room.
    socket.on('send_message', (data) => {
      io.to(data.chatId).emit('receive_message', data.message)
    })

    // ── Typing ────────────────────────────────────────────────────────────
    socket.on('typing', ({ chatId }) => socket.to(chatId).emit('user_typing', { userId, chatId }))
    socket.on('stop_typing', ({ chatId }) => socket.to(chatId).emit('user_stop_typing', { userId, chatId }))

    // ── Receipts / reactions / updates ────────────────────────────────────
    socket.on('message_delivered', ({ chatId, messageId }) => socket.to(chatId).emit('message_delivered_by', { userId, messageId, chatId }))
    socket.on('message_read', ({ chatId, messageId }) => socket.to(chatId).emit('message_read_by', { userId, messageId, chatId }))
    socket.on('message_reaction', ({ chatId, messageId, emoji }) => io.to(chatId).emit('reaction_updated', { messageId, userId, emoji }))
    socket.on('update_message', ({ chatId, message }) => io.to(chatId).emit('message_updated', message))
    
    // Group message seen — updates readBy for the sender's ticks in group chats
    socket.on('group_message_seen', ({ chatId, messageId }) => {
      // Forward to the whole chat room so the sender's UI updates the blue tick counter
      socket.to(chatId).emit('group_message_seen_by', { userId, messageId, chatId });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 📞 WEBRTC CALL SIGNALING
    // ════════════════════════════════════════════════════════════════════════

    // 1. Caller → server: initiate call
    socket.on('call_user', ({ userToCall, signalData, from, name, isVideo }) => {
      const targetId = toStr(userToCall)
      const targetRoom = `user:${targetId}`
      const fromId = toStr(from)

      console.log(`📞 call_user: ${fromId} → ${targetId} (room: ${targetRoom}) | video: ${isVideo}`)

      if (!onlineUsers.has(targetId)) {
        console.log(`   ❌ ${targetId} not online — auto-rejecting`)
        socket.emit('call_rejected', { reason: 'User is offline or unavailable' })
        return
      }

      io.to(targetRoom).emit('incoming_call', {
        signal: signalData,
        from: fromId,
        name,
        isVideo,
      })
      console.log(`   ✅ incoming_call emitted to room ${targetRoom}`)
    })

    // 2. Receiver → server: answer call
    socket.on('answer_call', ({ to, signal }) => {
      const targetId = toStr(to)
      const targetRoom = `user:${targetId}`
      console.log(`📲 answer_call → ${targetId}`)
      io.to(targetRoom).emit('call_accepted', signal)
    })

    // 3. Receiver → server: reject call
    socket.on('reject_call', ({ to }) => {
      const targetId = toStr(to)
      const targetRoom = `user:${targetId}`
      console.log(`❌ reject_call → ${targetId}`)
      io.to(targetRoom).emit('call_rejected', { reason: 'User declined the call' })
    })

    // 4. Either side: end call
    socket.on('end_call', ({ to }) => {
      const targetId = toStr(to)
      const targetRoom = `user:${targetId}`
      console.log(`📵 end_call → ${targetId}`)
      io.to(targetRoom).emit('call_ended')
    })
    
    // 5. Sync Call Log
    socket.on('call_logged', ({ to }) => {
      const targetId = toStr(to)
      io.to(`user:${targetId}`).emit('refresh_call_history')
    })

    // 5. ICE candidate / SDP trickle
    socket.on('webrtc_signal', ({ to, signal }) => {
      const targetId = toStr(to)
      io.to(`user:${targetId}`).emit('webrtc_signal', signal)
    })

    // ════════════════════════════════════════════════════════════════════════
    // 📞 GROUP WEBRTC SIGNALING (MESH)
    // ════════════════════════════════════════════════════════════════════════
    
    socket.on('start_group_call', ({ chatId, isVideo, chatName }) => {
      if (!activeGroupCalls.has(chatId)) activeGroupCalls.set(chatId, new Set());
      activeGroupCalls.get(chatId).add(userId);
      console.log(`[GroupCall] started by ${userId} in ${chatId}`);
      // Notify all members of the chat
      socket.to(chatId).emit('group_call_started', { chatId, callerId: userId, isVideo, chatName });
    });

    socket.on('join_group_call', ({ chatId }) => {
      if (!activeGroupCalls.has(chatId)) activeGroupCalls.set(chatId, new Set());
      const peersInCall = Array.from(activeGroupCalls.get(chatId)).filter(id => id !== userId);
      activeGroupCalls.get(chatId).add(userId);
      console.log(`[GroupCall] ${userId} joining ${chatId}. Existing peers: ${peersInCall}`);
      
      // Send the new joiner the list of existing peers so they can create offers
      socket.emit('group_call_peers', { peers: peersInCall, chatId });
    });

    // Mesh signaling wrapper
    socket.on('group_webrtc_signal', ({ to, signal, chatId }) => {
      const targetId = toStr(to);
      console.log(`[GroupCall] signal from ${userId} -> ${targetId} (${signal.type})`);
      io.to(`user:${targetId}`).emit('group_webrtc_signal', { from: userId, signal, chatId });
    });

    socket.on('leave_group_call', ({ chatId }) => {
      if (activeGroupCalls.has(chatId)) {
        activeGroupCalls.get(chatId).delete(userId);
        if (activeGroupCalls.get(chatId).size === 0) activeGroupCalls.delete(chatId);
      }
      socket.to(chatId).emit('user_left_group_call', { userId, chatId });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const rooms = io.sockets.adapter.rooms
      const stillOnline = rooms.has(userRoom) && rooms.get(userRoom).size > 0

      if (!stillOnline) {
        onlineUsers.delete(userId)
        io.emit('user_offline', { userId })
        console.log(`🔴 Offline: ${userId}`)
        // Persist to DB so loadChats returns fresh status
        User.findByIdAndUpdate(userId, { onlineStatus: 'offline', lastSeen: new Date() }).catch(() => {})
        
        // Clean up group calls
        for (const [chatId, members] of activeGroupCalls.entries()) {
          if (members.has(userId)) {
            members.delete(userId);
            io.to(chatId).emit('user_left_group_call', { userId, chatId });
            if (members.size === 0) activeGroupCalls.delete(chatId);
          }
        }
      } else {
        console.log(`🟡 Disconnected (other tabs still open): ${userId}`)
      }
    })
  })

  return io
}

module.exports = { setupSocket, onlineUsers }