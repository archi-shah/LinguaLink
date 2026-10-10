// frontend/src/store/useStore.js
// This file is the "brain" of the frontend. It uses Zustand to create a global state store.
// A global store lets any React component access data (like the logged-in user or their messages)
// without passing props down a million times.

import { create } from 'zustand'
import { authAPI, chatAPI, userAPI, statusAPI, adminAPI } from '../api/client'
import { useCallStore } from './useCallStore'
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '')

const hashCode = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash &= hash
  }
  return hash
}

// `create` gives us our global hook `useStore`.
// `set` is a function to update the state, and `get` is a function to read the current state.
const useStore = create((set, get) => ({
  // --- STATE (Variables holding our data) ---
  user: null,               // Holds the currently logged-in user profile
  chats: [],                // Holds the list of chats for the sidebar
  messages: {},             // A dictionary of messages, keyed by chatId: { "chat123": [...] }
  activeChat: null,         // The ID of the chat currently open on the screen
  activeSidebar: 'chats',
  mobileSidebarOpen: false,
  privacyMode: false,
  autoTranslate: true,
  chatFilter: 'all',
  statusData: [],
  darkMode: (() => {
    try { return localStorage.getItem('ll_darkMode') === 'true'; } catch { return false; }
  })(),
  isCheckingAuth: (() => {
    try {
      const token = localStorage.getItem('authToken');
      // Only block routing if we have a real token to verify
      return !!(token && token !== 'demo-session-token');
    } catch { return false; }
  })(),
  loading: false,
  error: null,
  deviceContacts: [],
  matchedContacts: [],
  contactsLoading: false,
  contacts: [],
  selectionMode: false,
  selectedMessages: [],
  socket: null,
  onlineUsers: [],
  typingUsers: {},
  replyingTo: null,
  infoMsg: null,
  forwardingMsg: null,
  adminStats: null,
  adminUsers: [],
  adminLoading: false,
  adminToast: null,        // { type, message } — shown to blocked user
  newStatusCount: 0,       // unviewed statuses for sidebar dot
  viewLangOverride: null,

  // ── Actions ───────────────────────────────────────────────────────────
  setViewLangOverride: (lang) => set({ viewLangOverride: lang }),

  // ── UI Preferences ────────────────────────────────────────────────────
  setDarkMode: (val) => {
    try { localStorage.setItem('ll_darkMode', String(val)); } catch {}
    set({ darkMode: val });
  },

  // ── Admin Actions ─────────────────────────────────────────────────────
  fetchAdminStats: async () => {
    set({ adminLoading: true });
    try {
      const data = await adminAPI.getStats();
      set({ adminStats: data, adminLoading: false });
    } catch (err) {
      console.error('fetchAdminStats failed:', err);
      set({ adminLoading: false });
    }
  },

  toggleUserBan: async (userId) => {
    try {
      await adminAPI.toggleBan(userId);
      // Optimistic update for adminUsers list if loaded
      set(state => ({
        adminUsers: state.adminUsers.map(u =>
          u._id === userId ? { ...u, isBanned: !u.isBanned } : u
        )
      }));
    } catch (err) {
      console.error('toggleUserBan failed:', err);
    }
  },

  deleteUser: async (userId) => {
    try {
      await adminAPI.deleteUser(userId);
      set(state => ({
        adminUsers: state.adminUsers.filter(u => u._id !== userId)
      }));
    } catch (err) {
      console.error('deleteUser failed:', err);
    }
  },

  setReplyingTo: (msg) => set({ replyingTo: msg }),
  setMobileSidebarOpen: (val) => set({ mobileSidebarOpen: val }),
  setInfoMsg: (msg) => set({ infoMsg: msg }),
  setForwardingMsg: (msg) => set({ forwardingMsg: msg }),

  // ── UI sound ──────────────────────────────────────────────────────────
  playSound: (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      const now = ctx.currentTime
      if (type === 'send') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(400, now)
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1)
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.5, now + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
        osc.start(now); osc.stop(now + 0.1)
      } else if (type === 'receive') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, now)
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15)
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.5, now + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
        osc.start(now); osc.stop(now + 0.15)
      } else if (type === 'record_start') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(300, now)
        osc.frequency.linearRampToValueAtTime(500, now + 0.1)
        gain.gain.setValueAtTime(0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
        osc.start(now); osc.stop(now + 0.1)
      } else if (type === 'record_stop') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(500, now)
        osc.frequency.linearRampToValueAtTime(300, now + 0.1)
        gain.gain.setValueAtTime(0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
        osc.start(now); osc.stop(now + 0.1)
      }
    } catch (e) {
      console.log('Audio playback failed', e)
    }
  },

  // --- Auth (Login / Logout) ---
  // When a user logs in, we send credentials to our API.
  login: async (identifier, password) => {
    set({ loading: true, error: null }) // Show a loading spinner, clear old errors
    try {
      const data = await authAPI.login(identifier, password)
      
      // If login is successful and no OTP is needed, we save the secret token!
      if (!data.requireOtp && data.token) {
        localStorage.setItem('authToken', data.token) // Save token in browser so user stays logged in
        set({ user: data.user, loading: false }) // Update global state with the user details
        get().initSocket(data.token) // Connect to real-time WebSockets
        await get().loadChats() // Immediately load the user's chat list
      } else {
        set({ loading: false })
      }
      return data
    } catch (err) {
      // If something goes wrong (e.g. wrong password), catch the error and stop loading
      set({ error: err.message || 'Login failed', loading: false }); throw err
    }
  },

  googleLogin: async (token) => {
    set({ loading: true, error: null })
    try {
      const data = await authAPI.googleLogin(token)
      if (data.token) {
        localStorage.setItem('authToken', data.token)
        set({ user: data.user, loading: false })
        get().initSocket(data.token)
        await get().loadChats()
      }
      return data
    } catch (err) {
      set({ error: err.message || 'Google Login failed', loading: false }); throw err
    }
  },

  register: async (name, identifier, password, confirmPassword, language) => {
    set({ loading: true, error: null })
    try {
      const data = await authAPI.register(name, identifier, password, confirmPassword, language)
      if (!data.requireOtp && data.token) {
        localStorage.setItem('authToken', data.token)
        set({ user: data.user, loading: false })
      } else {
        set({ loading: false })
      }
      return data
    } catch (err) {
      set({ error: err.message || 'Registration failed', loading: false }); throw err
    }
  },

  sendOTP: async (identifier) => {
    set({ loading: true, error: null })
    try {
      const data = await authAPI.sendOTP(identifier)
      set({ loading: false })
      return data
    } catch (err) {
      set({ error: err.message || 'Failed to send OTP', loading: false }); throw err
    }
  },

  verifyOTP: async (identifier, otp) => {
    set({ loading: true, error: null })
    try {
      const data = await authAPI.verifyOTP(identifier, otp)
      localStorage.setItem('authToken', data.token)
      set({ user: data.user, loading: false })
      get().initSocket(data.token)
      await get().loadChats()
      await get().loadContacts()
      return data
    } catch (err) {
      set({ error: err.message || 'Verification failed', loading: false }); throw err
    }
  },

  forgotPassword: async (identifier) => {
    set({ loading: true, error: null })
    try {
      const data = await authAPI.forgotPassword(identifier)
      set({ loading: false })
      return data
    } catch (err) {
      set({ error: err.message || 'Failed to send reset code', loading: false }); throw err
    }
  },

  resetPassword: async (identifier, otp, newPassword) => {
    set({ loading: true, error: null })
    try {
      const data = await authAPI.resetPassword(identifier, otp, newPassword)
      set({ loading: false })
      return data
    } catch (err) {
      set({ error: err.message || 'Password reset failed', loading: false }); throw err
    }
  },

  logout: async () => {
    try { await authAPI.logout() } catch (err) { console.error('Logout error:', err) }
    localStorage.removeItem('authToken')
    get().disconnectSocket()
    set({ user: null, activeChat: null, chats: [], messages: {} })
  },

  getCurrentUser: async () => {
    set({ loading: true })
    try {
      const data = await authAPI.getCurrentUser()
      set({ user: data, loading: false, isCheckingAuth: false })
      const token = localStorage.getItem('authToken')
      if (token) {
        get().initSocket(token)
        await get().loadChats()
      }
      await get().loadContacts()
      return data
    } catch (err) {
      set({ error: err.message, loading: false, isCheckingAuth: false }); throw err
    }
  },

  updateProfile: async (updates) => {
    try {
      const data = await authAPI.updateProfile(updates)
      if (data.user) set({ user: data.user })
      return data
    } catch (err) {
      console.error('Failed to update profile:', err); throw err
    }
  },

  updatePreferences: async (prefs) => {
    try {
      await authAPI.updatePreferences(prefs)
      const { user } = get()
      if (user) set({ user: { ...user, preferences: { ...user.preferences, ...prefs } } })
      return true
    } catch (err) {
      console.error('Failed to update preferences:', err); throw err
    }
  },

  // ── Chats ─────────────────────────────────────────────────────────────
  loadChats: async () => {
    set({ loading: true, error: null })
    try {
      const rawChats = await chatAPI.getChats()
      const { user, onlineUsers } = get()
      const formattedChats = rawChats.map(c => {
        const myId = String(user?._id || user?.id || '')
        const other = c.members?.find(m => String(m._id || m.id) !== myId) || {}
        const otherId = String(other._id || other.id || '')
        // Prefer real-time socket data; fall back to DB onlineStatus if socket
        // hasn't connected yet (onlineUsers is still empty on first load).
        const isOnlineRealtime = onlineUsers.length > 0
          ? onlineUsers.includes(otherId)
          : other.onlineStatus === 'online'
        return {
          id: c._id,
          otherId,
          name: c.isGroup ? c.chatName : (other.name || 'Unknown User'),
          initials: c.isGroup ? (c.chatName?.substring(0, 2).toUpperCase() || 'GR') : (other.initials || other.name?.substring(0, 2).toUpperCase() || 'U'),
          lang: c.isGroup ? 'MULTI' : (other.language || 'EN'),
          preview: (c.latestMessage?.translations && c.latestMessage.translations[user?.language || 'en'])
             ? c.latestMessage.translations[user?.language || 'en']
             : (c.latestMessage?.originalText || c.latestMessage?.text || 'No messages yet'),
          latestMessageStatus: c.latestMessage?.status || 'sent',
          lastMessageIsMine: String(c.latestMessage?.senderId?._id || c.latestMessage?.senderId) === myId,
          latestMessageMediaType: c.latestMessage?.mediaType || 'text',
          latestMessageDeleted: !!c.latestMessage?.deleted,
          time: c.latestMessage?.createdAt ? new Date(c.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          unread: c.unreadCount || 0,
          online: isOnlineRealtime,
          color: (c.isGroup ? c.groupPic : other.profilePic) ? 'transparent' : `hsl(${Math.abs(hashCode(String(c._id || other._id || '1'))) % 360}, 70%, 55%)`,
          isGroup: c.isGroup,
          profilePic: c.isGroup ? (c.groupPic || null) : other.profilePic,
          bio: c.isGroup ? '' : (other.bio || ''),
          members: c.members,
          admins: c.admins || [],
          pinnedBy: c.pinnedBy || [],
          archivedBy: c.archivedBy || [],
        }
      })
      set({ chats: formattedChats, loading: false })
      return formattedChats
    } catch (err) {
      console.error('Failed to load chats:', err); set({ loading: false })
    }
  },

  createChat: async (participantIds, isGroup = false, chatName = '', isBroadcast = false) => {
    try {
      const ids = Array.isArray(participantIds) ? participantIds : [participantIds]
      const chat = await chatAPI.createChat(ids, isGroup, chatName, isBroadcast)
      await get().loadChats()
      get().setActiveChat(chat._id)
      return chat
    } catch (err) {
      console.error('Failed to create chat:', err); throw err
    }
  },

  loadMessages: async (chatId) => {
    set({ loading: true, error: null })
    try {
      const data = await chatAPI.getMessages(chatId)
      const mappedData = data.map(msg => ({
        ...msg,
        id: msg._id || msg.id,
        text: msg.originalText || msg.text || '',
        translated: msg.translatedText || msg.translated || '',
        time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : msg.time,
        type: (msg.senderId?._id === (get().user?._id || get().user?.id)) || (msg.senderId === (get().user?._id || get().user?.id)) ? 'sent' : 'recv',
      }))
      const { messages } = get()
      set({ messages: { ...messages, [chatId]: mappedData }, loading: false })
      return mappedData
    } catch (err) {
      console.error('Failed to load messages:', err); set({ loading: false })
    }
  },

  setActiveChat: (chatId) => {
    const { socket, activeChat } = get()
    if (socket && activeChat) socket.emit('leave_chat', activeChat)
    set({ activeChat: chatId })
    
    if (chatId) {
      if (socket) socket.emit('join_chat', chatId)
      
      get().loadMessages(chatId).then((msgs) => {
        // For group chats: emit seen signal for all messages in this chat
        const chat = get().chats.find(c => c.id === chatId)
        if (chat?.isGroup && msgs && socket) {
          msgs.forEach(m => {
            if (m.type === 'recv') {
              socket.emit('group_message_seen', { chatId, messageId: m.id || m._id })
            }
          })
        }
      })
      // Mark messages as read in DB + notify sender via socket
      chatAPI.markAsRead(chatId).catch(() => {})
      if (socket) socket.emit('message_read', { chatId })
      
      // Update sidebar preview status
      set(state => ({
        chats: state.chats.map(c =>
          (c.id === chatId || c._id === chatId) ? { ...c, unread: 0 } : c
        ),
      }))
    }
  },

  setActiveSidebar: (tab) => set({ activeSidebar: tab }),
  setPrivacyMode: (val) => set({ privacyMode: val }),
  setAutoTranslate: (val) => set({ autoTranslate: val }),
  setChatFilter: (f) => set({ chatFilter: f }),
  setDarkMode: (val) => {
    set({ darkMode: val })
    if (val) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  },

  setSelectionMode: (mode) => set({ selectionMode: mode, selectedMessages: mode ? get().selectedMessages : [] }),
  toggleMessageSelection: (msgId) => {
    const { selectedMessages } = get()
    set({ selectedMessages: selectedMessages.includes(msgId) ? selectedMessages.filter(id => id !== msgId) : [...selectedMessages, msgId] })
  },

  voteOnPoll: async (messageId, optionIndex) => {
    try {
      const data = await chatAPI.votePoll(messageId, optionIndex)
      const { activeChat, messages, socket } = get()
      if (activeChat && messages[activeChat]) {
        const newMsgs = messages[activeChat].map(msg =>
          (msg.id === messageId || msg._id === messageId) ? { ...msg, metadata: data.metadata } : msg
        )
        set({ messages: { ...messages, [activeChat]: newMsgs } })
      }
      if (socket) socket.emit('update_message', { chatId: activeChat, message: data })
    } catch (err) { console.error('Failed to vote:', err) }
  },

  reportMessage: async (messageId, reason) => {
    try {
      await chatAPI.reportMessage(messageId, reason)
    } catch (err) {
      console.error('Failed to report message:', err)
      throw err
    }
  },

  appendMessage: (chatId, msg) => {
    set(state => {
      const existingMessages = state.messages[chatId] || []
      const isAudio = msg.mediaType === 'audio'
      return {
        messages: { ...state.messages, [chatId]: [...existingMessages, msg] },
        chats: state.chats.map(c => c.id === chatId || c._id === chatId ? {
          ...c,
          preview: msg.text || (isAudio ? '🎤 Voice Note' : '📄 Document'),
          time: msg.time,
          lastMessageIsMine: true,
          latestMessageStatus: msg.status || 'sent',
          latestMessageMediaType: msg.mediaType
        } : c)
      }
    })
  },

  replaceMessage: (chatId, oldId, newMsg) => {
    set(state => {
      const existingMessages = state.messages[chatId] || []
      const isAudio = newMsg.mediaType === 'audio'
      return {
        messages: { ...state.messages, [chatId]: existingMessages.map(m => m.id === oldId ? newMsg : m) },
        chats: state.chats.map(c => c.id === chatId || c._id === chatId ? {
          ...c,
          preview: newMsg.text || (isAudio ? '🎤 Voice Note' : '📄 Document'),
          time: newMsg.time,
          lastMessageIsMine: true,
          latestMessageStatus: newMsg.status || 'sent',
          latestMessageMediaType: newMsg.mediaType
        } : c)
      }
    })
  },

  removeMessage: (chatId, msgId) => {
    set(state => {
      const existingMessages = state.messages[chatId] || []
      return {
        messages: { ...state.messages, [chatId]: existingMessages.filter(m => m.id !== msgId) }
      }
    })
  },

  // sendMessage is called when the user types a message and clicks send.
  sendMessage: async (text, chatId, language = 'en', mediaUrl = '', mediaType = 'text', metadata = {}) => {
    const cid = chatId || get().activeChat
    if (!cid || (!text.trim() && !mediaUrl && !metadata)) return
    
    // Step 1: Optimistic UI Update. We immediately create a "fake" message object
    // and put it on the screen so the app feels lightning fast.
    const newMsg = {
      id: Date.now(), type: 'sent', text, translated: null, lang: language,
      mediaUrl, mediaType, metadata,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ticks: 1, status: 'sent',
    }
    const { messages, chats } = get()
    
    // Put the fake message into our state array
    set({ 
      messages: { ...messages, [cid]: [...(messages[cid] || []), newMsg] },
      chats: chats.map(c => {
        if (c.id === cid || c._id === cid) {
          return {
            ...c,
            preview: newMsg.text || 'Media Message',
            time: newMsg.time,
            lastMessageIsMine: true,
            latestMessageStatus: 'sent',
            latestMessageMediaType: newMsg.mediaType
          }
        }
        return c
      })
    })
    try {
      const data = await chatAPI.sendMessage(cid, text, language, mediaUrl, mediaType, metadata)
      const { messages: m, socket, chats: currentChats } = get()
      const serverMsg = {
        ...newMsg, ...data,
        id: data.id || data._id || newMsg.id,
        text: data.text || data.originalText || newMsg.text,
        translated: data.translated || data.translatedText || newMsg.translated,
        lang: data.lang || data.language || newMsg.lang,
        // ALWAYS keep the local mediaType for rich messages — the server may
        // return a normalised value that doesn't match what we sent locally.
        mediaType: (newMsg.mediaType && newMsg.mediaType !== 'text')
          ? newMsg.mediaType
          : (data.mediaType || 'text'),
        // Merge metadata: local keys win when server returns an empty object
        // (Mixed-type Mongoose fields can sometimes come back without all keys).
        metadata: Object.keys(data.metadata || {}).length > 0
          ? { ...(newMsg.metadata || {}), ...(data.metadata || {}) }
          : (newMsg.metadata || {}),
        ticks: data.status === 'read' ? 3 : data.status === 'delivered' ? 2 : 1,
        status: data.status || 'sent',
      }
      set({ 
        messages: { ...m, [cid]: m[cid].map(msg => msg.id === newMsg.id ? serverMsg : msg) },
        chats: currentChats.map(c => c.id === cid || c._id === cid ? { ...c, preview: serverMsg.text || 'Media Message', latestMessageStatus: serverMsg.status } : c)
      })
      if (socket) socket.emit('send_message', { chatId: cid, message: serverMsg })
    } catch (err) {
      console.error('Failed to send message:', err)
      const { messages: m } = get()
      set({ messages: { ...m, [cid]: m[cid].filter(msg => msg.id !== newMsg.id) } })
    }
  },

  forwardMessage: async (messageToForward, targetChatId) => {
    const { sendMessage } = get()
    await sendMessage(
      messageToForward.originalText || messageToForward.text || '',
      targetChatId, 'en',
      messageToForward.mediaUrl || '',
      messageToForward.mediaType || 'text',
      { ...(messageToForward.metadata || {}), forwarded: true },
    )
  },

  toggleMessageTranslation: (chatId, msgId) => {
    const { messages } = get()
    set({ messages: { ...messages, [chatId]: messages[chatId].map(m => m.id === msgId ? { ...m, showTranslated: !m.showTranslated } : m) } })
  },

  searchUsers: async (query, limit = 10) => {
    try { return await userAPI.searchUsers(query, limit) } catch (err) { console.error('Failed to search users:', err); return [] }
  },

  sendFollowRequest: async (targetUserId) => {
    try { await userAPI.sendFollowRequest(targetUserId); return true } catch (err) { console.error('Failed to send follow request:', err); return false }
  },

  fetchContacts: async () => {
    try { const data = await userAPI.getContacts(); set({ contacts: data.contacts || [] }) } catch (err) { console.error('Failed to fetch contacts:', err) }
  },

  loadContacts: async () => get().fetchContacts(),

  blockUser: async (userId) => {
    try {
      await userAPI.blockUser(userId)
      const { user } = get()
      if (user) set({ user: { ...user, blockedUsers: [...(user.blockedUsers || []), userId] } })
      return true
    } catch (err) { console.error('Failed to block user:', err); return false }
  },

  unblockUser: async (userId) => {
    try {
      await userAPI.unblockUser(userId)
      const { user } = get()
      if (user) set({ user: { ...user, blockedUsers: (user.blockedUsers || []).filter(id => String(id) !== String(userId)) } })
      return true
    } catch (err) { console.error('Failed to unblock user:', err); return false }
  },

  editMessage: async (messageId, text) => {
    try {
      const data = await chatAPI.editMessage(messageId, text)
      const { messages, activeChat } = get()
      set({
        messages: {
          ...messages,
          [activeChat]: messages[activeChat].map(m =>
            (m.id === messageId || m._id === messageId)
              ? { ...m, text, originalText: text, edited: true, isEdited: true }
              : m
          )
        }
      })
      return data
    } catch (err) { console.error('Failed to edit message:', err); throw err }
  },

  deleteMessage: async (messageId, type) => {
    try {
      const data = await chatAPI.deleteMessage(messageId, type)
      const { messages, activeChat } = get()
      let updatedMsgs
      if (type === 'for_everyone') {
        updatedMsgs = messages[activeChat].map(m =>
          (m.id === messageId || m._id === messageId) ? { ...m, deletedForEveryone: true, deleted: true, text: '' } : m
        )
        const socket = get().socket
        if (socket) socket.emit('update_message', { chatId: activeChat, message: { ...(data || {}), _id: messageId, deletedForEveryone: true } })
      } else {
        updatedMsgs = messages[activeChat].filter(m => m.id !== messageId && m._id !== messageId)
      }
      set({ messages: { ...messages, [activeChat]: updatedMsgs } })
      return true
    } catch (err) { console.error('Failed to delete message:', err); return false }
  },

  archiveChat: async (chatId) => {
    try {
      const data = await chatAPI.archiveChat(chatId)
      const { chats } = get()
      set({ chats: chats.map(c => (c.id === chatId || c._id === chatId) ? data : c) })
      return true
    } catch (err) { console.error('Failed to archive chat:', err); return false }
  },

  togglePinChat: async (chatId) => {
    try {
      const data = await chatAPI.togglePinChat(chatId)
      const { chats } = get()
      set({ chats: chats.map(c => (c.id === chatId || c._id === chatId) ? { ...c, pinnedBy: data.pinnedBy } : c) })
      return true
    } catch (err) { console.error('Failed to pin chat:', err); return false }
  },

  toggleMuteChat: async (chatId) => {
    try {
      const data = await chatAPI.toggleMute(chatId)
      const { chats } = get()
      set({ chats: chats.map(c => (c.id === chatId || c._id === chatId) ? { ...c, mutedBy: data.mutedBy } : c) })
      return true
    } catch (err) { console.error('Failed to mute chat:', err); return false }
  },

  toggleUnreadChat: async (chatId) => {
    try {
      const data = await chatAPI.toggleUnread(chatId)
      const { chats } = get()
      set({ chats: chats.map(c => (c.id === chatId || c._id === chatId) ? { ...c, unreadBy: data.unreadBy } : c) })
      return true
    } catch (err) { console.error('Failed to toggle unread:', err); return false }
  },

  toggleFavouriteChat: async (chatId) => {
    try {
      const data = await chatAPI.toggleFavourite(chatId)
      const { chats } = get()
      set({ chats: chats.map(c => (c.id === chatId || c._id === chatId) ? { ...c, favouritedBy: data.favouritedBy } : c) })
      return true
    } catch (err) { console.error('Failed to favourite chat:', err); return false }
  },

  toggleListChat: async (chatId) => {
    try {
      const data = await chatAPI.toggleList(chatId)
      const { chats } = get()
      set({ chats: chats.map(c => (c.id === chatId || c._id === chatId) ? { ...c, listedBy: data.listedBy } : c) })
      return true
    } catch (err) { console.error('Failed to list chat:', err); return false }
  },

  clearChatHistory: async (chatId) => {
    try {
      await chatAPI.clearChat(chatId)
      const { messages } = get()
      set({ messages: { ...messages, [chatId]: [] } })
      return true
    } catch (err) { console.error('Failed to clear chat:', err); return false }
  },

  exitGroup: async (chatId) => {
    try {
      await chatAPI.exitGroup(chatId)
      const { chats, activeChat } = get()
      set({ chats: chats.filter(c => c.id !== chatId && c._id !== chatId), activeChat: activeChat === chatId ? null : activeChat })
      return true
    } catch (err) { console.error('Failed to exit group:', err); return false }
  },

  addReaction: async (messageId, emoji) => {
    try {
      await chatAPI.addReaction(messageId, emoji)
      const { messages, activeChat, user, socket } = get()
      if (activeChat && messages[activeChat]) {
        const myId = user?._id || user?.id
        const updatedMsgs = messages[activeChat].map(m => {
          if (m.id === messageId || m._id === messageId) {
            const existing = m.reactions || []
            const myPrev = existing.find(r => r.userId === myId)
            const newReactions = myPrev && myPrev.emoji === emoji
              ? existing.filter(r => r.userId !== myId)
              : [...existing.filter(r => r.userId !== myId), { userId: myId, emoji }]
            return { ...m, reactions: newReactions }
          }
          return m
        })
        set({ messages: { ...messages, [activeChat]: updatedMsgs } })
        if (socket) socket.emit('message_reaction', { chatId: activeChat, messageId, emoji })
      }
      return true
    } catch (err) { console.error('Failed to add reaction:', err); return false }
  },

  toggleStarMessage: async (messageId) => {
    try {
      const res = await chatAPI.toggleStar(messageId)
      const { user } = get()
      if (user && res?.starredMessages) set({ user: { ...user, starredMessages: res.starredMessages } })
      return true
    } catch (err) { console.error('Failed to toggle star:', err); return false }
  },

  togglePinMessage: async (messageId) => {
    try {
      const res = await chatAPI.togglePin(messageId)
      const { messages, activeChat } = get()
      const updatedMsgs = messages[activeChat].map(m => (m.id === messageId || m._id === messageId) ? res.data : m)
      set({ messages: { ...messages, [activeChat]: updatedMsgs } })
      const socket = get().socket
      if (socket) socket.emit('update_message', { chatId: activeChat, message: res.data })
      return true
    } catch (err) { console.error('Failed to toggle pin:', err); return false }
  },

  // ── Contacts ─────────────────────────────────────────────────────────
  fetchDeviceContacts: async () => {
    if (!('contacts' in navigator)) throw new Error('Contacts API not supported')
    set({ contactsLoading: true })
    try {
      const permission = await navigator.contacts.requestPermission()
      if (permission !== 'granted') throw new Error('Contacts permission denied')
      const contacts = await navigator.contacts.getAll({ projection: ['name', 'email', 'tel'] })
      const emails = [], phones = []
      contacts.forEach(c => {
        c.emails?.forEach(e => { if (e.address) emails.push(e.address.toLowerCase()) })
        c.tel?.forEach(p => { if (p) phones.push(p) })
      })
      set({ deviceContacts: contacts, contactsLoading: false })
      return await get().matchDeviceContacts([...new Set(emails)], [...new Set(phones)])
    } catch (err) { set({ contactsLoading: false }); throw err }
  },

  matchDeviceContacts: async (emails, phones) => {
    try {
      const result = await userAPI.matchContacts(emails, phones)
      set({ matchedContacts: result.users })
      return result
    } catch (err) { console.error('Failed to match contacts:', err); throw err }
  },

  clearContacts: () => set({ deviceContacts: [], matchedContacts: [] }),

  // ── Status ────────────────────────────────────────────────────────────
  loadStatuses: async () => {
    try { const data = await statusAPI.getStatuses(); set({ statusData: data || get().statusData }); return data } catch (err) { console.error('Failed to load statuses:', err) }
  },

  createStatus: async (content, mediaUrl, mediaType = 'text') => {
    set({ loading: true, error: null })
    try { const data = await statusAPI.createStatus(content, mediaUrl, mediaType); set({ loading: false }); return data }
    catch (err) { set({ error: err.message || 'Failed to create status', loading: false }); throw err }
  },

  // ── Admin ─────────────────────────────────────────────────────────────
  fetchAdminStats: async () => {
    set({ adminLoading: true })
    try {
      const data = await adminAPI.getStats()
      set({ adminStats: data, adminLoading: false })
      return data
    } catch (err) { 
      set({ error: err.message, adminLoading: false })
      throw err 
    }
  },
  
  fetchAdminUsers: async () => {
    set({ adminLoading: true })
    try {
      const data = await adminAPI.getUsers()
      set({ adminUsers: data, adminLoading: false })
      return data
    } catch (err) { 
      set({ error: err.message, adminLoading: false })
      throw err 
    }
  },
  
  toggleUserBan: async (userId) => {
    try {
      const data = await adminAPI.toggleBan(userId)
      const { adminUsers } = get()
      set({ adminUsers: adminUsers.map(u => (u._id === userId || u.id === userId) ? { ...u, isBanned: !u.isBanned } : u) })
      return data
    } catch (err) { 
      console.error('Failed to toggle ban:', err)
      throw err 
    }
  },
  
  deleteUser: async (userId) => {
    try {
      await adminAPI.deleteUser(userId)
      const { adminUsers } = get()
      set({ adminUsers: adminUsers.filter(u => u._id !== userId && u.id !== userId) })
      return true
    } catch (err) { 
      console.error('Failed to delete user:', err)
      throw err 
    }
  },

  // ── Socket ────────────────────────────────────────────────────────────
  initSocket: (token) => {
    if (get().socket) return   // already connected

    const socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('🟢 Socket connected:', socket.id)
      // The server will automatically emit 'online_users_list' upon connection,
      // which will update chats. But also re-apply any already-known onlineUsers
      // immediately so there's no flicker after a reconnect.
      const { chats, onlineUsers } = get()
      if (onlineUsers.length > 0) {
        set({ chats: chats.map(c => ({ ...c, online: c.otherId ? onlineUsers.includes(String(c.otherId)) : false })) })
      }
    })

    socket.on('connect_error', (err) => console.error('🔴 Socket error:', err.message))

    socket.on('online_users_list', ({ userIds }) => {
      const strIds = (userIds || []).map(String)
      const { chats, user } = get()
      const myId = String(user?._id || user?.id || '')
      // Also include yourself as online so your own status is always correct
      set({
        onlineUsers: strIds,
        chats: chats.map(c => ({
          ...c,
          online: c.isGroup ? c.online : (c.otherId ? strIds.includes(String(c.otherId)) : false)
        }))
      })
    })

    socket.on('receive_message', (message) => {
      const { messages, user } = get()
      const myId = user?._id || user?.id
      if (message.senderId?._id === myId || message.senderId === myId) return
      get().playSound('receive')
      const cid = message.chatId
      const newMsg = {
        ...message,
        id: message._id || message.id,
        text: message.originalText || message.text || '',
        translated: message.translatedText || message.translated || '',
        type: 'recv',
        ticks: 2,
        time: new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lang: message.language || message.lang || 'en',
      }
      set((state) => {
        const existing = state.messages[cid] || []
        if (existing.some(m => m.id === newMsg.id)) return state

        let updatedChat = null
        const otherChats = []
        state.chats.forEach(c => {
          if (c.id === cid || c._id === cid) {
            updatedChat = {
              ...c,
              unread: (state.activeChat === cid) ? 0 : (c.unread || 0) + 1,
              preview: (newMsg.translations && newMsg.translations[user?.language || 'en'])
                         ? newMsg.translations[user?.language || 'en']
                         : (newMsg.text || 'Message'),
              time: newMsg.time,
              latestMessageStatus: 'delivered',
              lastMessageIsMine: false,
              latestMessageMediaType: newMsg.mediaType,
              latestMessageDeleted: false
            }
          } else {
            otherChats.push(c)
          }
        })
        
        const newChats = updatedChat ? [updatedChat, ...otherChats] : state.chats

        return { 
          messages: { ...state.messages, [cid]: [...existing, newMsg] },
          chats: newChats
        }
      })
      // Emit appropriate status based on whether we are looking at the chat
      if (socket) {
        const currentState = get();
        if (currentState.activeChat === cid && document.visibilityState === 'visible') {
          socket.emit('message_read', { chatId: cid })
          // Find if it is a group and emit seen
          const isGroup = currentState.chats?.find(c => c.id === cid)?.isGroup;
          if (isGroup) {
            socket.emit('group_message_seen', { chatId: cid, messageId: newMsg.id })
          }
          chatAPI.markAsRead(cid).catch(() => {})
        } else {
          socket.emit('message_delivered', { chatId: cid, messageId: newMsg.id })
        }
      }
    })

    socket.on('message_delivered_by', ({ userId: readerId, messageId, chatId }) => {
      const { messages } = get()
      set(state => {
        const updated = (state.messages[chatId] || []).map(m =>
          m.id === messageId || m._id === messageId
            ? { ...m, status: m.status === 'read' ? 'read' : 'delivered', ticks: m.status === 'read' ? 3 : 2 }
            : m
        )
        return { messages: { ...state.messages, [chatId]: updated } }
      })
    })

    // When remote user reads our messages (receiver opened the chat)
    socket.on('message_read_by', ({ userId: readerId, messageId, chatId: readChatId }) => {
      const { messages, user, chats } = get()
      const myId = String(user?._id || user?.id || '')
      // Update all sent messages in that chat to 'read' status
      Object.keys(messages).forEach(cid => {
        if (!readChatId || readChatId === cid) {
          const updated = messages[cid]?.map(m =>
            m.type === 'sent' ? { ...m, status: 'read', ticks: 3 } : m
          )
          if (updated) {
            set(state => ({ messages: { ...state.messages, [cid]: updated } }))
          }
        }
      })
      // Update sidebar latest message status to 'read'
      set(state => ({
        chats: state.chats.map(c => {
          if (!readChatId || c.id === readChatId) {
            if (c.lastMessageIsMine) return { ...c, latestMessageStatus: 'read' }
          }
          return c
        }),
      }))
    })

    socket.on('message_updated', (updatedMessage) => {
      const { messages } = get()
      const cid = updatedMessage.chatId || updatedMessage.chatId?._id
      if (messages[cid]) {
        const newMsgs = messages[cid].map(msg => {
          if (msg.id === updatedMessage._id || msg._id === updatedMessage._id) {
            return { ...msg, ...updatedMessage, id: updatedMessage._id, text: updatedMessage.originalText || updatedMessage.text, translated: updatedMessage.translatedText || updatedMessage.translated }
          }
          return msg
        })
        set({ messages: { ...messages, [cid]: newMsgs } })
      }
    })

    socket.on('user_online', ({ userId }) => {
      const strId = String(userId)
      const { onlineUsers, chats } = get()
      set({
        onlineUsers: onlineUsers.includes(strId) ? onlineUsers : [...onlineUsers, strId],
        chats: chats.map(c => c.otherId && String(c.otherId) === strId ? { ...c, online: true } : c),
      })
    })

    socket.on('user_offline', ({ userId }) => {
      const strId = String(userId)
      const { chats } = get()
      set({
        onlineUsers: get().onlineUsers.filter(id => String(id) !== strId),
        chats: chats.map(c => c.otherId && String(c.otherId) === strId ? { ...c, online: false } : c),
      })
    })

    socket.on('user_typing', ({ userId, chatId }) => {
      set(state => {
        const chatTyping = state.typingUsers[chatId] || []
        if (chatTyping.includes(userId)) return state
        return { typingUsers: { ...state.typingUsers, [chatId]: [...chatTyping, userId] } }
      })
    })

    socket.on('user_stop_typing', ({ userId, chatId }) => {
      set(state => {
        const chatTyping = state.typingUsers[chatId] || []
        return { typingUsers: { ...state.typingUsers, [chatId]: chatTyping.filter(id => id !== userId) } }
      })
    })

    socket.on('user_profile_updated', (updatedUser) => {
      const { user } = get()
      set(state => {
        // Update user if I am the one updating (cross-tab sync)
        const newUser = (user && (user._id === updatedUser._id || user.id === updatedUser._id)) 
                           ? { ...user, ...updatedUser } : user

        // Update Contacts
        const newContacts = state.contacts.map(c => 
          (c._id === updatedUser._id || c.id === updatedUser._id) ? { ...c, ...updatedUser } : c
        )

        // Update Chats (including nested members object and other parameters)
        const newChats = state.chats.map(chat => {
          let updatedChat = chat
          if (chat.otherId && String(chat.otherId) === String(updatedUser._id)) {
            updatedChat = { ...chat, name: updatedUser.name, profilePic: updatedUser.profilePic }
          }
          if (chat.members) {
            updatedChat.members = chat.members.map(m => 
              (m._id === updatedUser._id || m.id === updatedUser._id) ? { ...m, ...updatedUser } : m
            )
          }
          return updatedChat
        })

        return { user: newUser, contacts: newContacts, chats: newChats }
      })
    })

    // ══════════════════════════════════════════════════════════════════════
    // 📞 CALL SIGNALING
    // Registered at socket-connect time — never missed due to component mount
    // ══════════════════════════════════════════════════════════════════════

    socket.on('incoming_call', (data) => {
      console.log('📞 [Store] incoming_call from', data.from, '| video:', data.isVideo)
      const cs = useCallStore.getState()
      // Auto-reject if already busy
      if (cs.isReceivingCall || cs.isCalling || cs.activeCall) {
        console.log('📞 [Store] busy — auto-rejecting')
        socket.emit('reject_call', { to: data.from })
        return
      }
      cs.setIncomingCall({
        id: data.from,
        name: data.name || 'Unknown',
        initials: (data.name || 'U').substring(0, 2).toUpperCase(),
        signal: data.signal,
        isVideo: data.isVideo,
      })
    })

    socket.on('call_accepted', (signal) => {
      console.log('📲 [Store] call_accepted')
      useCallStore.getState().setCallAccepted(signal)
    })

    socket.on('call_rejected', (data) => {
      console.log('❌ [Store] call_rejected:', data?.reason)
      useCallStore.getState().setCallRejected()
    })

    socket.on('call_ended', () => {
      console.log('📵 [Store] call_ended by remote')
      useCallStore.getState().setCallEndedByRemote()
    })

    socket.on('refresh_call_history', () => {
      useCallStore.getState().loadCallHistory()
    })

    // ICE candidates: server forwards { type:'candidate', candidate:{...} }
    socket.on('webrtc_signal', (signal) => {
      useCallStore.getState().pushRemoteSignal(signal)
    })

    // ─── Admin block notification ────────────────────────────────────────
    socket.on('admin_action', async (data) => {
      console.log('[Store] admin_action received:', data)
      if (data.type === 'blocked') {
        // Show the toast first, then force logout after 3 seconds
        set({ adminToast: { type: 'blocked', message: data.message } })
        setTimeout(async () => {
          try { await authAPI.logout() } catch (_) {}
          localStorage.removeItem('authToken')
          get().disconnectSocket()
          set({ user: null, activeChat: null, chats: [], messages: {}, adminToast: null })
          window.location.href = '/auth'
        }, 3000)
      } else if (data.type === 'unblocked') {
        set({ adminToast: { type: 'unblocked', message: data.message } })
        setTimeout(() => set({ adminToast: null }), 5000)
      }
    })

    // ─── Group read receipts ─────────────────────────────────────────────
    socket.on('group_message_seen_by', ({ userId: readerId, messageId, chatId }) => {
      set(state => {
        const msgs = state.messages[chatId]
        if (!msgs) return state
        const updated = msgs.map(m => {
          if ((m.id === messageId || m._id === messageId) && m.type === 'sent') {
            const prevReadBy = m.readBy || []
            if (prevReadBy.includes(readerId)) return m
            return { ...m, readBy: [...prevReadBy, readerId] }
          }
          return m
        })
        return { messages: { ...state.messages, [chatId]: updated } }
      })
    })

    set({ socket })

    // When the tab becomes visible again, mark the active chat as read
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const state = get()
        if (state.activeChat && state.socket) {
          state.socket.emit('message_read', { chatId: state.activeChat })
          const chat = state.chats?.find(c => c.id === state.activeChat || c._id === state.activeChat)
          if (chat?.isGroup) {
            // Find unread messages? Too complex here, just emit chat read
          }
          chatAPI.markAsRead(state.activeChat).catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Store the listener so we can remove it on disconnect
    set({ _visibilityListener: handleVisibilityChange })
  },

  disconnectSocket: () => {
    const { socket, _visibilityListener } = get()
    if (socket) { socket.disconnect(); set({ socket: null, onlineUsers: [] }) }
    if (_visibilityListener) {
      document.removeEventListener('visibilitychange', _visibilityListener)
      set({ _visibilityListener: null })
    }
  },
}))

export default useStore