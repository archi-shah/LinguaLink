import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, UserPlus, Globe, MessageSquare, Clock, Loader2, Users, ArrowRight } from 'lucide-react'
import useStore from '../../store/useStore.js'
import { userAPI } from '../../api/client.js'

export default function NewChatModal({ isOpen, onClose }) {
  const { searchUsers, createChat, contacts = [], fetchContacts } = useStore()
  const [tab, setTab] = useState('people') // 'people' | 'contacts'
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [followStatus, setFollowStatus] = useState({}) // userId -> 'pending' | 'sent'
  const [actionLoading, setActionLoading] = useState({})

  // Build a Set of mutual contact IDs for O(1) lookup
  const mutualIds = new Set((contacts || []).map(c => String(c._id || c.id)))

  const loadData = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    try {
      const [results, reqData] = await Promise.all([
        searchUsers(search, 20),
        userAPI.getFollowRequests(),
      ])
      setUsers(results || [])
      // Map sent pending requests
      const statusMap = {}
      ;(reqData.sent || []).forEach(r => {
        statusMap[String(r.receiver._id || r.receiver)] = 'pending'
      })
      setFollowStatus(statusMap)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }, [isOpen, search, searchUsers])

  useEffect(() => {
    const id = setTimeout(loadData, 300)
    return () => clearTimeout(id)
  }, [loadData])

  // Refresh contacts when modal opens
  useEffect(() => {
    if (isOpen) fetchContacts?.()
  }, [isOpen, fetchContacts])

  const handleFollow = async (e, userId) => {
    e.stopPropagation()
    setActionLoading(p => ({ ...p, [userId]: 'follow' }))
    try {
      await userAPI.sendFollowRequest(userId)
      setFollowStatus(p => ({ ...p, [userId]: 'pending' }))
    } catch (err) {
      alert(err.message || 'Could not send follow request. Please try again.')
    } finally {
      setActionLoading(p => ({ ...p, [userId]: null }))
    }
  }

  const handleChat = async (e, userId) => {
    e.stopPropagation()
    setActionLoading(p => ({ ...p, [userId]: 'chat' }))
    try {
      await createChat(userId)
      onClose()
    } catch (err) {
      alert(err.message || 'Could not start chat.')
    } finally {
      setActionLoading(p => ({ ...p, [userId]: null }))
    }
  }

  const getState = (userId) => {
    const id = String(userId)
    if (mutualIds.has(id)) return 'mutual'
    if (followStatus[id] === 'pending') return 'pending'
    return 'follow'
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          style={{
            width: '100%', maxWidth: '480px', maxHeight: '82vh',
            background: 'var(--bg-surface)',
            borderRadius: '24px',
            border: '1px solid var(--border-light)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 8px 32px rgba(124,58,237,0.12)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Top accent stripe */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #7C3AED, #6366F1, #3B82F6)', borderRadius: '24px 24px 0 0' }} />

          {/* Header */}
          <div style={{ padding: '26px 24px 0', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Globe size={22} color="var(--primary)" />
                  Start a Conversation
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Follow users first — once both accept, you can chat.
                </p>
              </div>
              <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--bg-hover)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-hover)', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
              {[
                { id: 'people', label: 'Find People', icon: Globe },
                { id: 'contacts', label: `My Contacts (${contacts.length})`, icon: Users },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '9px', border: 'none',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transition: 'all 0.15s ease',
                    background: tab === t.id ? 'var(--bg-surface)' : 'transparent',
                    color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search — only for people tab */}
            {tab === 'people' && (
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                  style={{ width: '100%', padding: '11px 16px 11px 40px', background: 'var(--bg-surface)', border: '1.5px solid var(--border-light)', borderRadius: '12px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-light)' }}
                />
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: 'var(--bg-surface)' }}>

            {/* CONTACTS TAB */}
            {tab === 'contacts' && (
              contacts.length === 0 ? (
                <EmptyState
                  icon={<Users size={36} />}
                  title="No mutual contacts yet"
                  desc="Send follow requests and wait for users to accept. Once mutual, they'll appear here."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {contacts.map(c => (
                    <motion.div
                      key={c._id || c.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '16px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      <Avatar user={c} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.identifier}</p>
                      </div>
                      <button
                        onClick={e => handleChat(e, c._id || c.id)}
                        disabled={!!actionLoading[c._id || c.id]}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'opacity 0.15s', opacity: actionLoading[c._id || c.id] ? 0.6 : 1 }}
                      >
                        {actionLoading[c._id || c.id] === 'chat' ? <Loader2 size={14} className="spin" /> : <MessageSquare size={14} />}
                        Chat
                      </button>
                    </motion.div>
                  ))}
                </div>
              )
            )}

            {/* PEOPLE TAB */}
            {tab === 'people' && (
              loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px', color: 'var(--text-muted)' }}>
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>Searching network...</p>
                </div>
              ) : users.length === 0 ? (
                <EmptyState
                  icon={<Globe size={36} />}
                  title="No users found"
                  desc={search ? `No results for "${search}"` : "Start typing to search for users worldwide."}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {users.filter(u => String(u._id || u.id) !== String(useStore.getState().user?._id || useStore.getState().user?.id)).map(u => {
                    const uid = String(u._id)
                    const state = getState(uid)
                    const isLoading = actionLoading[uid]

                    return (
                      <motion.div
                        key={uid}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '16px', background: 'var(--bg-panel)', border: `1px solid ${state === 'mutual' ? 'rgba(124,58,237,0.2)' : 'var(--border-light)'}`, transition: 'all 0.15s' }}
                      >
                        <Avatar user={u} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                            {u.language && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', background: 'rgba(124,58,237,0.1)', borderRadius: '6px', color: 'var(--primary)', flexShrink: 0 }}>{u.language.toUpperCase()}</span>}
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.identifier}</p>
                          {state === 'mutual' && (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#10B981' }}>✓ Mutual follower</span>
                          )}
                        </div>

                        {/* Action Button */}
                        {state === 'mutual' ? (
                          <button
                            onClick={e => handleChat(e, uid)}
                            disabled={!!isLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                          >
                            {isLoading === 'chat' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={13} />}
                            Chat
                          </button>
                        ) : state === 'pending' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid var(--border-medium)', background: 'transparent', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            <Clock size={13} />
                            Pending
                          </div>
                        ) : u.identifier === 'as.archishah@gmail.com' || u.role === 'admin' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Admin
                          </div>
                        ) : (
                          <button
                            onClick={e => handleFollow(e, uid)}
                            disabled={!!isLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid var(--primary)', background: 'rgba(124,58,237,0.08)', color: 'var(--primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                          >
                            {isLoading === 'follow' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={13} />}
                            Follow
                          </button>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )
            )}
          </div>

          {/* Footer hint */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Follow → Accept → Chat</span>
            <ArrowRight size={12} color="var(--text-muted)" />
            <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>Accept requests via Notifications 🔔</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function Avatar({ user }) {
  return (
    <div style={{
      width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
      background: user.profilePic ? 'transparent' : `hsl(${Math.abs(simpleHash(String(user._id || user.id))) % 360}, 65%, 55%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '16px', fontWeight: 800, color: '#fff',
      boxShadow: '0 2px 10px rgba(0,0,0,0.15)', overflow: 'hidden', position: 'relative'
    }}>
      {user.profilePic ? (
        <img src={user.profilePic} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        user.initials || (user.name || 'U').slice(0, 2).toUpperCase()
      )}
      {/* Online dot */}
      {user.onlineStatus === 'online' && (
        <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E', border: '2px solid var(--bg-panel)' }} />
      )}
    </div>
  )
}

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: '12px', opacity: 0.6 }}>
      <div style={{ color: 'var(--text-muted)' }}>{icon}</div>
      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>{title}</p>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '280px', lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}

function simpleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return h
}
