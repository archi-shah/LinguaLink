import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Users, Settings, CircleDashed, Bot, Shield, Bell, Phone, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore.js'
import NotificationsPanel from './NotificationsPanel.jsx'
import { notificationAPI } from '../../api/client.js'

export default function Sidebar({ onChatbotOpen }) {
  const { activeSidebar, setActiveSidebar, user, privacyMode, setPrivacyMode, statusData, loadStatuses, adminToast, socket, mobileSidebarOpen, setMobileSidebarOpen } = useStore()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [newStatusCount, setNewStatusCount] = useState(0)
  const [imgError, setImgError] = useState(false)

  // Poll for unread notifications every 30s
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const data = await notificationAPI.getNotifications()
        const items = Array.isArray(data) ? data : []
        setUnreadCount(items.filter(n => !n.isRead).length)
      } catch (err) { /* silent */ }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    
    if (socket) {
      socket.on('new_notification', fetchUnread)
    }

    return () => {
      clearInterval(interval)
      if (socket) socket.off('new_notification', fetchUnread)
    }
  }, [socket])

  // Load statuses on mount
  useEffect(() => { loadStatuses() }, [])

  // Count unviewed statuses from other users
  useEffect(() => {
    if (!statusData || !user) return
    const myId = String(user._id || user.id || '')
    let count = 0
    ;(statusData || []).forEach(group => {
      if (String(group.user?._id || group.user?.id) === myId) return
      ;(group.statuses || []).forEach(s => {
        const viewedBy = (s.viewers || []).map(String)
        if (!viewedBy.includes(myId)) count++
      })
    })
    setNewStatusCount(count)
  }, [statusData, user])

  const handleNavClick = (id) => {
    setMobileSidebarOpen(false) // Close sidebar on mobile after clicking
    if (id === 'admin') { navigate('/admin'); return }
    if (id === 'privacy') { setPrivacyMode(!privacyMode); return }
    if (id === 'notifications') { setNotifOpen(true); return }
    if (id === 'chatbot') { onChatbotOpen?.(); return }
    setActiveSidebar(id)
  }

  const topNav = [
    { id: 'chats',     icon: MessageSquare, title: 'Chats'       },
    { id: 'calls',     icon: Phone,         title: 'Calls'       },
    { id: 'status',    icon: CircleDashed,  title: 'Status'      },
    { id: 'community', icon: Users,         title: 'Communities' },
  ]

  const bottomNav = [
    ...(user?.role === 'admin' ? [{ id: 'admin', icon: Activity, title: 'Admin Panel' }] : []),
    { id: 'notifications', icon: Bell,     title: 'Notifications' },
    { id: 'privacy',       icon: Shield,   title: 'Privacy Mode'  },
    { id: 'chatbot',       icon: Bot,      title: 'LinguaLink AI', special: true },
  ]

  const userInitials = user?.initials || 'DU'
  const userName     = user?.name     || 'Demo User'

  const navButtonStyle = (isActive, isSpecial) => ({
    position: 'relative',
    width: '46px', height: '44px',
    borderRadius: isSpecial ? '50%' : '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
    ...(isSpecial ? {
      background: 'linear-gradient(135deg, #4C74F9 0%, #6366F1 100%)',
      boxShadow: '0 4px 16px rgba(76,116,249,0.45)',
      color: '#fff', border: 'none',
    } : isActive ? {
      background: 'linear-gradient(135deg, rgba(76,116,249,0.25) 0%, rgba(99,102,241,0.2) 100%)',
      color: '#fff',
      border: '1px solid rgba(76,116,249,0.35)',
      boxShadow: '0 4px 16px rgba(76,116,249,0.2)',
    } : {
      background: 'transparent',
      color: 'rgba(255,255,255,0.45)',
      border: '1px solid transparent',
    })
  })

  return (
    <>
      <NotificationsPanel
        isOpen={notifOpen}
        onClose={() => { setNotifOpen(false); setUnreadCount(0) }}
      />

      {/* Admin block / unblock toast — shown to the targeted user */}
      {adminToast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 99999, borderRadius: '16px', padding: '18px 28px',
            background: adminToast.type === 'blocked'
              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
              : 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff', fontFamily: 'Outfit, sans-serif',
            fontSize: '15px', fontWeight: 700,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            maxWidth: '440px', textAlign: 'center', pointerEvents: 'none',
          }}
        >
          {adminToast.type === 'blocked' ? '🚫 ' : '✅ '}
          {adminToast.message}
          {adminToast.type === 'blocked' && (
            <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '8px', fontWeight: 400 }}>
              Signing you out in 3 seconds...
            </div>
          )}
        </motion.div>
      )}

      <motion.aside
        className={`chat-rail app-sidebar ${mobileSidebarOpen ? 'is-open' : ''}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'linear-gradient(180deg, #0F1A2E 0%, #0C1423 100%)',
          width: '68px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '14px 0 18px',
          borderRight: '1px solid rgba(76,116,249,0.15)',
          zIndex: 100,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', right: 0, top: '15%', bottom: '15%', width: '1px', background: 'linear-gradient(180deg, transparent, rgba(76,116,249,0.4), transparent)', pointerEvents: 'none' }} />

        {/* ── Logo ── */}
        <motion.button
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'transparent', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px', boxShadow: 'none', flexShrink: 0 }}
        >
          <img src="/features/logo.PNG" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </motion.button>

        {/* ── Top Nav ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center', paddingInline: '10px' }}>
          {topNav.map(({ id, icon: Icon, title }) => {
            const isActive = activeSidebar === id
            const isStatus = id === 'status'
            return (
              <div key={id} className="has-tooltip" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <motion.button
                  onClick={() => handleNavClick(id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={navButtonStyle(isActive, false)}
                  title={title}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <div style={{ position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%)', width: '3px', height: '20px', borderRadius: '0 3px 3px 0', background: 'linear-gradient(180deg, #4C74F9, #6366F1)', boxShadow: '0 0 8px rgba(76,116,249,0.6)' }} />
                  )}
                  {/* Status dot — only when there are new unseen statuses */}
                  {isStatus && newStatusCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      style={{ position: 'absolute', top: '6px', right: '7px', width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', border: '2px solid #0F1A2E', boxShadow: '0 0 8px rgba(34,197,94,0.8)' }}
                    />
                  )}
                </motion.button>
                <span className="tooltip">{title}</span>
              </div>
            )
          })}
        </div>

        {/* ── Divider ── */}
        <div style={{ width: '28px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '10px 0' }} />

        {/* ── Bottom Nav ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center', paddingInline: '10px' }}>
          {bottomNav.map(({ id, icon: Icon, title, special }) => {
            const isPrivacyActive = id === 'privacy' && privacyMode
            const isActive = id === 'privacy' ? isPrivacyActive : activeSidebar === id
            const isNotif = id === 'notifications'

            return (
              <div key={id} className="has-tooltip" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <motion.button
                  onClick={() => handleNavClick(id)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    ...navButtonStyle(isActive, special),
                    ...(id === 'privacy' && isPrivacyActive ? {
                      background: 'linear-gradient(135deg, rgba(244,63,94,0.25) 0%, rgba(244,63,94,0.15) 100%)',
                      color: '#F43F5E',
                      border: '1px solid rgba(244,63,94,0.3)',
                    } : {}),
                  }}
                  title={title}
                >
                  <Icon size={19} strokeWidth={2} />
                  {/* Notification count badge — only when > 0 */}
                  {isNotif && unreadCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      style={{ position: 'absolute', top: '5px', right: '5px', minWidth: '16px', height: '16px', borderRadius: '8px', background: '#EF4444', border: '2px solid #0F1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff', padding: '0 3px' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.div>
                  )}
                </motion.button>
                <span className="tooltip">{title}</span>
              </div>
            )
          })}

          {/* ── User Avatar ── */}
          <div className="has-tooltip" style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <motion.button
              onClick={() => setActiveSidebar('settings')}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #4C74F9 0%, #6366F1 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, border: '2px solid rgba(255,255,255,0.15)', cursor: 'pointer', boxShadow: '0 2px 12px rgba(76,116,249,0.35)', fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em' }}
              title={userName}
            >
              {user?.profilePic && !imgError ? <img src={user.profilePic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={() => setImgError(true)} /> : userInitials}
            </motion.button>
            <span className="tooltip">{userName}</span>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
