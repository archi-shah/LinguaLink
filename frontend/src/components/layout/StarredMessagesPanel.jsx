import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Star } from 'lucide-react'
import useStore from '../../store/useStore.js'

export default function StarredMessagesPanel() {
  const { setActiveSidebar, user, chats, messages, toggleStarMessage } = useStore()

  const starredMessagesList = useMemo(() => {
    if (!user?.starredMessages || user.starredMessages.length === 0) return []
    const list = []
    
    // We only have messages in state for active chats, but ideally we'd fetch them from the backend.
    // For now, let's search across all messages currently loaded in the store.
    Object.keys(messages).forEach(chatId => {
      const chatMsgs = messages[chatId]
      chatMsgs.forEach(msg => {
        if (user.starredMessages.includes(msg._id || msg.id)) {
          const chat = chats.find(c => c.id === chatId)
          list.push({ ...msg, chatName: chat?.name || 'Unknown Chat' })
        }
      })
    })
    
    return list.sort((a, b) => new Date(b.createdAt || b.time) - new Date(a.createdAt || a.time))
  }, [user?.starredMessages, messages, chats])

  return (
    <motion.div
      className="fluid-left-panel"
      initial={{ x: -12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.08, duration: 0.35, ease: [0.22,1,0.36,1] }}
    >
      <div style={{
        padding: '20px 18px 14px', borderBottom: '1px solid var(--border-light)',
        background: 'var(--bg-panel)', position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <button
          onClick={() => setActiveSidebar('chats')}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px', borderRadius: '50%',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Star size={20} fill="currentColor" color="var(--primary)" />
          Starred Messages
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {starredMessagesList.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Star size={32} style={{ opacity: 0.4, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>No starred messages</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Star messages in chats to see them here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {starredMessagesList.map(msg => (
              <div key={msg._id || msg.id} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                borderRadius: '12px', padding: '12px', position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>{msg.chatName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{msg.time}</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {msg.text || msg.originalText || msg.content}
                </p>
                <button
                  onClick={() => toggleStarMessage(msg._id || msg.id)}
                  style={{
                    position: 'absolute', bottom: '12px', right: '12px',
                    background: 'transparent', border: 'none', color: 'var(--primary)',
                    cursor: 'pointer', padding: '4px'
                  }}
                >
                  <Star size={16} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
