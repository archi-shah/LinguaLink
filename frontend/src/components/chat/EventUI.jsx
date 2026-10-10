import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Clock, MapPin, ChevronDown, Check, X, Users, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../store/useStore'

// ── Helpers ──────────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:5000'

export default function EventUI({ msg, isSent, chatId }) {
  const metadata = msg.metadata || {}
  const title    = metadata.title    || 'New Event'
  const date     = metadata.date     || 'No Date'
  const time     = metadata.time     || 'No Time'
  const location = metadata.location || ''

  // RSVP data stored in metadata.rsvp = { userId: 'attend' | 'decline' }
  const rsvpMap   = metadata.rsvp || {}
  const { user, chats } = useStore(s => ({ user: s.user, chats: s.chats }))
  const myId     = String(user?._id || user?.id || '')
  const msgId    = msg._id || msg.id

  const chat = chats.find(c => c.id === chatId || c._id === chatId)
  const getMemberName = (id) => {
    if (id === myId) return 'You'
    const member = chat?.members?.find(m => String(m._id || m.id) === id)
    return member?.name || `User ${id.substring(0,4)}`
  }

  // Compute lists
  const attendeesList = useMemo(() => Object.entries(rsvpMap).filter(([_, v]) => v === 'attend').map(([k, _]) => k), [rsvpMap])
  const declinersList = useMemo(() => Object.entries(rsvpMap).filter(([_, v]) => v === 'decline').map(([k, _]) => k), [rsvpMap])

  const attendees = attendeesList.length
  const decliners = declinersList.length
  const myResponse = rsvpMap[myId] || null

  const [menuOpen,  setMenuOpen]  = useState(false)
  const [localRsvp, setLocalRsvp] = useState(myResponse) // optimistic
  const [showResponses, setShowResponses] = useState(false)

  // Sync with actual store value when message is updated externally (via socket)
  useEffect(() => { setLocalRsvp(myResponse) }, [myResponse])

  const handleRsvp = async (choice) => {
    if (isSent) return // sender can't RSVP their own event
    const next = localRsvp === choice ? null : choice  // toggle off if same
    setLocalRsvp(next)
    setMenuOpen(false)

    // Persist to backend via a special event-rsvp endpoint or adapt voteOnPoll
    try {
      const token = localStorage.getItem('authToken')
      await fetch(`${API_URL}/api/chats/messages/${msgId}/event-rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ choice: next }),
      })
    } catch (e) {
      // Silently ignore — optimistic update already applied
    }
  }

  const totalCount = attendees + decliners

  return (
    <>
      <div
        style={{
          minWidth: '260px',
          width: '100%',
          maxWidth: '320px',
          userSelect: 'none',
          position: 'relative',
          background: 'linear-gradient(135deg, #7C3AED, #6366F1)',
          borderRadius: '16px',
          padding: '16px',
          color: '#ffffff',
          boxShadow: '0 4px 15px rgba(124, 58, 237, 0.25)',
          margin: '-4px',
        }}
        onMouseLeave={() => setMenuOpen(false)}
      >
        {/* Chevron toggle (menu) */}
        <div
          style={{ position: 'absolute', top: '12px', right: '12px', cursor: 'pointer', padding: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', zIndex: 10 }}
          onClick={() => setMenuOpen(v => !v)}
        >
          <ChevronDown size={16} color="#fff" />
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              style={{
                position: 'absolute', top: '40px', right: '12px', zIndex: 50,
                background: 'var(--bg-panel)', borderRadius: '12px', padding: '6px 0',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid var(--border-medium)',
                minWidth: '200px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}
            >
              {[
                { label: '✅ Mark as Attending',  action: () => handleRsvp('attend')  },
                { label: '❌ Mark as Declining',   action: () => handleRsvp('decline') },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); item.action() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                    background: 'transparent', border: 'none', color: 'var(--text-primary)',
                    fontSize: '13.5px', cursor: 'pointer', textAlign: 'left', fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', paddingRight: '24px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Calendar size={22} color="#ffffff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, paddingTop: '2px' }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Event</p>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>{title}</h3>
          </div>
        </div>

        {/* Date / Time / Location */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#ffffff' }}>{date}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={14} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#ffffff' }}>{time}</span>
          </div>
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={14} color="rgba(255,255,255,0.7)" />
              <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#ffffff' }}>{location}</span>
            </div>
          )}
        </div>

        {/* RSVP vote summary bar */}
        <AnimatePresence>
          {totalCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.18)',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              onClick={() => setShowResponses(true)}
            >
              <Users size={13} color="rgba(255,255,255,0.7)" />
              <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                <span style={{ color: '#4ADE80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={11} />
                  {attendees} attending
                </span>
                <span style={{ color: '#F87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <X size={11} />
                  {decliners} declining
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RSVP buttons (hidden for sender) */}
        {!isSent && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            {/* Attend */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleRsvp('attend')}
              style={{
                flex: 1, padding: '10px 0', borderRadius: '10px', border: 'none',
                background: localRsvp === 'attend'
                  ? '#10B981'
                  : (localRsvp === 'decline' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'),
                color: localRsvp === 'attend'
                  ? '#ffffff'
                  : (localRsvp === 'decline' ? 'rgba(255,255,255,0.35)' : '#6366F1'),
                fontWeight: 700, fontSize: '13.5px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.22s ease',
              }}
            >
              {localRsvp === 'attend' && <Check size={16} />}
              Attend
            </motion.button>

            {/* Decline */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleRsvp('decline')}
              style={{
                flex: 1, padding: '10px 0', borderRadius: '10px',
                border: localRsvp === 'decline' ? 'none' : '1px solid rgba(255,255,255,0.3)',
                background: localRsvp === 'decline' ? '#EF4444' : 'transparent',
                color: localRsvp === 'decline' ? '#ffffff' : (localRsvp === 'attend' ? 'rgba(255,255,255,0.35)' : '#ffffff'),
                fontWeight: 600, fontSize: '13.5px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.22s ease',
              }}
            >
              {localRsvp === 'decline' && <X size={16} />}
              Decline
            </motion.button>
          </div>
        )}

        {/* Sender view — shows your own event */}
        {isSent && (
          <div style={{
            marginTop: '12px', padding: '8px 12px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px', fontSize: '12px',
            color: 'rgba(255,255,255,0.7)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '6px',
            cursor: 'pointer'
          }} onClick={() => setShowResponses(true)}>
            <Users size={13} />
            {totalCount === 0 ? 'No responses yet' : `${attendees} attending · ${decliners} declining`}
          </div>
        )}
      </div>
      
      {showResponses && createPortal(
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '20px' }} 
          onClick={() => setShowResponses(false)}
        >
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-panel)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '400px',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-medium)', background: 'var(--bg-surface)' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Event Responses</h3>
                <button 
                  onClick={() => setShowResponses(false)} 
                  style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
                <p style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{title}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Attending */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14.5px', fontWeight: 600, color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={16} /> Attending
                      </span>
                      <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>{attendeesList.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px' }}>
                      {attendeesList.length > 0 ? (
                        attendeesList.map((id, vi) => (
                          <div key={vi} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                               <User size={16} color="var(--text-secondary)" />
                            </div>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {getMemberName(id)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No attendees yet</span>
                      )}
                    </div>
                  </div>

                  {/* Declining */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14.5px', fontWeight: 600, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <X size={16} /> Declining
                      </span>
                      <span style={{ fontSize: '13px', color: '#EF4444', fontWeight: 700, background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>{declinersList.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px' }}>
                      {declinersList.length > 0 ? (
                        declinersList.map((id, vi) => (
                          <div key={vi} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                               <User size={16} color="var(--text-secondary)" />
                            </div>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {getMemberName(id)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No decliners</span>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}
    </>
  )
}
