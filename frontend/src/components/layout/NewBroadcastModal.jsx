import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Users, Check, Megaphone } from 'lucide-react'
import useStore from '../../store/useStore.js'

export default function NewBroadcastModal({ isOpen, onClose }) {
  const { searchUsers, createChat, user: currentUser } = useStore()
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  
  const [selectedUsers, setSelectedUsers] = useState([])
  const [broadcastName, setBroadcastName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setUsers([])
      setSelectedUsers([])
      setBroadcastName('')
      return
    }
    
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const results = await searchUsers(search, 20)
        setUsers(results || [])
      } catch (err) {
        console.error('Failed to search users:', err)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [search, isOpen, searchUsers])

  const toggleUser = (user) => {
    if (selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id))
    } else {
      setSelectedUsers([...selectedUsers, user])
    }
  }

  const handleCreateBroadcast = async () => {
    if (isCreating || selectedUsers.length === 0 || !broadcastName.trim()) return
    setIsCreating(true)
    try {
      await createChat(selectedUsers.map(u => u._id), false, broadcastName.trim(), true)
      onClose()
    } catch (err) {
      console.error('Failed to create broadcast:', err)
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            width: '100%', maxWidth: '440px', maxHeight: '80vh',
            background: 'var(--bg-surface)', borderRadius: '24px',
            border: '1px solid var(--border-light)', boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-panel)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Megaphone size={22} color="var(--primary)" />
                  Create New Broadcast
                </h2>
              </div>
              <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Broadcast List Name"
                value={broadcastName}
                onChange={(e) => setBroadcastName(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', background: 'var(--bg-hover)',
                  border: '1.5px solid var(--border-light)', borderRadius: '12px',
                  fontSize: '14px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search users to add..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'var(--bg-hover)', border: '1.5px solid var(--border-light)', borderRadius: '12px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            
            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                {selectedUsers.map(u => (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--primary-soft)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                    {u.name}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => toggleUser(u)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: 'var(--bg-surface)' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                Searching network...
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No users found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {users.map(u => {
                  const isSelected = selectedUsers.some(su => su._id === u._id)
                  return (
                    <motion.div
                      key={u._id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '12px', borderRadius: '16px', background: 'var(--bg-panel)',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}`,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onClick={() => toggleUser(u)}
                    >
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '14px', background: u.profilePic ? 'transparent' : 'linear-gradient(135deg, #4C74F9 0%, #6366F1 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#fff', overflow: 'hidden'
                      }}>
                        {u.profilePic ? <img src={u.profilePic} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.initials}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</h4>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.identifier}</p>
                      </div>

                      <div style={{
                        width: '24px', height: '24px', borderRadius: '6px',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-medium)'}`,
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                      }}>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
          
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-panel)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCreateBroadcast}
              disabled={isCreating || selectedUsers.length === 0 || !broadcastName.trim()}
              style={{
                padding: '12px 24px', borderRadius: '12px',
                background: (isCreating || selectedUsers.length === 0 || !broadcastName.trim()) ? 'var(--border-medium)' : 'var(--primary)',
                color: '#fff', border: 'none', fontWeight: 700, cursor: (isCreating || selectedUsers.length === 0 || !broadcastName.trim()) ? 'not-allowed' : 'pointer',
                transition: '0.2s'
              }}
            >
              {isCreating ? 'Creating...' : `Create Broadcast (${selectedUsers.length})`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
