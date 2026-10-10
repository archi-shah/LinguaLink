import React, { useEffect, useMemo, useRef, useState } from 'react'

const SERVER_BASE = 'http://localhost:5000'
const toFullUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http') || path.startsWith('data:')) return path
  return `${SERVER_BASE}${path}`
}
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BellOff, Check, CheckCheck, Download, Info,
  MessageSquare, Phone,
  Pin, Search, Sparkles, Star,
  Users, User, Video, X, ChevronDown, ChevronLeft, ChevronRight, Trash2, Ban, AlertTriangle,
  CornerUpLeft, Copy, CornerUpRight, Send, MapPin, Archive, LogOut, Bell, MoreVertical, CheckSquare, CreditCard, Calendar
} from 'lucide-react'
import useStore from '../../store/useStore.js'
import { useCallStore } from '../../store/useCallStore.js'
import ChatInput from '../chat/ChatInput.jsx'
import VoiceNotePlayer from '../chat/VoiceNotePlayer.jsx'
import PollUI from '../chat/PollUI.jsx'
import EventUI from '../chat/EventUI.jsx'
import UserProfilePanel from './UserProfilePanel.jsx'
import { ImageMessage, VideoMessage, DocumentMessage, AudioPlayer } from '../chat/MediaComponents.jsx'

const LANGUAGE_LABELS = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
  ja: 'Japanese', zh: 'Chinese', ar: 'Arabic', de: 'German',
  it: 'Italian', pt: 'Portuguese',
}



const normalizeLang  = (lang) => String(lang || 'en').toLowerCase()
const shortLang      = (lang) => normalizeLang(lang).toUpperCase()
const languageName   = (lang) => LANGUAGE_LABELS[normalizeLang(lang)] || shortLang(lang)
const getUserLanguage = (user) =>
  normalizeLang(user?.language || user?.preferences?.language || user?.preferences?.primaryLanguage || 'en')
const getMessageText        = (msg) => msg.text || msg.originalText || msg.content || ''
const getMessageTranslation = (msg, targetLang) => {
  if (!targetLang) return msg.translation || msg.translated || msg.translatedText || ''
  const tl = normalizeLang(targetLang)
  // Check translations object (try lowercase key, then uppercase, then as-is)
  if (msg.translations) {
    if (msg.translations[tl]) return msg.translations[tl]
    if (msg.translations[tl.toUpperCase()]) return msg.translations[tl.toUpperCase()]
  }
  // If the message's own language IS the target, just return the original text (no translation needed)
  const msgLang = normalizeLang(msg.lang || msg.language || 'en')
  if (msgLang === tl) return getMessageText(msg)
  // Legacy fallback
  return msg.translation || msg.translated || msg.translatedText || ''
}
const getMessageLanguage    = (msg, fallback) => normalizeLang(msg.lang || msg.language || fallback || 'en')
const getSenderId = (senderId) => {
  if (!senderId) return ''
  if (typeof senderId === 'object') return String(senderId._id || senderId.id || '')
  return String(senderId)
}
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ── Helpers ──
const groupReactions = (reactions) => {
  if (!reactions || reactions.length === 0) return {}
  return reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {})
}

// ── Sub-components ──
function TaskUI({ msg, isSent }) {
  const { title, description, dueDate, status } = msg.metadata || {}
  return (
    <div style={{ minWidth: '220px', maxWidth: '300px', background: isSent ? 'rgba(255,255,255,0.1)' : 'var(--bg-hover)', borderRadius: '12px', padding: '14px', border: isSent ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-medium)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <CheckSquare size={18} color={isSent ? '#fff' : '#38BDF8'} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: isSent ? 'rgba(255,255,255,0.8)' : '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task Assignment</span>
      </div>
      <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: isSent ? '#fff' : 'var(--text-primary)' }}>{title}</h4>
      {description && <p style={{ margin: '0 0 10px', fontSize: '13px', color: isSent ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>{description}</p>}
      {dueDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isSent ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)', fontWeight: 600, background: isSent ? 'rgba(0,0,0,0.2)' : 'var(--bg-surface)', padding: '6px 10px', borderRadius: '8px' }}>
          <Calendar size={14} /> Due: {dueDate}
        </div>
      )}
    </div>
  )
}


function TypingIndicator({ isGroup }) {
  return (
    <motion.div
      className="premium-typing-row"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.22 }}
    >
      <div className="premium-typing-bubble">
        {[0, 1, 2].map(i => (
          <motion.span key={i}
            animate={{ y: [0, -4, 0], opacity: [0.38, 1, 0.38] }}
            transition={{ delay: i * 0.15, duration: 0.65, repeat: Infinity }}
          />
        ))}
      </div>
      <span>{isGroup ? 'Someone is typing...' : 'Typing...'}</span>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <div className="premium-chat-empty">
      <div className="chat-empty-pattern" aria-hidden="true" />
      <motion.div className="premium-empty-icon"
        initial={{ scale: 0.86, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <MessageSquare size={34} color="var(--primary)" strokeWidth={1.5} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.35 }}>
        <h2>Select a conversation</h2>
        <p>Choose a thread from the left to open secure translated messaging.</p>
      </motion.div>
    </div>
  )
}

// ── LOGIC BLOCK: CHAT WINDOW ──
// This is the main component that displays the active conversation.
// It fetches the currently selected chat from the global state, maps through
// all the messages, and displays them on the screen. It also handles the chat input bar.
export default function ChatWindow() {
  const {
    activeChat, chats, messages, privacyMode, user, autoTranslate,
    toggleStarMessage, selectionMode, selectedMessages, setSelectionMode,
    toggleMessageSelection, deleteMessage, typingUsers, addReaction,
    setReplyingTo, setInfoMsg, setForwardingMsg, togglePinMessage,
    forwardingMsg, infoMsg, forwardMessage, replyingTo, reportMessage,
    togglePinChat, toggleMuteChat, archiveChat, clearChatHistory, exitGroup,
    editMessage, viewLangOverride, setViewLangOverride
  } = useStore()

  const chat = chats.find(c => c.id === activeChat)
  const msgs = (messages[activeChat] || []).filter(m => {
    if (m.deletedBy?.includes(user?.id || user?._id)) return false
    if (m.deletedForEveryone) return false
    return true
  })

  const [openMessageMenu, setOpenMessageMenu] = useState(null)
  const chatTypingUsers = typingUsers[activeChat] || []
  const showTyping = chatTypingUsers.length > 0 && !chatTypingUsers.includes(user?.id || user?._id)

  const [showSearch,  setShowSearch]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInfo,    setShowInfo]    = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notice,      setNotice]      = useState('')
  const [forwardSearch, setForwardSearch] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [editingMsg,  setEditingMsg]   = useState(null)   // { id, text }
  const [editText,    setEditText]     = useState('')

  const { setCalling } = useCallStore()

  // Robustly resolve the peer ID for P2P calls — always returns a plain string
  const resolvedOtherId = useMemo(() => {
    const myId = String(user?.id || user?._id || '')
    if (chat?.otherId) return String(chat.otherId)
    if (!chat?.isGroup && chat?.members) {
      const other = chat.members.find(m => String(m._id || m.id) !== myId)
      const id = other?._id || other?.id
      return id ? String(id) : null
    }
    return null
  }, [chat, user])

  const bottomRef    = useRef()
  const noticeTimer  = useRef(null)

  const userLang    = getUserLanguage(user)
  const contactLang = normalizeLang(
    chat?.lang ||
    chat?.members?.find(m => String(m._id || m.id) !== String(user?.id || user?._id))?.language ||
    'en'
  )

  // Pinned messages
  const pinnedMessages = useMemo(() => msgs.filter(m => m.metadata?.pinned || m.pinned), [msgs])
  const latestPinned   = pinnedMessages[pinnedMessages.length - 1]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length, showTyping])

  useEffect(() => {
    setViewLangOverride(null)
  }, [activeChat, userLang])

  useEffect(() => {
    if (!openMessageMenu) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('.message-context-menu') && !e.target.closest('.message-bubble-container')) {
        setOpenMessageMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMessageMenu])

  const pushNotice = (text) => {
    setNotice(text)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2200)
  }

  const exportTranscript = () => {
    if (!chat) return
    const lines = msgs.map(msg => {
      const isSent = msg.type === 'sent' || getSenderId(msg.senderId) === String(user?.id || user?._id || '')
      return `[${msg.time || ''}] ${isSent ? 'Me' : chat.name}: ${getMessageText(msg)}`
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `${chat.name || 'chat'}-transcript.txt`; link.click()
    URL.revokeObjectURL(url)
    pushNotice('Transcript exported')
  }

  const isPinned = chat?.pinnedBy?.includes(user?.id || user?._id)
  const isMuted = chat?.mutedBy?.includes(user?.id || user?._id)
  const isArchived = chat?.archivedBy?.includes(user?.id || user?._id)

  const handleBulkDelete = async () => {
    if (selectedMessages.length === 0) return
    if (!window.confirm(`Delete ${selectedMessages.length} messages?`)) return
    for (const msgId of selectedMessages) await deleteMessage(msgId)
    pushNotice(`${selectedMessages.length} messages deleted`)
    setSelectionMode(false)
  }

  const searchMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    return msgs.filter(msg => `${getMessageText(msg)} ${getMessageTranslation(msg, userLang)}`.toLowerCase().includes(query))
  }, [msgs, searchQuery, userLang])

  const renderHighlightedText = (text) => {
    const query = searchQuery.trim()
    if (!query) return text
    const parts = String(text).split(new RegExp(`(${escapeRegExp(query)})`, 'ig'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="premium-search-mark">{part}</mark>
        : <React.Fragment key={i}>{part}</React.Fragment>
    )
  }

  const activeLang = viewLangOverride || userLang;

  if (!chat) return <EmptyState />

  const forwardChats = chats.filter(c => c.name?.toLowerCase().includes(forwardSearch.toLowerCase()))

  const isCommunityChat = chat?.isGroup && chat?.name?.includes(' — ')
  const isCommunityAdmin = isCommunityChat && chat?.admins?.includes(String(user?.id || user?._id || ''))

  return (
    <motion.div
      className="chat-bg-texture chat-window-shell premium-chat-window"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={activeChat}
      onClick={() => { if (openMessageMenu) setOpenMessageMenu(null) }}
      style={{ position: 'relative' }}
    >
      {/* ── Header ── */}
      <header className="premium-chat-header">
        <button
          className="mobile-only premium-icon-btn"
          style={{ marginRight: '8px' }}
          onClick={() => setActiveChat(null)}
        >
          <ChevronLeft size={24} />
        </button>
        <button onClick={() => setShowProfile(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 10px 6px 4px', borderRadius: '14px', textAlign: 'left',
            transition: 'background 0.2s',
            flex: 1, minWidth: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <div className="premium-chat-avatar" style={{ filter: privacyMode ? 'blur(6px)' : 'none' }}>
            {chat.isGroup ? <Users size={20} /> : (chat.profilePic ? (
              <>
                <img src={toFullUrl(chat.profilePic)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }} />
                <span style={{ display: 'none' }}>{chat.initials}</span>
              </>
            ) : <span>{chat.initials}</span>)}
          </div>
          <div className="premium-chat-title">
            <h2 style={{ filter: privacyMode ? 'blur(5px)' : 'none', margin: '0 0 3px' }}>{chat.name}</h2>
            <p style={{ margin: 0 }}>
              {chat.online !== undefined
                ? <><span className={chat.online ? 'led-active' : 'led-offline'} /> {chat.isGroup ? `${chat.members?.length || 0} members` : (chat.online ? 'Online' : 'Offline')}</>
                : <><span className="led-active" /> {chat.isGroup ? `${chat.members?.length || 0} members` : 'Online'}</>
              }
              {isMuted  && <span className="premium-header-state">Muted</span>}
              {isPinned && <span className="premium-header-state">Pinned</span>}
            </p>
          </div>
        </button>

        <div className="premium-header-actions">
          {!isCommunityChat && (
            <>
              <button
                className="premium-icon-btn"
                title="Voice call"
                onClick={() => {
                  if (chat.isGroup) {
                    if (window.__linguaStartGroupCall) window.__linguaStartGroupCall(chat.id, chat.name, false)
                    else pushNotice('Group calls initializing...')
                    return
                  }
                  if (!resolvedOtherId) { pushNotice('Cannot resolve contact ID'); return }
                  setCalling({ id: resolvedOtherId, name: chat.name, initials: chat.initials }, false)
                }}
              >
                <Phone size={16} />
              </button>
              <button
                className="premium-icon-btn"
                title="Video call"
                onClick={() => {
                  if (chat.isGroup) {
                    if (window.__linguaStartGroupCall) window.__linguaStartGroupCall(chat.id, chat.name, true)
                    else pushNotice('Group calls initializing...')
                    return
                  }
                  if (!resolvedOtherId) { pushNotice('Cannot resolve contact ID'); return }
                  setCalling({ id: resolvedOtherId, name: chat.name, initials: chat.initials }, true)
                }}
              >
                <Video size={16} />
              </button>
            </>
          )}
          <button className={`premium-icon-btn ${showSearch ? 'active' : ''}`} title="Search" onClick={() => setShowSearch(v => !v)}><Search size={16} /></button>
          {isCommunityChat && (
            <button className="premium-icon-btn" title="Menu" onClick={() => setShowInfo(true)}><MoreVertical size={16} /></button>
          )}
        </div>
      </header>

      {/* ── Search Bar ── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div className="premium-search-panel"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          >
            <Search size={16} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search in this conversation" autoFocus />
            <span>{searchQuery.trim() ? `${searchMatches.length} found` : 'Ready'}</span>
            <button type="button" onClick={() => { setSearchQuery(''); setShowSearch(false) }}><X size={15} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pinned Message Banner ── */}
      <AnimatePresence>
        {latestPinned && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
          >
            <div style={{ width: '3px', height: '32px', background: 'var(--primary)', borderRadius: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginBottom: '1px' }}>📌 Pinned Message</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getMessageText(latestPinned) || 'Media message'}
              </div>
            </div>
            <button type="button"
              onClick={() => togglePinMessage && togglePinMessage(latestPinned._id || latestPinned.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
            ><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Message List ── */}
      <main className="premium-message-list">
        <div className="premium-chat-brief">
          <div><Sparkles size={15} /><span>Messages display in each participant's preferred language.</span></div>
        </div>
        <AnimatePresence initial={false}>
          {msgs.flatMap((msg, index) => {
            const currentMsgDate = new Date(msg.createdAt || msg.time || Date.now());
            const prevMsg = index > 0 ? msgs[index - 1] : null;
            const prevMsgDate = prevMsg ? new Date(prevMsg.createdAt || prevMsg.time || Date.now()) : null;
            const showDateDivider = !prevMsgDate || currentMsgDate.toDateString() !== prevMsgDate.toDateString();
            
            const formatDateDivider = (dateObj) => {
              const d = new Date(dateObj);
              if (isNaN(d.getTime())) return '';
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              if (d.toDateString() === today.toDateString()) return 'Today';
              if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
              return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            };

            const senderId      = getSenderId(msg.senderId)
            const isSent        = msg.type === 'sent' || senderId === String(user?.id || user?._id || '')
            const sourceText    = getMessageText(msg)
            const translatedText = getMessageTranslation(msg, activeLang)
            const sourceLang    = getMessageLanguage(msg, isSent ? userLang : contactLang)
            // For sent messages: show translation when user has overridden to a different language
            // For received messages: show translation when autoTranslate is on
            const sentTranslated = isSent && viewLangOverride && viewLangOverride !== sourceLang && translatedText
            const displayText   = sentTranslated
              ? translatedText
              : (!isSent && autoTranslate && translatedText ? translatedText : sourceText)
            const displayLang   = sentTranslated
              ? activeLang
              : (isSent ? sourceLang : (autoTranslate && translatedText ? activeLang : sourceLang))
            const languageMeta  = sentTranslated
              ? `${shortLang(sourceLang)} → ${shortLang(activeLang)}`
              : (isSent ? shortLang(sourceLang)
                : (translatedText && autoTranslate ? `${shortLang(sourceLang)} → ${shortLang(activeLang)}` : shortLang(sourceLang)))
            const showName      = chat.isGroup && !isSent && (index === 0 || getSenderId(msgs[index - 1]?.senderId) !== senderId || showDateDivider)
            const reactionGroups = groupReactions(msg.reactions)
            const hasReactions  = Object.keys(reactionGroups).length > 0
            const replyTo       = msg.metadata?.replyTo
            const isPinned      = msg.metadata?.pinned || msg.pinned
            const msgKey        = msg._id || msg.id

            const elements = [];
            if (showDateDivider) {
              elements.push(
                <motion.div key={`date-${currentMsgDate.toDateString()}`} className="premium-date-separator" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <span>{formatDateDivider(currentMsgDate)}</span>
                </motion.div>
              );
            }

            elements.push(
              <motion.div
                key={msgKey || `${sourceText}-${index}`}
                layout="position"
                className={`premium-message-row ${isSent ? 'sent' : 'received'}`}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {showName && (
                  <span className="premium-sender-name">
                    {msg.senderName || msg.senderId?.name || msg.sender || 'Member'}
                    {msg.senderId?.role === 'admin' && (
                      <span className="admin-badge" style={{ marginLeft: '6px', background: 'var(--primary)', color: '#fff', fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Admin</span>
                    )}
                  </span>
                )}

                <div
                  className="premium-message-stack"
                  style={{ alignItems: 'flex-end', gap: '8px', position: 'relative' }}
                  onMouseLeave={() => setOpenMessageMenu(null)}
                >
                  {selectionMode && (
                    <input type="checkbox"
                      checked={selectedMessages.includes(msgKey)}
                      onChange={() => toggleMessageSelection(msgKey)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  )}

                  {!isSent && (
                    <div className="premium-mini-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                      {(() => {
                        // For 1-1 chats, use the chat-level profilePic (already full URL or empty)
                        // For groups, use the senderId.profilePic from populated message
                        const avatarUrl = chat.isGroup
                          ? toFullUrl(msg.senderId?.profilePic || '')
                          : toFullUrl(chat.profilePic || '')
                        return avatarUrl ? (
                          <>
                            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                            <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.2))', color: 'var(--primary)' }}>
                              {(chat.isGroup ? (msg.senderId?.initials || msg.senderName?.substring(0,2).toUpperCase()) : chat.initials) || '?'}
                            </div>
                          </>
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.2))', color: 'var(--primary)' }}>
                            {(chat.isGroup ? (msg.senderId?.initials || msg.senderName?.substring(0,2).toUpperCase()) : chat.initials) || '?'}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Bubble + Reactions column */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSent ? 'flex-end' : 'flex-start', gap: '4px' }}>
                    <div className={`premium-bubble ${isSent ? 'sent' : 'received'}`}>
                      {/* Chevron toggle */}
                      <div
                        onClick={() => setOpenMessageMenu(openMessageMenu === msgKey ? null : msgKey)}
                        style={{ position: 'absolute', top: '4px', right: '4px', cursor: 'pointer', opacity: 0.6, padding: '2px', borderRadius: '50%', zIndex: 10 }}
                      >
                        <ChevronDown size={18} color={isSent ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'} />
                      </div>

                      {msg.deleted ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isSent ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', fontStyle: 'italic', fontSize: '14.5px', padding: '4px 0', marginTop: '6px' }}>
                          <Ban size={15} /> This message was deleted
                        </div>
                      ) : (
                        <>
                          <div className="premium-bubble-top">
                            <span>{languageMeta}</span>
                            {isPinned && <Pin size={11} style={{ opacity: 0.7, marginLeft: 'auto' }} />}
                          </div>

                          {/* ── Reply Quote ── */}
                          {replyTo && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                              style={{
                                borderLeft: `3px solid ${isSent ? 'rgba(255,255,255,0.55)' : 'var(--primary)'}`,
                                background: isSent ? 'rgba(0,0,0,0.18)' : 'rgba(124,58,237,0.09)',
                                borderRadius: '6px', padding: '6px 10px', marginBottom: '8px',
                              }}
                            >
                              <div style={{ fontWeight: 700, fontSize: '11.5px', color: isSent ? 'rgba(255,255,255,0.85)' : 'var(--primary)', marginBottom: '2px' }}>
                                {replyTo.sender || 'Someone'}
                              </div>
                              <div style={{ fontSize: '12.5px', color: isSent ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '210px' }}>
                                {replyTo.text || 'Message'}
                              </div>
                            </motion.div>
                          )}

                          {/* ── Content ── */}
                          {msg.mediaType === 'audio' && msg.mediaUrl ? (
                            <VoiceNotePlayer msg={msg} isSent={isSent} />
                          ) : msg.mediaType === 'poll' && msg.metadata ? (
                            <PollUI msg={msg} chatId={chat._id || chat.id} isSent={isSent} />
                          ) : msg.mediaType === 'event' && msg.metadata ? (
                            <EventUI msg={msg} isSent={isSent} chatId={chat._id || chat.id} />
                          ) : msg.mediaType === 'task' && msg.metadata ? (
                            <TaskUI msg={msg} isSent={isSent} />
                          ) : msg.mediaType === 'location' && msg.metadata ? (
                            <div style={{ minWidth: '200px' }}>
                              <div style={{ height: '120px', background: 'var(--bg-hover)', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden', position: 'relative' }}>
                                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(2,132,199,0.1) 2px, transparent 2px)', backgroundSize: '16px 16px', opacity: 0.5 }} />
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(2,132,199,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <MapPin size={20} color="#0284C7" fill="#fff" />
                                </div>
                              </div>
                              <a href={`https://maps.google.com/?q=${msg.metadata.latitude},${msg.metadata.longitude}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: isSent ? '#fff' : 'var(--primary)', fontWeight: 600, fontSize: '14px', padding: '0 4px' }}>
                                View Location <ChevronRight size={16} />
                              </a>
                            </div>
                          ) : msg.mediaType === 'contact' && msg.metadata ? (() => {
                            const meta = msg.metadata
                            const rawIdentifier = meta.identifier || meta.email || meta.phone || null
                            const isEmail = rawIdentifier?.includes('@')
                            const displayContact = rawIdentifier
                              ? rawIdentifier.trim()
                              : (meta.phone || meta.email || null)
                            return (
                              <div style={{ minWidth: '200px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: isSent ? 'rgba(255,255,255,0.2)' : 'rgba(232,67,147,0.15)', color: isSent ? '#fff' : '#E84393', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <User size={22} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <h4 style={{ margin: '0 0 3px', fontSize: '15px', fontWeight: 700, color: isSent ? '#fff' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.name}</h4>
                                  {displayContact ? (
                                    <p style={{ margin: 0, fontSize: '12px', color: isSent ? 'rgba(255,255,255,0.85)' : (isEmail ? '#0EA5E9' : '#10B981'), fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ opacity: 0.8 }}>{isEmail ? '✉️' : '📱'}</span>
                                      {displayContact}
                                    </p>
                                  ) : (
                                    <p style={{ margin: 0, fontSize: '12px', color: isSent ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', fontStyle: 'italic' }}>LinguaLink User</p>
                                  )}
                                </div>
                              </div>
                            )
                          })() : msg.mediaType === 'image' && (msg.mediaUrl || msg.metadata?.dataUrl || msg.metadata?.uploading) ? (
                            <ImageMessage msg={msg} isSent={isSent} onImageClick={setSelectedImage} />
                          ) : msg.mediaType === 'video' ? (
                            <VideoMessage msg={msg} isSent={isSent} />
                          ) : (msg.mediaType === 'document' || msg.mediaType === 'file') ? (
                            <DocumentMessage msg={msg} isSent={isSent} />
                          ) : msg.mediaType === 'audio' ? (
                            <>
                              <VoiceNotePlayer msg={msg} isSent={isSent} />
                              {(displayText || sourceText) && (displayText !== '🎤 Audio Message' && sourceText !== '🎤 Audio Message') && (
                                <p style={{ filter: privacyMode ? 'blur(4px)' : 'none', marginTop: '8px', fontSize: '13px', fontStyle: 'italic', opacity: 0.9 }}>
                                  {renderHighlightedText(displayText || sourceText)}
                                </p>
                              )}
                            </>
                          ) : msg.mediaType === 'sticker' && msg.metadata ? (
                             <div style={{ fontSize: '72px', lineHeight: 1, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))', textAlign: 'center', background: 'transparent' }}>
                               {msg.metadata.sticker || sourceText}
                             </div>
                          ) : (
                            <p style={{ filter: privacyMode ? 'blur(4px)' : 'none' }}>
                              {renderHighlightedText(displayText || sourceText)}
                            </p>
                          )}
                        </>
                      )}

                      {/* Footer */}
                      <div className="premium-bubble-footer">
                        <span>{languageName(displayLang)}</span>
                        {(msg.edited || msg.isEdited) && (
                          <span style={{ fontSize: '10px', opacity: 0.65, fontStyle: 'italic' }}>edited</span>
                        )}
                        <span>{msg.time || 'Now'}</span>
                        {user?.starredMessages?.includes(msgKey) && <Star size={12} fill="currentColor" style={{ opacity: 0.8 }} />}
                        <button onClick={() => toggleStarMessage(msgKey)} className="star-btn" title={user?.starredMessages?.includes(msgKey) ? 'Unstar' : 'Star'}>
                          <Star size={14} />
                        </button>
                        {isSent && (() => {
                          let isRead = msg.status === 'read' || msg.ticks === 3
                          let isDelivered = msg.status === 'delivered' || msg.ticks === 2
                          if (chat.isGroup) {
                            const otherMembersCount = Math.max(0, (chat.members?.length || 0) - 1)
                            const readCount = msg.readBy?.length || 0
                            isRead = (readCount >= otherMembersCount && otherMembersCount > 0)
                            if (isRead) isDelivered = true
                          }
                          if (isRead) return <CheckCheck size={14} color="#00E5FF" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                          if (isDelivered) return <CheckCheck size={14} color="rgba(255,255,255,0.7)" />
                          return <Check size={14} color="rgba(255,255,255,0.7)" />
                        })()}
                      </div>
                    </div>

                    {/* ── Emoji Reactions Display ── */}
                    {hasReactions && (
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}
                      >
                        {Object.entries(reactionGroups).map(([emoji, count]) => (
                          <motion.button key={emoji}
                            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                            onClick={() => addReaction && addReaction(msgKey, emoji)}
                            style={{
                              background: 'var(--bg-panel)', border: '1.5px solid var(--border-light)',
                              borderRadius: '20px', padding: '3px 9px', fontSize: '14px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '4px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            }}
                          >
                            {emoji}
                            {count > 1 && <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>{count}</span>}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {isSent && (
                    <div className="premium-mini-avatar sent" style={{ overflow: 'hidden', padding: 0 }}>
                      {user?.profilePic ? (
                        <>
                          <img src={toFullUrl(user.profilePic)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                          <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                            {user?.initials || 'Me'}
                          </div>
                        </>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                          {user?.initials || 'Me'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Context Menu ── */}
                  <AnimatePresence>
                    {openMessageMenu === msgKey && (
                      <motion.div
                        className="message-context-menu"
                        initial={{ opacity: 0, scale: 0.82, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.82, y: -8 }}
                        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          position: 'absolute', top: '35px', [isSent ? 'right' : 'left']: '40px',
                          zIndex: 100, background: 'var(--bg-panel)', borderRadius: '16px',
                          transformOrigin: isSent ? 'top right' : 'top left',
                          boxShadow: '0 16px 48px rgba(0,0,0,0.45)', border: '1px solid var(--border-medium)',
                          minWidth: '220px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Quick emoji bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 12px', borderBottom: '1px solid var(--border-medium)', background: 'var(--bg-hover)' }}>
                          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                            <motion.span key={emoji}
                              whileHover={{ scale: 1.4, y: -4 }} whileTap={{ scale: 0.85 }}
                              style={{ fontSize: '20px', cursor: 'pointer', padding: '2px 4px', display: 'inline-block' }}
                              onClick={e => {
                                e.stopPropagation()
                                addReaction && addReaction(msgKey, emoji)
                                setOpenMessageMenu(null)
                              }}
                            >{emoji}</motion.span>
                          ))}
                        </div>

                        {/* Action items */}
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 0' }}>
                          {[
                            { icon: Info,         label: 'Message info', action: () => { setInfoMsg(msg); setOpenMessageMenu(null) } },
                            { icon: CornerUpLeft, label: 'Reply',         action: () => { setReplyingTo(msg); setOpenMessageMenu(null) } },
                            ...(isSent && !msg.deleted && !msg.deletedForEveryone && msg.mediaType === 'text'
                              ? [{ icon: MessageSquare, label: 'Edit', action: () => { setEditingMsg({ id: msg._id || msg.id, originalText: getMessageText(msg) }); setEditText(getMessageText(msg)); setOpenMessageMenu(null) } }]
                              : []),
                            { icon: Copy,         label: 'Copy',          action: () => { navigator.clipboard.writeText(getMessageText(msg)); pushNotice('Copied!'); setOpenMessageMenu(null) } },
                            { icon: CornerUpRight,label: 'Forward',       action: () => { setForwardingMsg(msg); setOpenMessageMenu(null) } },
                            { icon: AlertTriangle,label: 'Report',        action: () => { 
                                const reason = window.prompt("Why are you reporting this message?");
                                if (reason) {
                                  reportMessage(msgKey, reason);
                                  pushNotice("Message reported to admins");
                                }
                                setOpenMessageMenu(null);
                              }, color: '#EF4444' 
                            },
                            { icon: Pin,          label: isPinned ? 'Unpin' : 'Pin', action: () => { togglePinMessage && togglePinMessage(msgKey); pushNotice(isPinned ? 'Unpinned' : 'Pinned'); setOpenMessageMenu(null) } },
                            { icon: Star,         label: user?.starredMessages?.includes(msgKey) ? 'Unstar' : 'Star', action: () => { toggleStarMessage(msgKey); pushNotice(user?.starredMessages?.includes(msgKey) ? 'Unstarred' : 'Starred'); setOpenMessageMenu(null) } },
                            { divider: true },
                            { icon: Trash2, label: 'Delete for me', action: () => { deleteMessage(msgKey, 'for_me'); setOpenMessageMenu(null) }, color: '#EF4444' },
                            ...(isSent && !msg.deleted && !msg.deletedForEveryone
                              ? [{ icon: Ban, label: 'Delete for everyone', action: () => { deleteMessage(msgKey, 'for_everyone'); setOpenMessageMenu(null) }, color: '#EF4444' }]
                              : []),
                          ].map((item, idx) => item.divider ? (
                            <div key={`div-${idx}`} style={{ height: '1px', background: 'var(--border-medium)', margin: '4px 0' }} />
                          ) : (
                            <motion.button key={item.label}
                              whileHover={{ background: 'var(--bg-hover)' }}
                              onClick={e => { e.stopPropagation(); item.action() }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 16px',
                                background: 'rgba(0,0,0,0)', border: 'none', color: item.color || 'var(--text-primary)',
                                fontSize: '14px', cursor: 'pointer', textAlign: 'left', fontWeight: 500, width: '100%',
                              }}
                            >
                              <item.icon size={17} color={item.color || 'var(--text-secondary)'} strokeWidth={2} />
                              {item.label}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
            return elements;
          })}
        </AnimatePresence>

        <AnimatePresence>
          {showTyping && <TypingIndicator isGroup={chat.isGroup} />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </main>

      {/* ── Input / Selection Bar ── */}
      {selectionMode ? (
        <div style={{ padding: '12px 20px', background: 'var(--bg-panel)', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedMessages.length} selected</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setSelectionMode(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleBulkDelete} disabled={selectedMessages.length === 0}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: selectedMessages.length > 0 ? '#EF4444' : 'var(--bg-hover)', color: selectedMessages.length > 0 ? '#fff' : 'var(--text-muted)', cursor: selectedMessages.length > 0 ? 'pointer' : 'not-allowed' }}
            >Delete</button>
          </div>
        </div>
      ) : (
        <div style={{ borderTop: '1px solid var(--border-light)' }}>
          {/* ── WhatsApp-style Reply Preview Bar ── */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                key="reply-bar"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 16px',
                  background: 'var(--bg-hover)',
                  borderLeft: '3px solid var(--primary)',
                }}
              >
                <CornerUpLeft size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginBottom: '2px' }}>
                    Replying to {replyingTo?.senderName || replyingTo?.sender || 'message'}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getMessageText(replyingTo) || 'Media message'}
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', flexShrink: 0 }}
                >
                  <X size={15} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Edit Message Bar ── */}
          <AnimatePresence>
            {editingMsg && (
              <motion.div
                key="edit-bar"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                style={{ background: 'var(--bg-hover)', borderLeft: '3px solid #F59E0B', padding: '10px 16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MessageSquare size={13} color="#F59E0B" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B' }}>Edit Message</span>
                  <button onClick={() => setEditingMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}>
                    <X size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (editText.trim()) {
                          editMessage(editingMsg.id, editText.trim())
                          setEditingMsg(null); setEditText('')
                          pushNotice('Message edited')
                        }
                      }
                      if (e.key === 'Escape') { setEditingMsg(null); setEditText('') }
                    }}
                    autoFocus
                    rows={1}
                    style={{
                      flex: 1, resize: 'none', background: 'var(--bg-surface)', border: '1.5px solid var(--border-medium)',
                      borderRadius: '10px', padding: '8px 12px', fontSize: '14px', color: 'var(--text-primary)',
                      outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: '100px', overflow: 'auto'
                    }}
                  />
                  <button
                    onClick={() => {
                      if (editText.trim()) {
                        editMessage(editingMsg.id, editText.trim())
                        setEditingMsg(null); setEditText('')
                        pushNotice('Message edited')
                      }
                    }}
                    style={{
                      padding: '8px 16px', borderRadius: '10px', border: 'none',
                      background: editText.trim() ? 'linear-gradient(135deg,#7C3AED,#6366F1)' : 'var(--bg-hover)',
                      color: editText.trim() ? '#fff' : 'var(--text-muted)',
                      fontSize: '13px', fontWeight: 700, cursor: editText.trim() ? 'pointer' : 'default',
                      transition: 'all 0.2s', flexShrink: 0
                    }}
                  >Save</button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Press Enter to save · Esc to cancel
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isCommunityChat && !isCommunityAdmin ? (
            <div style={{ padding: '16px', background: 'var(--bg-panel)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Info size={16} /> Only community admins can send messages here.
            </div>
          ) : (!chat?.isGroup && user?.blockedUsers?.map(String).includes(resolvedOtherId)) ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#EF4444', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Ban size={24} />
              <div style={{ fontWeight: 600 }}>You have blocked this contact</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Unblock to send messages</div>
            </div>
          ) : (
            <ChatInput />
          )}

        </div>
      )}


      {/* ── Toast ── */}
      <AnimatePresence>
        {notice && (
          <motion.div className="premium-chat-toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat Info Drawer ── */}
      <AnimatePresence>
        {showInfo && (
          <>
            {/* Overlay to close drawer on outside click */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, zIndex: 40 }}
              onClick={() => setShowInfo(false)}
            />
            <motion.aside className="premium-info-drawer" style={{ zIndex: 50, position: 'absolute', right: 0, top: 0, bottom: 0 }} initial={{ x: 360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 360, opacity: 0 }}>
              <div className="premium-info-head">
                <div><h3>Chat Info</h3><p>{chat.name}</p></div>
                <button type="button" onClick={() => setShowInfo(false)}><X size={16} /></button>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div className="premium-info-avatar">{chat.initials}</div>
                <div className="premium-info-grid">
                  {!chat.isGroup && <div><span>Receiver language</span><strong>{languageName(contactLang)}</strong></div>}
                  <div><span>Encryption</span><strong>Enabled</strong></div>
                  <div><span>Messages</span><strong>{msgs.length}</strong></div>
                </div>

                {chat.isGroup && (
                  <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-light)' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {chat.members?.length || 0} Members
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {chat.members?.map(m => {
                        const mId = String(m._id || m.id)
                        const isAdmin = chat.admins?.includes(mId)
                        const isMe = mId === String(user?.id || user?._id || '')
                        return (
                          <div key={mId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(76,116,249,0.15), rgba(99,102,241,0.15))', border: '1px solid rgba(76,116,249,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '15px', fontWeight: 800, flexShrink: 0, overflow: 'hidden' }}>
                              {m.profilePic ? <img src={m.profilePic} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : (m.initials || m.name?.substring(0, 2).toUpperCase() || 'U')}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {m.name || 'Unknown User'} {isMe && <span style={{opacity: 0.6}}>(You)</span>}
                                </div>
                                {isAdmin && <span style={{ fontSize: '10px', fontWeight: 800, background: 'var(--primary)', color: '#fff', padding: '2px 6px', borderRadius: '6px' }}>Admin</span>}
                              </div>
                              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                {m.identifier || 'No contact info'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div style={{ padding: '4px 8px' }}>
                  <button type="button" className="premium-info-action" onClick={() => { setMuted(v => !v); pushNotice(muted ? 'Unmuted' : 'Muted') }}>
                    <BellOff size={16} /> {muted ? 'Unmute notifications' : 'Mute notifications'}
                  </button>
                  <button type="button" className="premium-info-action" onClick={exportTranscript}>
                    <Download size={16} /> Export transcript
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Message Info Drawer ── */}
      <AnimatePresence>
        {infoMsg && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 45 }}
              onClick={() => setInfoMsg(null)}
            />
            <motion.aside
              initial={{ x: 360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 360, opacity: 0 }}
              style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: '320px',
                background: 'var(--bg-panel)', borderLeft: '1px solid var(--border-light)',
                display: 'flex', flexDirection: 'column', zIndex: 50,
                boxShadow: '-8px 0 32px rgba(0,0,0,0.15)'
              }}
            >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <button onClick={() => setInfoMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Message Info</h3>
            </div>

            {/* Message preview */}
            <div style={{ padding: '16px' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--primary), #6366F1)', borderRadius: '14px', padding: '12px 16px', color: '#fff', fontSize: '14px', lineHeight: 1.55, maxWidth: '90%', marginLeft: 'auto' }}>
                {getMessageText(infoMsg) || 'Media message'}
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{infoMsg.time || 'Just now'}</span>
                {(infoMsg.ticks === 2 || infoMsg.status === 'read')
                  ? <CheckCheck size={14} style={{ color: infoMsg.status === 'read' ? '#00E5FF' : 'var(--text-muted)' }} />
                  : <Check size={14} style={{ color: 'var(--text-muted)' }} />
                }
              </div>
            </div>

            {/* Delivery timeline */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Delivery Status</h4>
              {[
                { icon: Check, label: 'Sent', color: 'var(--text-muted)', done: true },
                { icon: CheckCheck, label: 'Delivered', color: 'var(--text-muted)', done: infoMsg.status === 'delivered' || infoMsg.status === 'read' },
                { icon: CheckCheck, label: 'Read', color: '#00E5FF', done: infoMsg.status === 'read' },
              ].map(({ icon: Icon, label, color, done }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', opacity: done ? 1 : 0.35 }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: done ? 'rgba(0,229,255,0.1)' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} style={{ color: done ? color : 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{done ? (infoMsg.time || 'Just now') : '—'}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reactions */}
            {infoMsg.reactions && infoMsg.reactions.length > 0 && (
              <div style={{ padding: '16px 20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reactions ({infoMsg.reactions.length})</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {Object.entries(groupReactions(infoMsg.reactions)).map(([emoji, count]) => (
                    <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-hover)', borderRadius: '20px', padding: '6px 14px', border: '1.5px solid var(--border-light)' }}>
                      <span style={{ fontSize: '20px' }}>{emoji}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Forward Modal ── */}
      <AnimatePresence>
        {forwardingMsg && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={() => { setForwardingMsg(null); setForwardSearch('') }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.88, y: 20, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-panel)', borderRadius: '22px', width: '380px', maxHeight: '540px', display: 'flex', flexDirection: 'column', boxShadow: '0 28px 80px rgba(0,0,0,0.55)', border: '1px solid var(--border-light)', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Forward Message</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Choose a conversation</p>
                </div>
                <button onClick={() => { setForwardingMsg(null); setForwardSearch('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', borderRadius: '8px' }}
                ><X size={18} /></button>
              </div>

              {/* Message preview strip */}
              <div style={{ margin: '12px 16px 0', background: 'var(--bg-hover)', borderRadius: '12px', padding: '10px 14px', borderLeft: '3px solid var(--primary)' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getMessageText(forwardingMsg) || 'Media message'}
                </div>
              </div>

              {/* Search */}
              <div style={{ margin: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-light)', padding: '0 12px' }}>
                <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  value={forwardSearch} onChange={e => setForwardSearch(e.target.value)}
                  placeholder="Search conversations..." autoFocus
                  style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: '14px', color: 'var(--text-primary)', padding: '10px 4px' }}
                />
                {forwardSearch && (
                  <button onClick={() => setForwardSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Chat list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 8px' }}>
                {forwardChats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>No conversations found</div>
                ) : forwardChats.map(c => (
                  <motion.button key={c.id}
                    whileHover={{ background: 'var(--bg-hover)' }} whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      if (forwardMessage) await forwardMessage(forwardingMsg, c.id)
                      setForwardingMsg(null); setForwardSearch('')
                      pushNotice(`Forwarded to ${c.name}`)
                    }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, background: c.color || 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700 }}>
                      {c.isGroup ? <Users size={18} /> : (c.initials || '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.preview || 'Tap to forward'}</div>
                    </div>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Send size={14} style={{ color: 'var(--primary)', marginLeft: '2px' }} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── User Profile Panel ── portal onto body so fixed positioning works correctly */}
      {createPortal(
        <AnimatePresence>
          {showProfile && (
            <UserProfilePanel
              chat={chat} user={user}
              onClose={() => setShowProfile(false)}
              onCall={() => {
                setShowProfile(false)
                if (chat.isGroup && window.__linguaStartGroupCall) window.__linguaStartGroupCall(chat.id, chat.name, false)
                else if (!chat.isGroup && resolvedOtherId) setCalling({ id: resolvedOtherId, name: chat.name, initials: chat.initials }, false)
              }}
              onVideoCall={() => {
                setShowProfile(false)
                if (chat.isGroup && window.__linguaStartGroupCall) window.__linguaStartGroupCall(chat.id, chat.name, true)
                else if (!chat.isGroup && resolvedOtherId) setCalling({ id: resolvedOtherId, name: chat.name, initials: chat.initials }, true)
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Full Size Image Modal (Production Level) ── */}
      <AnimatePresence>
        {selectedImage && (() => {
          // Find all image messages in current chat
          const allImages = msgs
            .filter(m => m.mediaType === 'image' && (m.mediaUrl || m.metadata?.dataUrl))
            .map(m => toFullUrl(m.mediaUrl || m.metadata?.dataUrl))

          const currentIndex = allImages.indexOf(selectedImage)
          const hasPrev = currentIndex > 0
          const hasNext = currentIndex < allImages.length - 1
          
          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: 'rgba(0,0,0,0.95)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}
              onClick={() => setSelectedImage(null)}
            >
              {/* Header / Toolbar */}
              <div
                style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)', zIndex: 10 }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, opacity: 0.9 }}>
                  {currentIndex !== -1 ? `${currentIndex + 1} / ${allImages.length}` : 'Photo'}
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = selectedImage
                      link.download = `LinguaLink_Photo_${Date.now()}.jpg`
                      link.click()
                    }}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    title="Download"
                  ><Download size={20} /></button>
                  <button
                    onClick={() => setSelectedImage(null)}
                    style={{ background: 'rgba(239,68,68,0.25)', border: 'none', color: '#EF4444', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.45)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                    title="Close"
                  ><X size={20} /></button>
                </div>
              </div>

              {/* Navigation Prev */}
              {hasPrev && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedImage(allImages[currentIndex - 1]) }}
                  style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)', zIndex: 10, transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)' }}
                ><ChevronLeft size={32} /></button>
              )}

              {/* Image */}
              <motion.div
                key={selectedImage}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={e => e.stopPropagation()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 'calc(100vw - 160px)', maxHeight: 'calc(100vh - 120px)' }}
              >
                <img
                  src={selectedImage}
                  alt="Full screen view"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 120px)',
                    objectFit: 'contain',
                    borderRadius: '12px',
                    filter: 'drop-shadow(0 24px 64px rgba(0,0,0,0.9))',
                    display: 'block',
                    userSelect: 'none'
                  }}
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              </motion.div>

              {/* Navigation Next */}
              {hasNext && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedImage(allImages[currentIndex + 1]) }}
                  style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)', zIndex: 10, transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)' }}
                ><ChevronRight size={32} /></button>
              )}
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </motion.div>
  )
}
