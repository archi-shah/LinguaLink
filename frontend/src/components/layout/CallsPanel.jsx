/**
 * CallsPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Professional calls history panel with real backend data, grouped by date,
 * and unique features: call stats dashboard, call duration badges, and
 * one-tap callback from history.
 */
import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  PhoneCall, X, Trash2, Clock, TrendingUp, BarChart3, Filter, Menu
} from 'lucide-react'
import { useCallStore } from '../../store/useCallStore'
import useStore from '../../store/useStore'

// ── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_META = {
  answered: { color: '#22C55E', label: 'Answered' },
  missed:   { color: '#EF4444', label: 'Missed' },
  rejected: { color: '#F59E0B', label: 'Declined' },
}

function DirIcon({ dir, status }) {
  if (status === 'missed' || status === 'rejected') return <PhoneMissed size={14} color="#EF4444" />
  if (dir === 'incoming') return <PhoneIncoming size={14} color="#22C55E" />
  return <PhoneOutgoing size={14} color="#4C74F9" />
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', gap: 14, textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'linear-gradient(135deg,rgba(76,116,249,.12),rgba(99,102,241,.08))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 6,
      }}>
        <PhoneCall size={30} color="#4C74F9" strokeWidth={1.5} />
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
        No calls yet
      </p>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 220 }}>
        Open a chat and tap the phone or video icon to start your first call
      </p>
    </div>
  )
}

// ── Call Stats Card ─────────────────────────────────────────────────────
function CallStats({ history }) {
  const total = history.length
  const answered = history.filter(c => c.status === 'answered').length
  const missed = history.filter(c => c.status === 'missed' || c.status === 'rejected').length
  const totalMin = Math.round(history.reduce((sum, c) => sum + (c.durationSec || 0), 0) / 60)
  const videoCalls = history.filter(c => c.type === 'video').length

  const stats = [
    { label: 'Total', value: total, icon: <Phone size={13} />, color: '#4C74F9' },
    { label: 'Answered', value: answered, icon: <PhoneCall size={13} />, color: '#22C55E' },
    { label: 'Missed', value: missed, icon: <PhoneMissed size={13} />, color: '#EF4444' },
    { label: 'Minutes', value: totalMin, icon: <Clock size={13} />, color: '#F59E0B' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        padding: '0 12px 12px',
      }}
    >
      {stats.map(s => (
        <div key={s.label} style={{
          background: 'var(--bg-hover)',
          borderRadius: 14, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          border: '1px solid var(--border-light)',
          transition: 'transform 0.15s',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: `${s.color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: s.color, flexShrink: 0,
          }}>
            {s.icon}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '.03em', marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  )
}

// ── New Call Modal ───────────────────────────────────────────────────────
function NewCallModal({ onClose }) {
  const { chats, user } = useStore()
  const { setCalling } = useCallStore()
  const [search, setSearch] = useState('')
  const [callType, setCallType] = useState('audio')
  const myId = String(user?._id || user?.id || '')

  const p2pChats = chats
    .filter(c => !c.isGroup && c.otherId)
    .filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))

  const startCall = (chat) => {
    setCalling({ id: chat.otherId, name: chat.name, initials: chat.initials }, callType === 'video')
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: .88, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: .88, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 360, borderRadius: 22,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-light)',
          boxShadow: '0 28px 80px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', maxHeight: '80vh',
        }}
      >
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid var(--border-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>New Call</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Choose a contact to call</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 8 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '14px 16px 0' }}>
          {[{ id: 'audio', icon: <Phone size={14} />, label: 'Voice' },
            { id: 'video', icon: <Video size={14} />, label: 'Video' }].map(t => (
            <motion.button
              key={t.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }}
              onClick={() => setCallType(t.id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 12, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: callType === t.id ? 'linear-gradient(135deg,#4C74F9,#6366F1)' : 'var(--bg-hover)',
                color: callType === t.id ? '#fff' : 'var(--text-secondary)',
                boxShadow: callType === t.id ? '0 3px 12px rgba(76,116,249,.35)' : 'none',
              }}
            >{t.icon}{t.label}</motion.button>
          ))}
        </div>

        <div style={{ padding: '12px 16px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 30, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..." autoFocus
            style={{
              width: '100%', paddingLeft: 38, paddingTop: 10, paddingBottom: 10, paddingRight: 12,
              fontSize: 13, borderRadius: 12, boxSizing: 'border-box',
              background: 'var(--bg-hover)', border: '1.5px solid var(--border-light)',
              color: 'var(--text-primary)', outline: 'none',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 10 }}>
          {p2pChats.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '24px 0' }}>No contacts found</p>
          ) : p2pChats.map((c, i) => (
            <motion.button
              key={c.id || i}
              whileHover={{ background: 'var(--bg-hover)' }} whileTap={{ scale: .98 }}
              onClick={() => startCall(c)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: c.color || 'linear-gradient(135deg,#7C3AED,#6366F1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 15, position: 'relative',
              }}>
                {c.profilePic
                  ? <img src={c.profilePic} alt={c.name} style={{ width: '100%', height: '100%', borderRadius: 14, objectFit: 'cover' }} />
                  : (c.initials || '?')
                }
                {c.online && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#22C55E', border: '2px solid var(--bg-panel)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.online ? 'Online' : 'Offline'}</div>
              </div>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#4C74F9,#6366F1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(76,116,249,.4)',
              }}>
                {callType === 'video' ? <Video size={15} color="#fff" /> : <Phone size={15} color="#fff" />}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Panel
// ─────────────────────────────────────────────────────────────────────────────
export default function CallsPanel() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showNewCall, setShowNewCall] = useState(false)
  const [hoveredCall, setHoveredCall] = useState(null)

  const callHistory = useCallStore(s => s.callHistory)
  const callHistoryLoaded = useCallStore(s => s.callHistoryLoaded)
  const loadCallHistory = useCallStore(s => s.loadCallHistory)
  const deleteCallLog = useCallStore(s => s.deleteCallLog)
  const clearAllCallHistory = useCallStore(s => s.clearAllCallHistory)
  const { setCalling } = useCallStore()
  const { chats, user, setMobileSidebarOpen } = useStore()

  // Load call history from backend on mount
  useEffect(() => {
    if (!callHistoryLoaded) loadCallHistory()
  }, [callHistoryLoaded])

  const filtered = useMemo(() =>
    callHistory
      .filter(c => filter === 'missed' ? (c.status === 'missed' || c.status === 'rejected') : true)
      .filter(c => c.name?.toLowerCase().includes(search.toLowerCase())),
    [callHistory, filter, search]
  )

  // Group by relative date
  const grouped = useMemo(() => {
    const groups = []
    let lastDate = ''
    filtered.forEach(call => {
      const d = formatRelativeDate(call.timestamp)
      if (d !== lastDate) {
        groups.push({ type: 'header', label: d })
        lastDate = d
      }
      groups.push({ type: 'call', data: call })
    })
    return groups
  }, [filtered])

  const handleRecall = (record) => {
    const chat = chats.find(c => !c.isGroup && (c.otherId === record.otherId || c.name?.toLowerCase() === record.name?.toLowerCase()))
    if (!chat?.otherId) return
    setCalling({ id: chat.otherId, name: record.name, initials: record.initials }, record.type === 'video')
  }

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'missed', label: 'Missed' },
  ]

  return (
    <>
      <motion.div
        className="fluid-left-panel"
        style={{ height: '100%' }}
        initial={{ x: -12, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 18px 14px',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--bg-panel)', position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="mobile-only" onClick={() => setMobileSidebarOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                <Menu size={24} />
              </button>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em', margin: 0 }}>
                Calls
              </h1>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {/* New call */}
              <motion.button
                onClick={() => setShowNewCall(true)}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'linear-gradient(135deg, #4C74F9 0%, #6366F1 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer', color: '#fff',
                  boxShadow: '0 3px 12px rgba(76,116,249,0.35)',
                }}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}
                title="New call"
              >
                <Phone size={16} strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Search call history..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', paddingLeft: 38, paddingTop: 10, paddingBottom: 10, paddingRight: 12,
                fontSize: 13, borderRadius: 12, boxSizing: 'border-box',
                background: 'var(--bg-hover)', border: '1.5px solid var(--border-light)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map(f => (
              <motion.button
                key={f.id}
                onClick={() => setFilter(f.id)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{
                  padding: '5px 14px', borderRadius: 999,
                  fontSize: '11.5px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer', border: 'none',
                  background: filter === f.id ? 'linear-gradient(135deg, #4C74F9 0%, #6366F1 100%)' : 'var(--bg-hover)',
                  color: filter === f.id ? '#fff' : 'var(--text-secondary)',
                  boxShadow: filter === f.id ? '0 3px 10px rgba(76,116,249,0.35)' : 'none',
                  letterSpacing: '.02em',
                }}
              >
                {f.label}
              </motion.button>
            ))}

            {callHistory.length > 0 && (
              <motion.button
                onClick={clearAllCallHistory}
                whileHover={{ scale: 1.04, color: '#EF4444' }} whileTap={{ scale: 0.97 }}
                style={{
                  marginLeft: 'auto', padding: '5px 10px', borderRadius: 999,
                  fontSize: '11px', fontWeight: 600, border: 'none',
                  background: 'transparent', color: 'var(--text-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
                title="Clear all history"
              >
                <Trash2 size={12} /> Clear
              </motion.button>
            )}
          </div>
        </div>

        {/* Call List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
          {!callHistoryLoaded ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ width: 28, height: 28, border: '3px solid var(--border-light)', borderTopColor: '#4C74F9', borderRadius: '50%' }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence mode="popLayout">
              {grouped.map((item, i) => item.type === 'header' ? (
                <motion.div
                  key={`hdr-${item.label}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{
                    padding: '12px 6px 6px', fontSize: 11, fontWeight: 700,
                    color: 'var(--text-muted)', letterSpacing: '.06em',
                    textTransform: 'uppercase', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {item.label}
                </motion.div>
              ) : (
                <motion.div
                  key={item.data.id}
                  layout
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 10px', borderRadius: 14,
                    cursor: 'pointer', marginBottom: 2, position: 'relative',
                  }}
                  whileHover={{ background: 'var(--bg-hover)' }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -60, scale: .9 }}
                  transition={{ delay: i * 0.015 }}
                  onMouseEnter={() => setHoveredCall(item.data.id)}
                  onMouseLeave={() => setHoveredCall(null)}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 15, flexShrink: 0,
                    background: item.data.status === 'missed' || item.data.status === 'rejected'
                      ? 'linear-gradient(135deg,#EF4444,#DC2626)'
                      : item.data.type === 'video'
                        ? 'linear-gradient(135deg,#8B5CF6,#6366F1)'
                        : 'linear-gradient(135deg,#4C74F9,#6366F1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 16,
                    boxShadow: item.data.status === 'missed'
                      ? '0 4px 14px rgba(239,68,68,.3)'
                      : '0 4px 14px rgba(76,116,249,.25)',
                    position: 'relative',
                  }}>
                    {item.data.profilePic
                      ? <img src={item.data.profilePic} alt="" style={{ width: '100%', height: '100%', borderRadius: 15, objectFit: 'cover' }} />
                      : (item.data.initials || '?')
                    }
                    {/* Call type badge */}
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'var(--bg-panel)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--bg-panel)',
                    }}>
                      {item.data.type === 'video'
                        ? <Video size={10} color="#8B5CF6" strokeWidth={2.5} />
                        : <Phone size={10} color="#4C74F9" strokeWidth={2.5} />
                      }
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{
                      margin: '0 0 3px', fontSize: '14px', fontWeight: 700,
                      color: (item.data.status === 'missed' || item.data.status === 'rejected')
                        ? '#EF4444' : 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                      {item.data.name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                      <DirIcon dir={item.data.dir} status={item.data.status} />
                      <span>{item.data.time}</span>
                      {item.data.duration && (
                        <>
                          <span style={{ opacity: .4 }}>·</span>
                          <span style={{
                            background: 'rgba(34,197,94,.1)',
                            color: '#22C55E',
                            padding: '1px 6px',
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 700,
                          }}>
                            {item.data.duration}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {/* Delete button (on hover) */}
                    <AnimatePresence>
                      {hoveredCall === item.data.id && (
                        <motion.button
                          initial={{ opacity: 0, scale: .7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: .7 }}
                          whileHover={{ background: 'rgba(239,68,68,.15)' }}
                          whileTap={{ scale: .85 }}
                          onClick={(e) => { e.stopPropagation(); deleteCallLog(item.data.id) }}
                          title="Delete"
                          style={{
                            background: 'transparent', border: 'none', color: 'var(--text-muted)',
                            cursor: 'pointer', padding: 6, display: 'flex', borderRadius: '50%',
                          }}
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      )}
                    </AnimatePresence>

                    {/* Re-call */}
                    <motion.button
                      whileHover={{ scale: 1.12, background: 'rgba(76,116,249,.12)' }}
                      whileTap={{ scale: .9 }}
                      onClick={(e) => { e.stopPropagation(); handleRecall(item.data) }}
                      title={`${item.data.type === 'video' ? 'Video' : 'Voice'} call ${item.data.name}`}
                      style={{
                        background: 'transparent', border: 'none', color: '#4C74F9',
                        cursor: 'pointer', padding: 7, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%', transition: 'background 0.2s',
                      }}
                    >
                      {item.data.type === 'video' ? <Video size={17} /> : <Phone size={17} />}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* New Call Modal */}
      <AnimatePresence>
        {showNewCall && <NewCallModal onClose={() => setShowNewCall(false)} />}
      </AnimatePresence>
    </>
  )
}
