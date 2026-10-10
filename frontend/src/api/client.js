// api/client.js — Frontend ↔ Backend connector
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const client = axios.create({
  baseURL: API_BASE_URL,
})

// ── LOGIC BLOCK: REQUEST INTERCEPTOR ──
// Before any API request leaves the frontend, this interceptor runs.
// It acts like a passport check: it grabs the 'authToken' from local storage
// and attaches it to the request header so the backend knows who we are.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: handle errors globally ──
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.response?.data?.message !== 'Invalid credentials' &&
      error.response?.data?.message !== 'Incorrect password. Please try again.'
    ) {
      localStorage.removeItem('authToken')
      // Redirect admin users back to the admin portal, not the public login
      const isAdminPath = window.location.pathname.startsWith('/admin')
      window.location.href = isAdminPath ? '/admin' : '/auth'
    }
    const msg =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0] ||
      error.message ||
      'An error occurred'
    const err = new Error(msg)
    err.response = error.response
    return Promise.reject(err)
  }
)

// ── AUTH API ──
export const authAPI = {
  register: (name, identifier, password, confirmPassword, language) =>
    client.post('/auth/register', { name, identifier, password, confirmPassword, language }),
  login: (identifier, password) =>
    client.post('/auth/login', { identifier, password }),
  googleLogin: (token) =>
    client.post('/auth/google', { token }),
  sendOTP: (identifier) =>
    client.post('/auth/send-otp', { identifier }),
  verifyOTP: (identifier, otp) =>
    client.post('/auth/verify-otp', { identifier, otp }),
  logout: () =>
    client.post('/auth/logout'),
  getCurrentUser: () =>
    client.get('/auth/me'),
  updateProfile: (data) =>
    client.patch('/auth/profile', data),
  updatePreferences: (preferences) =>
    client.patch('/auth/preferences', preferences),
  forgotPassword: (identifier) =>
    client.post('/auth/forgot-password', { identifier }),
  resetPassword: (identifier, otp, newPassword) =>
    client.post('/auth/reset-password', { identifier, otp, newPassword }),
  enable2fa: (code) =>
    client.post('/auth/2fa/enable', { code }),
  disable2fa: (code) =>
    client.post('/auth/2fa/disable', { code }),
}

// ── CHAT API ──
export const chatAPI = {
  backupChats: () =>
    client.get('/chats/backup'),
  getChats: () =>
    client.get('/chats'),
  createChat: (participantIds, isGroup = false, chatName = '', isBroadcast = false) =>
    client.post('/chats', { participantIds, isGroup, chatName, isBroadcast }),
  getMessages: (chatId, page = 1, limit = 50) =>
    client.get(`/chats/${chatId}/messages?page=${page}&limit=${limit}`),
  sendMessage: (chatId, text, language = 'en', mediaUrl = '', mediaType = 'text', metadata = {}) =>
    client.post(`/chats/${chatId}/messages`, { text, language, mediaUrl, mediaType, metadata }),
  markAsRead: (chatId) =>
    client.patch(`/chats/${chatId}/messages/read`),
  editMessage: (messageId, text) =>
    client.patch(`/chats/messages/${messageId}`, { text }),
  deleteMessage: (messageId, type) =>
    client.delete(`/chats/messages/${messageId}`, { data: { type } }),
  reportMessage: (messageId, reason) =>
    client.post(`/chats/messages/${messageId}/report`, { reason }),
  archiveChat: (chatId) =>
    client.post(`/chats/${chatId}/archive`),
  togglePinChat: (chatId) =>
    client.post(`/chats/${chatId}/pin`),
  toggleMute: (chatId) =>
    client.post(`/chats/${chatId}/mute`),
  toggleUnread: (chatId) =>
    client.post(`/chats/${chatId}/unread`),
  toggleFavourite: (chatId) =>
    client.post(`/chats/${chatId}/favourite`),
  toggleList: (chatId) =>
    client.post(`/chats/${chatId}/list`),
  clearChat: (chatId) =>
    client.post(`/chats/${chatId}/clear`),
  exitGroup: (chatId) =>
    client.post(`/chats/${chatId}/exit`),
  addReaction: (messageId, emoji) =>
    client.post(`/chats/messages/${messageId}/reaction`, { emoji }),
  toggleStar: (messageId) =>
    client.post(`/chats/messages/${messageId}/star`),
  togglePin: (messageId) =>
    client.post(`/chats/messages/${messageId}/pin`),
  votePoll: (messageId, optionIndex) =>
    client.post(`/chats/messages/${messageId}/vote`, { optionIndex }),
  uploadFileMessage: async (chatId, formData) => {
    const token = localStorage.getItem('authToken')
    const res = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/file`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || `Upload failed (${res.status})`)
    return data
  },
  uploadAudioMessage: async (chatId, formData) => {
    const token = localStorage.getItem('authToken')
    const res = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/audio`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || `Upload failed (${res.status})`)
    return data
  },
  transcribeMessage: (messageId, targetLang) =>
    client.post(`/chats/messages/${messageId}/transcribe`, { targetLang }),
}

// ── USER API ──
export const userAPI = {
  searchUsers: (search, limit = 10) =>
    client.get(`/users/users?search=${encodeURIComponent(search)}&limit=${limit}`),
  getUserById: (userId) =>
    client.get(`/users/users/${userId}`),
  sendFollowRequest: (targetUserId) =>
    client.post('/users/follow', { targetUserId }),
  acceptFollowRequest: (requestId) =>
    client.post('/users/follow/accept', { requestId }),
  rejectFollowRequest: (requestId) =>
    client.post('/users/follow/reject', { requestId }),
  getFollowRequests: () =>
    client.get('/users/follow-requests'),
  removeContact: (contactId) =>
    client.post('/users/contacts/remove', { contactId }),
  getContacts: () =>
    client.get('/users/contacts'),
  blockUser: (blockedUserId) =>
    client.post('/users/block', { blockedUserId }),
  unblockUser: (blockedUserId) =>
    client.post('/users/unblock', { blockedUserId }),
  updateStatus: (status) =>
    client.patch('/users/status', { status }),
  matchContacts: (emails, phones) =>
    client.post('/users/match-contacts', { emails, phones }),
  reportUser: (reportedUserId, reason, details = '') =>
    client.post('/users/report', { reportedUserId, reason, details }),
}

// ── STATUS API ──
export const statusAPI = {
  createStatus: (content, mediaUrl, mediaType = 'text', backgroundColor) =>
    client.post('/status', { content, mediaUrl, mediaType, backgroundColor }),
  getStatuses: () =>
    client.get('/status'),
  viewStatus: (statusId) =>
    client.post(`/status/${statusId}/view`),
  deleteStatus: (statusId) =>
    client.delete(`/status/${statusId}`),
  getUserStatuses: (userId) =>
    client.get(`/status/user/${userId}`),
  addStatusView: (statusId) =>
    client.post(`/status/${statusId}/view`),
  uploadImage: async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`${API_BASE_URL}/status/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      body: fd
    });
    if (!res.ok) throw new Error('Failed to upload image');
    return res.json();
  },
}

// ── AI API ──
export const aiAPI = {
  chat: (history, message) => 
    client.post('/ai/chat', { history, message }),
  translate: (text, targetLanguage) =>
    client.post('/ai/translate', { text, targetLanguage }),
}

// ── NOTIFICATION API ──
export const notificationAPI = {
  getNotifications: () =>
    client.get('/notifications'),
  markAsRead: (id) =>
    client.patch(`/notifications/${id}/read`),
  markAllAsRead: () =>
    client.patch('/notifications/read-all'),
}

// ── COMMUNITY API ──
export const communityAPI = {
  getAll:     ()           => client.get('/communities'),
  getOne:     (id)         => client.get(`/communities/${id}`),
  create:     (data)       => client.post('/communities', data),
  join:       (id)         => client.post(`/communities/${id}/join`),
  leave:      (id)         => client.post(`/communities/${id}/leave`),
  addChannel: (id, data)   => client.post(`/communities/${id}/channels`, data),
}

// ── CALL LOG API ──
export const callAPI = {
  getHistory: () =>
    client.get('/calls'),
  createLog: (receiverId, type, status, duration) =>
    client.post('/calls', { receiverId, type, status, duration }),
  deleteLog: (id) =>
    client.delete(`/calls/${id}`),
  clearHistory: () =>
    client.delete('/calls'),
}

// ── ADMIN API ──
export const adminAPI = {
  // Stats / Overview
  getStats: () => client.get('/admin/stats'),
  // Users
  getUsers: (params = {}) => client.get('/admin/users', { params }),
  getUser: (id) => client.get(`/admin/users/${id}`),
  getUserProfile: (id) => client.get(`/admin/users/${id}/profile`),
  toggleBan: (id) => client.put(`/admin/users/${id}/ban`),
  changeRole: (id, role) => client.put(`/admin/users/${id}/role`, { role }),
  editUser: (id, data) => client.put(`/admin/users/${id}`, data),
  deleteUser: (id) => client.delete(`/admin/users/${id}`),
  // Chat Logs
  getChatLogs: (params = {}) => client.get('/admin/chatlogs', { params }),
  getChatContext: (chatId) => client.get(`/admin/chatlogs/context/${chatId}`),
  deleteMessage: (id) => client.delete(`/admin/chatlogs/${id}`),
  // Activity
  getActivity: () => client.get('/admin/activity'),
  sendBroadcast: (message, severity) => client.post('/admin/broadcast', { message, severity }),
  // Reports
  getReports: (from, to) => client.get('/admin/reports', { params: { from, to } }),
  // Config
  getConfig: () => client.get('/admin/config'),
  updateConfig: (section, updates) => client.put('/admin/config', { section, updates }),
}

export default client
