import React from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, UserPlus, Phone } from 'lucide-react'
import useStore from '../../store/useStore.js'

export default function SyncContactsButton() {
  const { contactsLoading, fetchDeviceContacts, matchedContacts } = useStore()
  
  return (
    <motion.button
      disabled={contactsLoading}
      onClick={fetchDeviceContacts}
      style={{
        width: '34px', height: '34px',
        borderRadius: '10px',
        background: matchedContacts.length > 0 
          ? 'linear-gradient(135deg, #10B981, #059669)' 
          : 'var(--glass-bg)',
        border: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: contactsLoading ? 'wait' : 'pointer',
        color: matchedContacts.length > 0 ? '#fff' : 'var(--text-muted)',
        boxShadow: matchedContacts.length > 0 
          ? '0 4px 12px rgba(16,185,129,0.4)' 
          : '0 2px 6px rgba(0,0,0,0.08)',
        opacity: contactsLoading ? 0.7 : 1,
      }}
      whileHover={contactsLoading ? {} : { scale: 1.08, rotate: 180 }}
      whileTap={contactsLoading ? {} : { scale: 0.92 }}
      transition={{ duration: 0.25 }}
      title={matchedContacts.length > 0 
        ? `${matchedContacts.length} contacts ready to add` 
        : 'Sync device contacts'
      }
    >
      {contactsLoading ? (
        <RefreshCw size={16} className="animate-spin" />
      ) : matchedContacts.length > 0 ? (
        <UserPlus size={16} strokeWidth={2.5} />
      ) : (
        <Phone size={16} strokeWidth={2} />
      )}
    </motion.button>
  )
}
