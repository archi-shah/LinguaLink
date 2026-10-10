import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CheckCircle2, Circle, X, User } from 'lucide-react'
import useStore from '../../store/useStore.js'
import { chatAPI } from '../../api/client.js'

export default function PollUI({ msg, chatId, isSent }) {
  const { user, socket, messages, chats } = useStore()
  const [isVoting, setIsVoting] = useState(false)
  const [showVotes, setShowVotes] = useState(false)

  const metadata = msg.metadata || {}
  const options = metadata.options || []
  const allowMultiple = metadata.allowMultiple !== false // Default to true if missing

  // Calculate total votes across all options
  const totalVotes = options.reduce((sum, opt) => sum + (opt.votes ? opt.votes.length : 0), 0)

  const voteOnPoll = useStore(s => s.voteOnPoll)

  const handleVote = async (optionIndex) => {
    if (isVoting) return
    setIsVoting(true)
    try {
      await voteOnPoll(msg._id || msg.id, optionIndex)
    } catch (err) {
      console.error('Failed to vote:', err)
    } finally {
      setIsVoting(false)
    }
  }

  const userIdStr = String(user?._id || user?.id)

  return (
    <>
      <div style={{ minWidth: '260px', width: '100%', maxWidth: '320px', userSelect: 'none' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: isSent ? '#fff' : 'var(--text-primary)', lineHeight: 1.4 }}>
          {metadata.question || 'Poll'}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: isSent ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>
          {allowMultiple ? 'Select one or more' : 'Select one'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {options.map((opt, i) => {
            const votes = opt.votes || []
            const voteCount = votes.length
            const hasVoted = votes.includes(userIdStr)
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

            return (
              <div 
                key={i}
                onClick={() => handleVote(i)}
                style={{ position: 'relative', cursor: isVoting ? 'wait' : 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 2, padding: '4px 0' }}>
                  <div style={{ flexShrink: 0, color: hasVoted ? (isSent ? '#fff' : 'var(--primary)') : (isSent ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {hasVoted ? (
                      <CheckCircle2 size={20} fill="currentColor" color={isSent ? 'var(--primary)' : '#fff'} />
                    ) : (
                      <Circle size={20} strokeWidth={1.5} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14.5px', fontWeight: hasVoted ? 600 : 400, color: isSent ? '#fff' : 'var(--text-primary)' }}>
                        {opt.text}
                      </span>
                      {voteCount > 0 && (
                        <span style={{ fontSize: '13px', fontWeight: 500, color: isSent ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>
                          {voteCount}
                        </span>
                      )}
                    </div>
                    {/* Progress Bar Track */}
                    <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: isSent ? 'rgba(0,0,0,0.15)' : 'var(--border-medium)', overflow: 'hidden' }}>
                      {/* Progress Bar Fill */}
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        style={{ 
                          height: '100%', 
                          background: isSent ? '#fff' : 'var(--primary)',
                          borderRadius: '2px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div 
          onClick={() => setShowVotes(true)}
          style={{ borderTop: isSent ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-medium)', marginTop: '16px', paddingTop: '12px', textAlign: 'center' }}
        >
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: isSent ? '#fff' : 'var(--primary)', cursor: 'pointer' }}>
            View votes
          </span>
        </div>
      </div>

      {showVotes && createPortal(
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '20px' }} 
          onClick={() => setShowVotes(false)}
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
                border: '1px solid var(--border-medium)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-medium)', background: 'var(--bg-surface)' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Poll Details</h3>
                <button 
                  onClick={() => setShowVotes(false)} 
                  style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
                <p style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{metadata.question}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {options.map((opt, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{opt.text}</span>
                        <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700, background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '12px' }}>{opt.votes?.length || 0}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px' }}>
                        {opt.votes && opt.votes.length > 0 ? (
                          opt.votes.map((voterId, vi) => (
                            <div key={vi} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                 <User size={16} color="var(--text-secondary)" />
                              </div>
                              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {(() => {
                                  if (voterId === userIdStr) return 'You'
                                  const chat = chats.find(c => c.id === chatId || c._id === chatId)
                                  const member = chat?.members?.find(m => String(m._id || m.id) === voterId)
                                  return member?.name || `User ${voterId.substring(0,4)}`
                                })()}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No votes yet</span>
                        )}
                      </div>
                    </div>
                  ))}
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
