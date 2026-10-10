import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Phone, Video, MessageSquare, Globe, Clock, Info,
  Bell, BellOff, ArrowLeft, Users, Crown,
  LogOut, Ban, Search, Wifi, WifiOff, CheckCheck, Check,
  Flag, ChevronRight, ShieldAlert, AlertTriangle, Shield,
  Trash2, UserMinus, Copy, Share2
} from 'lucide-react'
import useStore from '../../store/useStore'
import { userAPI } from '../../api/client'

const SERVER_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toFullUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http') || path.startsWith('data:')) return path
  return `${SERVER_BASE}${path}`
}

const LANGUAGE_LABELS = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
  ja: 'Japanese', zh: 'Chinese', ar: 'Arabic', de: 'German',
  it: 'Italian', pt: 'Portuguese', ru: 'Russian', ko: 'Korean',
  gu: 'Gujarati', ta: 'Tamil', te: 'Telugu', mr: 'Marathi',
  multi: '30+ Languages',
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam', icon: '📧', desc: 'Sending unwanted messages or promotions' },
  { id: 'harassment', label: 'Harassment', icon: '😡', desc: 'Bullying, threatening, or abusive behavior' },
  { id: 'fake', label: 'Fake Account', icon: '🎭', desc: 'Pretending to be someone else' },
  { id: 'inappropriate', label: 'Inappropriate Content', icon: '⚠️', desc: 'Offensive or adult content' },
  { id: 'violence', label: 'Violence / Threats', icon: '🚨', desc: 'Threats of harm or dangerous content' },
  { id: 'other', label: 'Something Else', icon: '🔍', desc: 'Other reason not listed above' },
]

// ── Member Avatar ──────────────────────────────────────────────────────────────
function MemberAvatar({ member, size = 44, isOnline }) {
  const [imgError, setImgError] = useState(false)
  const bgColor = `hsl(${Math.abs(member.name?.charCodeAt(0) || 0) % 360}, 65%, 52%)`

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: (member.profilePic && !imgError) ? 'transparent' : bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.34, fontWeight: 800, color: '#fff',
        overflow: 'hidden',
        border: isOnline ? '2.5px solid #22C55E' : '2.5px solid transparent',
        transition: 'border-color 0.3s',
      }}>
        {(member.profilePic && !imgError)
          ? <img src={toFullUrl(member.profilePic)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
          : (member.initials || member.name?.substring(0, 2).toUpperCase() || 'U')
        }
      </div>
      {isOnline && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 11, height: 11, borderRadius: '50%',
          background: '#22C55E', border: '2px solid var(--bg-surface)',
          boxShadow: '0 0 6px rgba(34,197,94,0.6)',
        }} />
      )}
    </div>
  )
}

// ── Toast Component ──
function Toast({ message, type = 'success', onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      style={{
        position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999,
        background: type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#22C55E',
        color: '#fff', padding: '10px 20px', borderRadius: '99px',
        fontSize: '13px', fontWeight: 700,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', gap: '8px',
        whiteSpace: 'nowrap',
      }}
    >
      {type === 'error' ? '✗' : '✓'} {message}
    </motion.div>
  )
}

// ── Report Modal ──
function ReportModal({ chat, user, onClose, onSuccess }) {
  const [step, setStep] = useState('reason')   // 'reason' | 'details' | 'done'
  const [selectedReason, setReason] = useState(null)
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!selectedReason) return
    setLoading(true)
    try {
      const targetId = chat.otherId || chat._id || chat.id;
      if (!targetId) throw new Error("User ID not found");
      await userAPI.reportUser(targetId, selectedReason.id, details)
      setStep('done')
      setTimeout(() => { onClose(); onSuccess?.() }, 2200)
    } catch (err) {
      setLoading(false)
      if (err.message) alert(`Report failed: ${err.message}`)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      />
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{
          position: 'relative',
          zIndex: 951, width: '92%', maxWidth: '420px',
          background: 'var(--bg-surface)',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
          border: '1px solid var(--border-medium)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient bar */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #EF4444, #F59E0B, #EF4444)', flexShrink: 0 }} />

        <AnimatePresence mode="wait">
          {step === 'done' ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ padding: '40px 24px', textAlign: 'center', overflowY: 'auto', flex: 1, minHeight: 0 }}
            >
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '32px',
              }}>✓</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Report Submitted
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Thank you for keeping LinguaLink safe.<br />Our team will review your report shortly.
              </p>
            </motion.div>
          ) : step === 'details' ? (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <button
                  onClick={() => setStep('reason')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex' }}
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Add Details</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{selectedReason?.label}</p>
                </div>
              </div>

              <div style={{
                padding: '12px 14px', borderRadius: '12px',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '20px' }}>{selectedReason?.icon}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{selectedReason?.desc}</span>
              </div>

              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Add more context (optional)..."
                rows={4}
                style={{
                  width: '100%', resize: 'none', boxSizing: 'border-box',
                  background: 'var(--bg-hover)', border: '1px solid var(--border-medium)',
                  borderRadius: '12px', padding: '12px 14px',
                  fontSize: '14px', color: 'var(--text-primary)',
                  fontFamily: 'inherit', outline: 'none', lineHeight: 1.6,
                }}
              />
              <p style={{ margin: '6px 0 20px', fontSize: '11px', color: 'var(--text-muted)' }}>
                {details.length}/500 characters
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    border: '1px solid var(--border-medium)', background: 'transparent',
                    color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  }}
                >Cancel</button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    flex: 2, padding: '12px', borderRadius: '12px',
                    border: 'none', background: loading ? 'var(--border-medium)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                    color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <Flag size={15} />
                  {loading ? 'Submitting...' : 'Submit Report'}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="reason" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ShieldAlert size={18} color="#EF4444" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Report {chat.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Select a reason below</p>
                  </div>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', borderRadius: '8px' }}>
                  <X size={18} />
                </button>
              </div>

              <p style={{ margin: '16px 0 12px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                What's the issue?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                {REPORT_REASONS.map(r => (
                  <motion.button
                    key={r.id}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setReason(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: '12px', textAlign: 'left',
                      background: selectedReason?.id === r.id ? 'rgba(239,68,68,0.07)' : 'var(--bg-hover)',
                      border: `1.5px solid ${selectedReason?.id === r.id ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
                      cursor: 'pointer', width: '100%', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{r.desc}</div>
                    </div>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${selectedReason?.id === r.id ? '#EF4444' : 'var(--border-medium)'}`,
                      background: selectedReason?.id === r.id ? '#EF4444' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {selectedReason?.id === r.id && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: selectedReason ? 1.02 : 1 }}
                whileTap={{ scale: selectedReason ? 0.98 : 1 }}
                onClick={() => selectedReason && setStep('details')}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px',
                  border: 'none',
                  background: selectedReason ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'var(--border-medium)',
                  color: selectedReason ? '#fff' : 'var(--text-muted)',
                  fontSize: '14px', fontWeight: 700, cursor: selectedReason ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                Continue <ChevronRight size={16} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function UserProfilePanel({ chat, user, onClose, onCall, onVideoCall }) {
  const { onlineUsers, blockUser, unblockUser, exitGroup, messages } = useStore()
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(
    () => user?.blockedUsers?.some(id => String(id) === String(chat?.otherId)) ?? false
  )
  const [memberSearch, setMemberSearch] = useState('')
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [imgError, setImgError] = useState(false)

  if (!chat) return null

  const isGroup = chat.isGroup
  const myId = String(user?.id || user?._id || '')
  const langLabel = LANGUAGE_LABELS[chat.lang?.toLowerCase()] || chat.lang || 'English'

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Last message per member ─────────────────────────────────────────────────
  const chatMsgs = messages?.[chat.id || chat._id] || []
  const lastMsgByMember = useMemo(() => {
    const map = {}
      ;[...chatMsgs].reverse().forEach(msg => {
        const sid = String(msg.senderId?._id || msg.senderId || '')
        if (sid && !map[sid]) map[sid] = msg
      })
    return map
  }, [chatMsgs])

  // ── Sorted members ──────────────────────────────────────────────────────────
  const sortedMembers = useMemo(() => {
    if (!chat.members) return []
    return [...chat.members].sort((a, b) => {
      const aId = String(a._id || a.id), bId = String(b._id || b.id)
      const aAdmin = chat.admins?.includes(aId) ? 1 : 0
      const bAdmin = chat.admins?.includes(bId) ? 1 : 0
      const aOnline = (onlineUsers.includes(aId) || aId === myId) ? 1 : 0
      const bOnline = (onlineUsers.includes(bId) || bId === myId) ? 1 : 0
      if (bAdmin !== aAdmin) return bAdmin - aAdmin
      if (bOnline !== aOnline) return bOnline - aOnline
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [chat.members, chat.admins, onlineUsers, myId])

  const filteredMembers = useMemo(() =>
    sortedMembers.filter(m =>
      !memberSearch || m.name?.toLowerCase().includes(memberSearch.toLowerCase())
    ), [sortedMembers, memberSearch])

  const onlineCount = chat.members?.filter(m => {
    const id = String(m._id || m.id)
    return onlineUsers.includes(id) || id === myId
  }).length || 0
  const offlineCount = (chat.members?.length || 0) - onlineCount

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleExitGroup = async () => {
    setExiting(true)
    try { await exitGroup(chat.id || chat._id); onClose() }
    catch (e) { console.error(e) }
    finally { setExiting(false); setShowExitConfirm(false) }
  }

  const handleToggleBlock = async () => {
    setBlockLoading(true)
    try {
      if (blocked) {
        await unblockUser(chat.otherId)
        setBlocked(false)
        showToast(`${chat.name} unblocked`)
      } else {
        await blockUser(chat.otherId)
        setBlocked(true)
        showToast(`${chat.name} blocked`, 'warning')
      }
    } catch { showToast('Action failed. Try again.', 'error') }
    finally { setBlockLoading(false); setShowBlockConfirm(false) }
  }

  const formattedJoined = (() => {
    const m = chat.members?.find(m => m._id === chat.otherId)
    return m?.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null
  })()

  return (
    <>
      {/* Backdrop — click anywhere outside to close */}
      <motion.div
        key="profile-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
      />

      {/* Drawer */}
      <motion.div
        key="profile-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 240 }}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '360px', maxWidth: '100vw', zIndex: 901,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-medium)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* ── Fixed Header ── */}
          <div style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-light)',
            background: 'var(--bg-panel)',
            position: 'relative',
          }}>
            {/* Gradient accent */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #7C3AED, #6366F1, #3B82F6)' }} />
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '6px', borderRadius: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <ArrowLeft size={20} />
            </button>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', flex: 1 }}>
              {isGroup ? 'Group Info' : 'Contact Info'}
            </h3>
          </div>

          {/* ── Scrollable Body — takes ALL remaining space ── */}
          <div style={{
            flex: 1,
            minHeight: 0,          /* required for flex child to scroll */
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border-medium) transparent',
          }}>

            {/* ── Hero: Avatar + Name + Status ── */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '28px 20px 20px', textAlign: 'center',
              background: 'linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-surface) 100%)',
              borderBottom: '1px solid var(--border-light)',
            }}>
              {/* Avatar */}
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <div style={{
                  width: '90px', height: '90px', borderRadius: '50%',
                  background: (chat.profilePic && !imgError) ? 'transparent' : (chat.color || 'linear-gradient(135deg, #7C3AED, #6366F1)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isGroup ? '32px' : '28px', fontWeight: 700, color: '#fff',
                  boxShadow: '0 6px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
                  border: '3px solid var(--bg-panel)',
                }}>
                  {(chat.profilePic && !imgError)
                    ? <img src={toFullUrl(chat.profilePic)} alt={chat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
                    : (isGroup ? <Users size={36} color="#fff" /> : chat.initials)
                  }
                </div>
                {!isGroup && (
                  <div style={{
                    position: 'absolute', bottom: '3px', right: '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: chat.online ? '#22C55E' : 'var(--border-strong)',
                    border: '3px solid var(--bg-panel)',
                    boxShadow: chat.online ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
                    transition: 'all 0.3s',
                  }} />
                )}
              </div>

              {/* Name */}
              <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                {chat.name}
              </h2>

              {/* Status badge */}
              {isGroup ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.1)', padding: '3px 10px', borderRadius: '999px' }}>
                    <Wifi size={11} /> {onlineCount} online
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '3px 10px', borderRadius: '999px' }}>
                    <WifiOff size={11} /> {offlineCount} offline
                  </span>
                </div>
              ) : (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  margin: '4px 0 14px',
                  fontSize: '12px', fontWeight: 700,
                  color: chat.online ? '#22C55E' : 'var(--text-muted)',
                  background: chat.online ? 'rgba(34,197,94,0.1)' : 'var(--bg-hover)',
                  padding: '3px 12px', borderRadius: '999px',
                }}>
                  <div style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: chat.online ? '#22C55E' : 'var(--border-strong)',
                    boxShadow: chat.online ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
                  }} />
                  {chat.online ? 'Online' : 'Offline'}
                </div>
              )}

              {/* Action buttons */}
              {!isGroup && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { icon: Phone, label: 'Audio', action: onCall, color: '#7C3AED' },
                    { icon: Video, label: 'Video', action: onVideoCall, color: '#7C3AED' },
                    { icon: MessageSquare, label: 'Message', action: onClose, color: '#7C3AED' },
                  ].map(({ icon: Icon, label, action, color }) => (
                    <motion.button
                      key={label}
                      whileHover={{ scale: 1.06, y: -2 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={action}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                        padding: '10px 16px', borderRadius: '14px',
                        background: 'var(--bg-hover)', border: '1px solid var(--border-light)',
                        cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700,
                        transition: 'all 0.2s',
                      }}
                    >
                      <Icon size={17} color={color} />
                      {label}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* ── About ── */}
            {!isGroup && (
              <Section label="About">
                <InfoRow icon={<Info size={14} color="var(--text-muted)" />}>
                  {chat.bio || 'Hey there! I am using LinguaLink.'}
                </InfoRow>
              </Section>
            )}

            {/* ── Language ── */}
            <Section label={isGroup ? 'Translation Mode' : 'Preferred Language'}>
              <InfoRow icon={<Globe size={14} color="var(--text-muted)" />}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{langLabel}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Messages auto-translate to this language</div>
                </div>
              </InfoRow>
            </Section>

            {/* ── Joined date ── */}
            {!isGroup && formattedJoined && (
              <Section>
                <InfoRow icon={<Clock size={14} color="var(--text-muted)" />}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Joined LinguaLink in <strong style={{ color: 'var(--text-secondary)' }}>{formattedJoined}</strong>
                  </span>
                </InfoRow>
              </Section>
            )}

            {/* ── Settings ── */}
            <Section label="Settings">
              {/* Mute toggle */}
              <button
                onClick={() => setMuted(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '12px 18px', borderRadius: '10px',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {muted ? <BellOff size={15} color="var(--text-muted)" /> : <Bell size={15} color="var(--text-muted)" />}
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {muted ? 'Unmute notifications' : 'Mute notifications'}
                  </span>
                </div>
                {/* Toggle pill */}
                <div style={{
                  width: '42px', height: '22px', borderRadius: '11px',
                  background: muted ? 'var(--border-medium)' : 'var(--primary)',
                  position: 'relative', transition: 'background 0.25s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: '3px', left: muted ? '3px' : '21px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: '#fff', transition: 'left 0.25s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </button>
            </Section>

            {/* ══════════════════════════════════
              GROUP MEMBERS
          ══════════════════════════════════ */}
            {isGroup && (
              <Section label={`${chat.members?.length || 0} Members`}>
                {/* Search bar */}
                {(chat.members?.length || 0) > 4 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--bg-hover)', borderRadius: '10px',
                    border: '1px solid var(--border-light)', padding: '0 12px',
                    margin: '0 18px 8px',
                  }}>
                    <Search size={13} color="var(--text-muted)" />
                    <input
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Search members..."
                      style={{
                        border: 'none', outline: 'none', background: 'transparent',
                        flex: 1, fontSize: '13px', color: 'var(--text-primary)', padding: '9px 4px',
                      }}
                    />
                  </div>
                )}

                {/* Online / offline chips */}
                <div style={{ display: 'flex', gap: '6px', padding: '4px 18px 8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '999px' }}>
                    {onlineCount} online
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '999px' }}>
                    {offlineCount} offline
                  </span>
                </div>

                {/* Member rows */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredMembers.map((m, idx) => {
                    const mId = String(m._id || m.id)
                    const isAdmin = chat.admins?.includes(mId)
                    const isMe = mId === myId
                    const isOnline = onlineUsers.includes(mId) || isMe
                    const lastMsg = lastMsgByMember[mId]
                    const prevIsAdmin = idx > 0 && chat.admins?.includes(String(filteredMembers[idx - 1]?._id || filteredMembers[idx - 1]?.id))
                    const showDivider = idx > 0 && isAdmin !== prevIsAdmin

                    return (
                      <React.Fragment key={mId}>
                        {showDivider && <div style={{ margin: '4px 18px', height: '1px', background: 'var(--border-light)' }} />}
                        <motion.div
                          whileHover={{ background: 'var(--bg-hover)' }}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', cursor: 'default', transition: 'background 0.15s' }}
                        >
                          <MemberAvatar member={m} isOnline={isOnline} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.name || 'Unknown User'}
                              </span>
                              {m.role === 'admin' && <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Admin</span>}
                              {isMe && <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 500 }}>(You)</span>}
                              {isAdmin && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                                  fontSize: '9.5px', fontWeight: 800,
                                  background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                                  color: '#fff', padding: '1.5px 6px', borderRadius: '5px', flexShrink: 0,
                                }}>
                                  <Crown size={8} /> Admin
                                </span>
                              )}
                            </div>
                            {lastMsg ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isMe && (lastMsg.status === 'read' ? <CheckCheck size={11} color="#00E5FF" /> : <Check size={11} color="var(--text-muted)" />)}
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                                  {lastMsg.text || lastMsg.originalText || (lastMsg.mediaType !== 'text' ? `📎 ${lastMsg.mediaType}` : '...')}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: isOnline ? '#22C55E' : 'var(--text-muted)' }}>
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                            )}
                          </div>
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: isOnline ? '#22C55E' : 'var(--border-medium)',
                            flexShrink: 0, transition: 'background 0.3s',
                            boxShadow: isOnline ? '0 0 5px rgba(34,197,94,0.5)' : 'none',
                          }} />
                        </motion.div>
                      </React.Fragment>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* ══════════════════════════════════
              DANGER ZONE — Report + Block + Exit
          ══════════════════════════════════ */}
            <div style={{ padding: '8px 12px 20px' }}>
              <p style={{ margin: '4px 6px 10px', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                More Options
              </p>

              {/* ── Report (only for 1:1 chats) ── */}
              {!isGroup && (
                <DangerButton
                  icon={<Flag size={17} color="#F59E0B" />}
                  iconBg="rgba(245,158,11,0.1)"
                  label={`Report ${chat.name}`}
                  description="Submit a report to our safety team"
                  textColor="#F59E0B"
                  borderColor="rgba(245,158,11,0.18)"
                  onClick={() => setShowReport(true)}
                />
              )}

              {/* ── Block / Unblock (1:1 only) ── */}
              {!isGroup && (
                <DangerButton
                  icon={<Ban size={17} color={blocked ? '#10B981' : '#EF4444'} />}
                  iconBg={blocked ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}
                  label={blocked ? `Unblock ${chat.name}` : `Block ${chat.name}`}
                  description={blocked ? 'Allow messages from this contact' : 'Stop receiving messages from this contact'}
                  textColor={blocked ? '#10B981' : '#EF4444'}
                  borderColor={blocked ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}
                  onClick={() => setShowBlockConfirm(true)}
                />
              )}

              {/* ── Exit Group ── */}
              {isGroup && (
                <DangerButton
                  icon={<LogOut size={17} color="#EF4444" />}
                  iconBg="rgba(239,68,68,0.1)"
                  label="Exit Group"
                  description="You will stop receiving messages from this group"
                  textColor="#EF4444"
                  borderColor="rgba(239,68,68,0.18)"
                  onClick={() => setShowExitConfirm(true)}
                />
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Block Confirm Dialog ── */}
      <AnimatePresence>
        {showBlockConfirm && (
          <ConfirmDialog
            icon={<Ban size={22} color={blocked ? '#10B981' : '#EF4444'} />}
            iconBg={blocked ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}
            title={blocked ? `Unblock ${chat.name}?` : `Block ${chat.name}?`}
            description={blocked
              ? `${chat.name} will be able to send you messages again.`
              : `${chat.name} won't be able to send you messages or see your status.`}
            confirmLabel={blocked ? 'Unblock' : 'Block'}
            confirmColor={blocked ? '#10B981' : '#EF4444'}
            loading={blockLoading}
            onCancel={() => setShowBlockConfirm(false)}
            onConfirm={handleToggleBlock}
          />
        )}
      </AnimatePresence>

      {/* ── Exit Confirm Dialog ── */}
      <AnimatePresence>
        {showExitConfirm && (
          <ConfirmDialog
            icon={<LogOut size={22} color="#EF4444" />}
            iconBg="rgba(239,68,68,0.15)"
            title={`Exit "${chat.name}"?`}
            description="You'll no longer receive messages or be part of this group."
            confirmLabel="Exit Group"
            confirmColor="#EF4444"
            loading={exiting}
            onCancel={() => setShowExitConfirm(false)}
            onConfirm={handleExitGroup}
          />
        )}
      </AnimatePresence>

      {/* ── Report Modal ── */}
      <AnimatePresence>
        {showReport && (
          <ReportModal
            chat={chat}
            user={user}
            onClose={() => setShowReport(false)}
            onSuccess={() => showToast('Report submitted to our team', 'success')}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </>
  )
}

// ── Reusable sub-components ────────────────────────────────────────────────────

function Section({ label, children }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-light)' }}>
      {label && (
        <p style={{ margin: 0, padding: '16px 18px 8px', fontSize: '10.5px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </p>
      )}
      <div style={{ padding: label ? '0 0 8px' : '8px 0' }}>
        {children}
      </div>
    </div>
  )
}

function InfoRow({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '8px 18px' }}>
      <div style={{ marginTop: '2px', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

function DangerButton({ icon, iconBg, label, description, textColor, borderColor, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        width: '100%', padding: '13px 14px', borderRadius: '14px',
        background: 'transparent', border: `1.5px solid ${borderColor}`,
        cursor: 'pointer', marginBottom: '8px', textAlign: 'left',
        transition: 'all 0.18s',
      }}
    >
      <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: textColor }}>{label}</p>
        <p style={{ margin: '1px 0 0', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</p>
      </div>
      <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
    </motion.button>
  )
}

function ConfirmDialog({ icon, iconBg, title, description, confirmLabel, confirmColor, loading, onCancel, onConfirm }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onCancel}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{
          position: 'relative',
          zIndex: 951, width: '92%', maxWidth: '360px',
          background: 'var(--bg-surface)', borderRadius: '22px',
          padding: '28px 24px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          border: '1px solid var(--border-medium)',
          textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          {icon}
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
        <p style={{ margin: '0 0 22px', fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{description}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >Cancel</button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: confirmColor, color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
