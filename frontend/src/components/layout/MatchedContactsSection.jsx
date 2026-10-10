import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../store/useStore.js'

export default function MatchedContactsSection() {
  const { matchedContacts, contactsLoading, addContact, deviceContacts, clearContacts } = useStore()

  const handleAddAll = async () => {
    for (const user of matchedContacts) {
      await addContact(user._id)
    }
    clearContacts()
  }

  if (contactsLoading || matchedContacts.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="glass-strong border-t"
      style={{
        borderColor: 'var(--border-light)',
        padding: '12px',
        margin: '0 10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{
          fontSize: '13px', fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'Inter, sans-serif',
        }}>
          {matchedContacts.length} new contacts found
        </span>
        <motion.button
          onClick={handleAddAll}
          style={{
            padding: '4px 12px', borderRadius: '16px',
            background: 'var(--brand-gradient)', color: '#fff',
            border: 'none', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            boxShadow: '0 2px 8px rgba(123,92,255,0.3)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Add All
        </motion.button>
      </div>
      
      <AnimatePresence>
        {matchedContacts.slice(0, 3).map((user, i) => (  // Show top 3
          <motion.div
            key={user._id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px', borderRadius: '12px',
              background: 'rgba(16,185,129,0.1)',
              marginBottom: '4px',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: `hsl(${Math.random()*360}, 70%, 55%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: '#fff',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}>
              {user.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '12px', fontWeight: 600, 
                color: '#059669', fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user.name}
              </div>
              <div style={{ 
                fontSize: '10px', color: 'var(--text-muted)',
                fontFamily: 'Inter, sans-serif',
              }}>
                {user.email || user.phone}
              </div>
            </div>
            <motion.button
              onClick={() => addContact(user._id)}
              style={{
                width: '24px', height: '24px', borderRadius: '6px',
                background: '#10B981', color: '#fff',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Add Contact"
            >
              +
            </motion.button>
          </motion.div>
        ))}
        {matchedContacts.length > 3 && (
          <motion.div
            style={{
              textAlign: 'center', padding: '8px',
              fontSize: '11px', color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            +{matchedContacts.length - 3} more
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
