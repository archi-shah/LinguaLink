import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, UserPlus, MessageSquare, Phone, CheckCheck, Loader2, Inbox, UserCheck, UserX } from 'lucide-react'
import { notificationAPI, userAPI } from '../../api/client'
import useStore from '../../store/useStore.js'

const typeConfig = {
  friend_request: { icon: UserPlus,     color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', label: 'Follow Request' },
  follow_accept:  { icon: UserCheck,    color: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'New Follower'   },
  new_message:    { icon: MessageSquare,color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', label: 'New Message'    },
  missed_call:    { icon: Phone,        color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  label: 'Missed Call'    },
}

export default function NotificationsPanel({ isOpen, onClose }) {
  const { fetchContacts, contacts, socket } = useStore()
  const [notifications, setNotifications]   = useState([])
  const [loading, setLoading]               = useState(false)
  const [actionLoading, setActionLoading]   = useState({})

  // Track which request IDs have been handled in this session so they don't
  // revert when the component re-renders (state is non-persistent on reload).
  const handledRef = useRef(new Map()) // Map<notificationId, 'accepted'|'rejected'>

  const contactIds = new Set((contacts || []).map(c => String(c._id || c.id || '')))

  const fetchNotifications = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    try {
      const data = await notificationAPI.getNotifications()
      const list = Array.isArray(data) ? data : []
      // Restore any in-session handled state
      const restored = list.map(n => ({
        ...n,
        actionDone: handledRef.current.get(n._id) || n.actionDone || null,
      }))
      setNotifications(restored)
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      setLoading(false)
    }
  }, [isOpen])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  useEffect(() => {
    if (!socket) return
    const handleNew = () => {
      if (isOpen) fetchNotifications()
    }
    socket.on('new_notification', handleNew)
    return () => socket.off('new_notification', handleNew)
  }, [socket, isOpen, fetchNotifications])

  const markRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n))
    } catch { /* silent */ }
  }

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch { /* silent */ }
  }

  const handleAccept = async (notification) => {
    setActionLoading(prev => ({ ...prev, [notification._id]: 'accepting' }))
    try {
      await userAPI.acceptFollowRequest(notification.referenceId)
      await markRead(notification._id)
      handledRef.current.set(notification._id, 'accepted')
      setNotifications(prev => prev.map(n =>
        n._id === notification._id ? { ...n, actionDone: 'accepted', isRead: true } : n
      ))
      await fetchContacts()
    } catch (err) {
      alert(err.message || 'Failed to accept request.')
    } finally {
      setActionLoading(prev => ({ ...prev, [notification._id]: null }))
    }
  }

  const handleReject = async (notification) => {
    setActionLoading(prev => ({ ...prev, [notification._id]: 'rejecting' }))
    try {
      await userAPI.rejectFollowRequest(notification.referenceId)
      await markRead(notification._id)
      handledRef.current.set(notification._id, 'rejected')
      setNotifications(prev => prev.map(n =>
        n._id === notification._id ? { ...n, actionDone: 'rejected', isRead: true } : n
      ))
    } catch (err) {
      alert(err.message || 'Failed to reject request.')
    } finally {
      setActionLoading(prev => ({ ...prev, [notification._id]: null }))
    }
  }

  // Determine if a friend_request notification is already handled (contact exists)
  const isAlreadyConnected = (n) => {
    if (n.type !== 'friend_request') return false
    // If referenceId matches an existing contact — request was accepted previously
    return contactIds.has(String(n.referenceId))
  }

  const resolveActionDone = (n) => {
    if (n.actionDone) return n.actionDone
    if (isAlreadyConnected(n)) return 'accepted'
    return null
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  const formatTime = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr)) / 1000
    if (diff < 60)    return 'Just now'
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(2px)' }}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            style={{
              position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: '420px',
              zIndex: 50, display: 'flex', flexDirection: 'column',
              background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-medium)',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
            }}
          >
            {/* Header */}
            <div style={{ position: 'relative', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-medium)', padding: '20px 24px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #7C3AED, #6366F1, #3B82F6)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid rgba(124,58,237,0.25)' }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>{unreadCount} unread</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} title="Mark all as read"
                      style={{ padding: '8px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                      <CheckCheck size={16} /> All read
                    </button>
                  )}
                  <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-muted)' }}>
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px', opacity: 0.5 }}>
                  <Inbox size={48} color="var(--text-muted)" />
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>No notifications yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {notifications.map(n => {
                    const cfg = typeConfig[n.type] || typeConfig.new_message
                    const Icon = cfg.icon
                    const isActing = actionLoading[n._id]
                    const actionDone = resolveActionDone(n)
                    const showActions = n.type === 'friend_request' && !actionDone

                    return (
                      <motion.div
                        key={n._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => !n.isRead && markRead(n._id)}
                        style={{
                          display: 'flex', gap: '12px', alignItems: 'flex-start',
                          padding: '14px 16px', borderRadius: '14px', cursor: 'pointer',
                          background: n.isRead ? 'transparent' : 'rgba(124,58,237,0.05)',
                          border: `1px solid ${n.isRead ? 'var(--border-light)' : 'rgba(124,58,237,0.2)'}`,
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                      >
                        {!n.isRead && (
                          <div style={{ position: 'absolute', top: '16px', right: '16px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                        )}
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} color={cfg.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>{cfg.label}</p>
                          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: n.isRead ? 400 : 600, lineHeight: 1.4 }}>{n.content}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(n.createdAt)}</p>

                          {/* ── Accept / Decline buttons (only if request is PENDING) ── */}
                          {showActions && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAccept(n) }}
                                disabled={!!isActing}
                                style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'opacity 0.2s', opacity: isActing ? 0.7 : 1 }}
                              >
                                {isActing === 'accepting' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
                                Accept
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReject(n) }}
                                disabled={!!isActing}
                                style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'opacity 0.2s', opacity: isActing ? 0.7 : 1 }}
                              >
                                {isActing === 'rejecting' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={13} />}
                                Decline
                              </button>
                            </div>
                          )}

                          {/* ── Status chip after action ── */}
                          {actionDone && (
                            <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '20px',
                              background: actionDone === 'accepted' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                              border: `1px solid ${actionDone === 'accepted' ? 'rgba(16,185,129,0.25)' : 'rgba(107,114,128,0.2)'}` }}>
                              {actionDone === 'accepted'
                                ? <><UserCheck size={12} color="#10B981" /><span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>Connected</span></>
                                : <><UserX size={12} color="var(--text-muted)" /><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Declined</span></>
                              }
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
