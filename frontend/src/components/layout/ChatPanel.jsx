import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Users, MoreVertical, MessageCircle, ChevronDown, Archive, BellOff, Pin, Mail, Heart, List, MinusCircle, LogOut, Check, CheckCheck, Camera, Mic, FileText, Ban, Menu } from 'lucide-react'
import useStore from '../../store/useStore.js'

import NewChatModal from './NewChatModal.jsx'
import NewGroupModal from './NewGroupModal.jsx'
import NewBroadcastModal from './NewBroadcastModal.jsx'

const FILTERS = ['all', 'unread', 'groups', 'pinned', 'archived']
const FILTER_LABELS = { all: 'All', unread: 'Unread', groups: 'Groups', pinned: 'Pinned', archived: 'Archived' }

export default function ChatPanel() {
  const { chats, activeChat, setActiveChat, chatFilter, setChatFilter, privacyMode,
          setSelectionMode, archiveChat, togglePinChat, toggleMuteChat, toggleUnreadChat, toggleFavouriteChat, toggleListChat, clearChatHistory, exitGroup, blockUser, unblockUser, user, setActiveSidebar, setMobileSidebarOpen } = useStore()
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [openChatMenu, setOpenChatMenu] = useState(null)
  const [hoveredChat, setHoveredChat] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)
  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000) }

  // 1. Filter out archived unless we're in the archived tab
  // 2. Apply current filter (unread, groups, pinned)
  // 3. Search text
  // 4. Sort pinned chats to top
  const filtered = chats
    .filter(c => chatFilter === 'archived' ? c.archivedBy?.includes(user?.id || user?._id) : !c.archivedBy?.includes(user?.id || user?._id))
    .filter(c => chatFilter === 'unread' ? c.unread > 0 : chatFilter === 'groups' ? c.isGroup : chatFilter === 'pinned' ? c.pinnedBy?.includes(user?.id || user?._id) : true)
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aPinned = a.pinnedBy?.includes(user?.id || user?._id);
      const bPinned = b.pinnedBy?.includes(user?.id || user?._id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    })

  return (
    <motion.div
      className="fluid-left-panel"
      initial={{ x: -12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '20px 18px 14px',
        borderBottom: '1px solid var(--border-light)',
        background: 'var(--bg-panel)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Title Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="mobile-only" onClick={() => setMobileSidebarOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
              <Menu size={24} />
            </button>
            <h1 style={{
              fontSize: '22px', fontWeight: 800,
              color: 'var(--text-primary)',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.02em',
          }}>
            Messages
          </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            {/* New Chat Button */}
            <motion.button
              style={{
                padding: '0 14px', height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4C74F9 0%, #6366F1 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                border: 'none', cursor: 'pointer', color: '#fff',
                fontSize: '13px', fontWeight: 700,
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 3px 12px rgba(76,116,249,0.35)',
              }}
              whileHover={{ scale: 1.04, boxShadow: '0 4px 18px rgba(76,116,249,0.5)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsNewModalOpen(true)}
            >
              <Plus size={15} strokeWidth={2.8} />
              New
            </motion.button>

            {/* Menu Button */}
            <motion.button
              style={{
                width: '34px', height: '34px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1.5px solid var(--border-medium)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-secondary)',
              }}
              whileHover={{ background: 'var(--bg-hover)', borderColor: 'var(--primary)', color: 'var(--primary)' }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MoreVertical size={17} strokeWidth={2} />
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -8 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      position: 'absolute', top: '42px', right: '0',
                      width: '196px',
                      background: 'var(--bg-surface)',
                      borderRadius: '14px',
                      border: '1px solid var(--border-light)',
                      boxShadow: '0 12px 40px rgba(76,116,249,0.15), 0 4px 16px rgba(0,0,0,0.08)',
                      zIndex: 50,
                      padding: '6px',
                      overflow: 'hidden',
                    }}
                  >
                    {['New Group', 'New Broadcast', 'Starred Messages', 'Select Messages', 'Settings'].map((item, i) => (
                      <button
                        key={i}
                        style={{
                          width: '100%', textAlign: 'left', padding: '9px 12px',
                          border: 'none', background: 'transparent', borderRadius: '9px',
                          fontSize: '13.5px', color: 'var(--text-primary)', cursor: 'pointer',
                          fontFamily: 'Inter, sans-serif', fontWeight: 500,
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { e.target.style.background = 'var(--bg-hover)'; e.target.style.color = 'var(--primary)'; }}
                        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-primary)'; }}
                        onClick={() => {
                          setMenuOpen(false)
                          if (item === 'New Group') setIsGroupModalOpen(true)
                          if (item === 'New Broadcast') setIsBroadcastModalOpen(true)
                          if (item === 'Starred Messages') setActiveSidebar('starred')
                          if (item === 'Select Messages') setSelectionMode(true)
                          if (item === 'Settings') setActiveSidebar('settings')
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search
            size={15}
            style={{
              position: 'absolute', left: '13px', top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-glass"
            style={{
              paddingLeft: '38px',
              paddingTop: '10px', paddingBottom: '10px',
              fontSize: '13px',
              borderRadius: '12px',
              background: 'var(--bg-hover)',
              border: '1.5px solid var(--border-light)',
            }}
          />
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
          {FILTERS.map(f => (
            <motion.button
              key={f}
              onClick={() => setChatFilter(f)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                flexShrink: 0,
                padding: '5px 13px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                border: 'none',
                background: chatFilter === f
                  ? 'linear-gradient(135deg, #4C74F9 0%, #6366F1 100%)'
                  : 'var(--bg-hover)',
                color: chatFilter === f ? '#fff' : 'var(--text-secondary)',
                boxShadow: chatFilter === f ? '0 3px 10px rgba(76,116,249,0.35)' : 'none',
                letterSpacing: '0.02em',
              }}
            >
              {FILTER_LABELS[f]}
            </motion.button>
          ))}
        </div>
      </div>



      {/* ── Chat List ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px', opacity: 0.6 }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={24} color="var(--primary)" />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>No conversations found</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((chat, i) => (
              <motion.div
                key={chat.id}
                className={`chat-card ${activeChat === chat.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '3px', position: 'relative', overflow: 'visible' }}
                onClick={() => setActiveChat(chat.id)}
                onMouseEnter={() => setHoveredChat(chat.id)}
                onMouseLeave={() => { setOpenChatMenu(null); setHoveredChat(null); }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                layout
              >
                {/* Chat Context Menu Chevron */}
                <div
                  className="chat-menu-trigger"
                  onClick={(e) => { e.stopPropagation(); setOpenChatMenu(openChatMenu === chat.id ? null : chat.id); }}
                  style={{ position: 'absolute', right: '10px', top: '24px', zIndex: 10, padding: '4px', borderRadius: '50%', background: 'var(--bg-panel)', opacity: (openChatMenu === chat.id || hoveredChat === chat.id) ? 1 : 0, transition: 'opacity 0.2s', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                >
                  <ChevronDown size={16} color="var(--text-secondary)" />
                </div>

                <AnimatePresence>
                  {openChatMenu === chat.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -5 }}
                      style={{
                        position: 'absolute', top: '35px', right: '10px', zIndex: 30,
                        background: 'var(--bg-panel)', borderRadius: '12px', padding: '8px 0',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid var(--border-medium)',
                        minWidth: '220px', display: 'flex', flexDirection: 'column'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[
                        { icon: Archive, label: chat.archivedBy?.includes(user?.id || user?._id) ? 'Unarchive chat' : 'Archive chat', action: () => archiveChat(chat.id) },
                        { icon: BellOff, label: chat.mutedBy?.includes(user?.id || user?._id) ? 'Unmute notifications' : 'Mute notifications', action: () => toggleMuteChat(chat.id) },
                        { icon: Pin, label: chat.pinnedBy?.includes(user?.id || user?._id) ? 'Unpin chat' : 'Pin chat', action: () => togglePinChat(chat.id) },
                        { icon: Mail, label: chat.unreadBy?.includes(user?.id || user?._id) ? 'Mark as read' : 'Mark as unread', action: () => toggleUnreadChat(chat.id) },
                        { icon: Heart, label: chat.favouritedBy?.includes(user?.id || user?._id) ? 'Remove favourite' : 'Add to favourites', action: () => toggleFavouriteChat(chat.id) },
                        { icon: List, label: chat.listedBy?.includes(user?.id || user?._id) ? 'Remove from list' : 'Add to list', action: () => toggleListChat(chat.id) },
                        { divider: true },
                        { icon: MinusCircle, label: 'Clear chat', action: async () => { await clearChatHistory(chat.id); showToast('Chat cleared'); } },
                        { 
                          icon: LogOut, 
                          label: chat.isGroup ? 'Exit group' : 
                                 (user?.blockedUsers?.includes(chat.members?.find(m => String(m._id || m.id || m) !== String(user?.id || user?._id))?.id || chat.members?.find(m => String(m._id || m.id || m) !== String(user?.id || user?._id))?._id || chat.members?.find(m => String(m._id || m.id || m) !== String(user?.id || user?._id))) ? 'Unblock user' : 'Block user'),
                          action: async () => { 
                            if (chat.isGroup) {
                              await exitGroup(chat.id);
                              showToast('Exited group');
                            } else {
                              // Members might be populated objects or raw string/ObjectIds
                              const recipient = chat.members?.find(m => String(m._id || m.id || m) !== String(user?.id || user?._id));
                              const recipientId = recipient?._id || recipient?.id || recipient;
                              
                              if (recipientId) {
                                if (user?.blockedUsers?.includes(recipientId)) {
                                  await unblockUser(recipientId);
                                  showToast('User unblocked');
                                } else {
                                  await blockUser(recipientId);
                                  showToast('User blocked');
                                }
                              }
                            }
                          } 
                        },
                      ].map((item, idx) => item.divider ? (
                        <div key={`div-${idx}`} style={{ height: '1px', background: 'var(--border-medium)', margin: '4px 0' }} />
                      ) : (
                        <button 
                          key={item.label}
                          onClick={(e) => { e.stopPropagation(); item.action(); setOpenChatMenu(null); }} 
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 16px', 
                            background: 'transparent', border: 'none', color: 'var(--text-primary)', 
                            fontSize: '14px', cursor: 'pointer', textAlign: 'left', fontWeight: 500,
                            transition: 'background 0.2s'
                          }} 
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} 
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <item.icon size={18} color="var(--text-secondary)" strokeWidth={2} /> 
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Unread accent bar */}
                {chat.unread > 0 && (
                  <div style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: '3px',
                    background: 'linear-gradient(180deg, #4C74F9, #6366F1)',
                    borderRadius: '0 3px 3px 0',
                    boxShadow: '0 0 6px rgba(76,116,249,0.4)',
                  }} />
                )}

                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0, marginLeft: chat.unread > 0 ? '5px' : '0' }}>
                  {chat.isGroup ? (
                    <div style={{
                      width: '46px', height: '46px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff',
                      boxShadow: '0 3px 12px rgba(124,58,237,0.3)',
                    }}>
                      <Users size={22} strokeWidth={2.2} />
                    </div>
                  ) : (
                    <div style={{
                      width: '46px', height: '46px',
                      borderRadius: '14px',
                      background: chat.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 800, color: '#fff',
                      fontFamily: 'Outfit, sans-serif',
                      boxShadow: `0 3px 12px ${chat.color}55`,
                      letterSpacing: '-0.01em',
                      overflow: 'hidden'
                    }}>
                      {chat.profilePic ? (
                        <img src={chat.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        chat.initials
                      )}
                    </div>
                  )}

                  {/* Online dot */}
                  {chat.online && !chat.isGroup && (
                    <div style={{
                      position: 'absolute', bottom: '-1px', right: '-1px',
                      width: '12px', height: '12px',
                      borderRadius: '50%',
                      background: '#22C55E',
                      border: '2px solid var(--bg-panel)',
                      boxShadow: '0 0 0 2px rgba(34,197,94,0.25)',
                    }} />
                  )}
                </div>

                {/* Meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                      {chat.isGroup && <Users size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                      <span style={{
                        fontSize: '14px', fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontFamily: 'Inter, sans-serif',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        filter: privacyMode ? 'blur(5px)' : 'none',
                      }}>
                        {chat.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {chat.pinnedBy?.includes(user?.id || user?._id) && (
                        <Pin size={12} color="var(--text-muted)" style={{ transform: 'rotate(45deg)' }} />
                      )}
                      <span style={{
                        fontSize: '11px',
                        color: chat.unread > 0 ? '#25D366' : 'var(--text-muted)',
                        fontWeight: chat.unread > 0 ? 700 : 500,
                      }}>
                        {chat.time}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{
                      fontSize: '13px',
                      color: chat.unread > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontWeight: chat.unread > 0 ? 600 : 400,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      flex: 1,
                      display: 'flex', alignItems: 'center', gap: '4px',
                      filter: privacyMode ? 'blur(4px)' : 'none',
                    }}>
                      {chat.lastMessageIsMine && chat.preview !== 'No messages yet' && (
                        <span style={{ display: 'flex', alignItems: 'center', marginTop: '1px' }}>
                          {chat.latestMessageStatus === 'read' ? (
                            <CheckCheck size={15} color="#3B82F6" strokeWidth={2.5} />
                          ) : chat.latestMessageStatus === 'delivered' ? (
                            <CheckCheck size={15} color="var(--text-muted)" strokeWidth={2.5} />
                          ) : (
                            <Check size={15} color="var(--text-muted)" strokeWidth={2.5} />
                          )}
                        </span>
                      )}
                      
                      {chat.latestMessageDeleted ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                          <Ban size={12} /> This message was deleted
                        </span>
                      ) : chat.latestMessageMediaType === 'image' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Camera size={13} /> Photo
                        </span>
                      ) : chat.latestMessageMediaType === 'audio' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Mic size={13} /> Audio
                        </span>
                      ) : (chat.latestMessageMediaType === 'file' || chat.latestMessageMediaType === 'document') ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <FileText size={13} /> {chat.preview && chat.preview !== 'File' && chat.preview !== 'Document' && chat.preview !== '📄 Document' && chat.preview !== 'Media Message' ? chat.preview : 'Document'}
                        </span>
                      ) : (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {chat.preview}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <span className="lang-badge">
                        {chat.isGroup ? 'MULTI' : chat.lang}
                      </span>
                      {chat.unread > 0 && (
                        <span className="unread-badge">{chat.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <NewChatModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
      <NewGroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
      <NewBroadcastModal isOpen={isBroadcastModalOpen} onClose={() => setIsBroadcastModalOpen(false)} />

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg-panel)', color: 'var(--text-primary)',
              padding: '12px 20px', borderRadius: '30px', fontSize: '14px', fontWeight: 500,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 100,
              border: '1px solid var(--border-medium)', whiteSpace: 'nowrap'
            }}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
