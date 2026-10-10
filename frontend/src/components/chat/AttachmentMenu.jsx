import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, BarChart2, Calendar, MapPin, Camera, Image, Music, User, X, MapIcon, Check, Headphones, Sticker as StickerIcon, CreditCard, CheckSquare } from 'lucide-react'
import useStore from '../../store/useStore'
import { useEffect } from 'react'

// ── Glass Modal Styles ──
const glassModalOverlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.4)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'
}

const glassModalContent = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.85))',
  borderRadius: '24px', padding: '28px', width: '380px',
  boxShadow: '0 32px 80px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,1)',
  border: '1px solid rgba(255,255,255,0.8)',
}

const darkGlassModalContent = {
  background: 'linear-gradient(145deg, rgba(17,10,30,0.94), rgba(10,6,20,0.85))',
  borderRadius: '24px', padding: '28px', width: '380px',
  boxShadow: '0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
  border: '1px solid rgba(139,92,246,0.18)',
}

const glassInput = {
  width: '100%', padding: '12px 16px', borderRadius: '12px',
  border: '1px solid var(--border-medium)', background: 'var(--bg-hover)',
  color: 'var(--text-primary)', fontSize: '14px', marginBottom: '14px', outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
}

// ── Poll Modal ──────────────────────────────────────────────
function PollModal({ onClose, onSend }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(true)
  
  const isDark = document.documentElement.classList.contains('dark')

  return createPortal(
    <div style={glassModalOverlay} onClick={onClose}>
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        style={isDark ? darkGlassModalContent : glassModalContent} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.12)', color: '#2563EB' }}><BarChart2 size={18} /></span>
            Create Vote
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        
        {/* Question Section */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', marginLeft: '2px' }}>Question</p>
          <input 
            value={question} 
            onChange={e => setQuestion(e.target.value)} 
            placeholder="Ask question"
            style={{ ...glassInput, padding: '11px 14px' }} 
            autoFocus 
          />
        </div>
            
        {/* Options Section */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', marginLeft: '2px' }}>Options</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  value={opt} 
                  onChange={e => { 
                    const o = [...options]; 
                    o[i] = e.target.value; 
                    if (i === options.length - 1 && e.target.value && options.length < 12) o.push('');
                    setOptions(o) 
                  }}
                  placeholder="Add option"
                  style={{ ...glassInput, marginBottom: 0, padding: '11px 14px', flex: 1 }} 
                />
              </div>
            ))}
          </div>
        </div>

        {/* Multiple Answers Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '8px 4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Allow multiple answers</span>
          <button type="button" 
            onClick={() => setAllowMultiple(!allowMultiple)}
            style={{
              width: '40px', height: '24px', borderRadius: '12px',
              background: allowMultiple ? '#16A34A' : 'var(--bg-hover)',
              border: 'none', position: 'relative', cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
              position: 'absolute', top: '3px', left: allowMultiple ? '19px' : '3px',
              transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-medium)', background: 'var(--bg-hover)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancel</button>
          <button type="button" 
            onClick={() => {
              const validOptions = options.filter(o => o.trim()).map(o => ({ text: o.trim(), votes: [] }))
              if (!question.trim() || validOptions.length < 2) return
              onSend({ text: `🗳️ Vote: ${question}`, mediaType: 'poll', metadata: { question: question.trim(), options: validOptions, allowMultiple } })
              onClose()
            }}
            style={{ flex: 1.5, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#2563EB,#3B82F6)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', opacity: (!question.trim() || options.filter(o=>o.trim()).length < 2) ? 0.6 : 1 }}
            disabled={!question.trim() || options.filter(o=>o.trim()).length < 2}
          >
            Send Vote
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

// ── Event Modal ─────────────────────────────────────────────
function EventModal({ onClose, onSend }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const isDark = document.documentElement.classList.contains('dark')
  
  return createPortal(
    <div style={glassModalOverlay} onClick={onClose}>
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        style={isDark ? darkGlassModalContent : glassModalContent} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(236,72,153,0.12)', color: '#EC4899' }}><Calendar size={18} /></span>
            Schedule Session
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        {[
          { label: 'Session Topic', val: title, set: setTitle, type: 'text', placeholder: 'Language exchange...' },
          { label: 'Date', val: date, set: setDate, type: 'date', placeholder: '' },
          { label: 'Time', val: time, set: setTime, type: 'time', placeholder: '' },
        ].map(({ label, val, set, type, placeholder }) => (
          <div key={label} style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', marginLeft: '2px' }}>{label}</p>
            <input value={val} onChange={e => set(e.target.value)} type={type} placeholder={placeholder}
              style={{ ...glassInput, marginBottom: 0, padding: '11px 14px' }} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-medium)', background: 'var(--bg-hover)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancel</button>
          <button type="button" onClick={() => { 
            onSend({
              text: `🗓️ Session: ${title || 'New Session'}`,
              mediaType: 'event',
              metadata: { title: title || 'New Session', date, time }
            }); 
            onClose(); 
          }}
            style={{ flex: 1.5, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#EC4899,#F472B6)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 14px rgba(236,72,153,0.3)' }}>
            Send Session
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

// ── Location Modal ──────────────────────────────────────────
function LocationModal({ onClose, onSend }) {
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [coords, setCoords] = useState(null)
  const isDark = document.documentElement.classList.contains('dark')

  const getLocation = () => {
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords(pos.coords); setStatus('done') },
      () => setStatus('error')
    )
  }
  return createPortal(
    <div style={glassModalOverlay} onClick={onClose}>
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        style={{ ...(isDark ? darkGlassModalContent : glassModalContent), width: '340px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', textAlign: 'left' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Share Location</h3>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        
        <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 20px' }}>
          <motion.div 
            animate={status === 'loading' ? { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: 'rgba(2,132,199,0.15)', zIndex: 0 }} 
          />
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(2,132,199,0.1), rgba(2,132,199,0.25))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 10px rgba(2,132,199,0.15)', position: 'relative', zIndex: 1 }}>
            <MapPin size={36} color="#0284C7" strokeWidth={1.5} />
          </div>
        </div>
        
        {status === 'idle' && <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>Share your current location with this conversation.</p>}
        {status === 'loading' && <p style={{ fontSize: '14.5px', color: '#0284C7', marginBottom: '24px', fontWeight: 600 }}>Detecting your location...</p>}
        {status === 'done' && coords && (
          <div style={{ background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p style={{ fontSize: '14px', color: '#10B981', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Check size={16}/> Location found</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: '4px 0 0' }}>{coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</p>
          </div>
        )}
        {status === 'error' && <p style={{ fontSize: '14px', color: '#EF4444', marginBottom: '24px', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '10px' }}>Could not access location. Please allow permission.</p>}
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-medium)', background: 'var(--bg-hover)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancel</button>
          {status === 'done' ? (
            <button type="button" onClick={() => { 
              onSend({
                text: `📍 Location Shared`,
                mediaType: 'location',
                metadata: { latitude: coords.latitude, longitude: coords.longitude }
              }); 
              onClose(); 
            }}
              style={{ flex: 1.5, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#0284C7,#38BDF8)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 14px rgba(2,132,199,0.3)' }}>
              Send Location
            </button>
          ) : (
            <button type="button" onClick={getLocation}
              style={{ flex: 1.5, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#0284C7,#38BDF8)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 14px rgba(2,132,199,0.3)' }}>
              {status === 'loading' ? 'Locating...' : 'Detect Location'}
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

// ── Main Items Config ───────────────────────────────────────

// ── Task Modal ──────────────────────────────────────────────
function TaskModal({ onClose, onSend }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const isDark = document.documentElement.classList.contains('dark')

  return createPortal(
    <div style={glassModalOverlay} onClick={onClose}>
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        style={isDark ? darkGlassModalContent : glassModalContent} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(56,189,248,0.12)', color: '#38BDF8' }}><CheckSquare size={18} /></span>
            Assign Task
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        {[
          { label: 'Task Title', val: title, set: setTitle, type: 'text', placeholder: 'Review chapter 3...' },
          { label: 'Description', val: description, set: setDescription, type: 'text', placeholder: 'Optional details...' },
          { label: 'Due Date', val: dueDate, set: setDueDate, type: 'date', placeholder: '' },
        ].map(({ label, val, set, type, placeholder }) => (
          <div key={label} style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', marginLeft: '2px' }}>{label}</p>
            <input value={val} onChange={e => set(e.target.value)} type={type} placeholder={placeholder}
              style={{ ...glassInput, marginBottom: 0, padding: '11px 14px' }} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-medium)', background: 'var(--bg-hover)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancel</button>
          <button type="button" onClick={() => { 
            if (!title) return;
            onSend({
              text: `✅ Task: ${title}`,
              mediaType: 'task',
              metadata: { title, description, dueDate, status: 'pending' }
            }); 
            onClose(); 
          }}
            style={{ flex: 1.5, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#0EA5E9,#38BDF8)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 14px rgba(14,165,233,0.3)', opacity: title ? 1 : 0.6 }} disabled={!title}>
            Send Task
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}


const ITEMS = [
  { icon: FileText,   label: 'Document',        color: '#8B5CF6', accept: '.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx', type: 'file' },
  { icon: Image,      label: 'Photos & videos', color: '#3B82F6', accept: 'image/*,video/*', type: 'file' },
  { icon: Camera,     label: 'Camera',          color: '#EC4899', type: 'modal' },
  { icon: Headphones, label: 'Audio',           color: '#F97316', accept: 'audio/*', type: 'file' },
  { icon: User,       label: 'Contact',         color: '#0EA5E9', type: 'modal' },
  { icon: BarChart2,  label: 'Vote',            color: '#2563EB', type: 'modal' },
  { icon: Calendar,   label: 'Schedule Session',color: '#EC4899', type: 'modal' },
  { icon: CheckSquare,label: 'Assign Task',     color: '#38BDF8', type: 'modal' },
  { icon: StickerIcon,label: 'New sticker',     color: '#10B981', type: 'modal' },
]

// ── Contact Modal (Real Data) ────────────────────────────────
function ContactModal({ onClose, onSend }) {
  const { contacts, chats, user } = useStore()
  const isDark = document.documentElement.classList.contains('dark')

  // Merge real contacts (from API, have `identifier`) with chats for display
  // contacts from store = array of user objects with name, identifier, initials, profilePic
  // fallback to chat list if contacts empty
  const myId = String(user?._id || user?.id || '')
  const contactList = contacts && contacts.length > 0
    ? contacts
    : chats
        .filter(c => !c.isGroup && c.otherId)
        .filter((c, i, a) => a.findIndex(x => x.otherId === c.otherId) === i)
        .map(c => ({ _id: c.otherId, name: c.name, initials: c.initials, identifier: null }))

  // Determine avatar color per contact
  const avatarColors = ['#E84393', '#8B5CF6', '#0EA5E9', '#10B981', '#F97316', '#EAB308']
  const getColor = (id, i) => avatarColors[i % avatarColors.length]

  // Format identifier: email stays as-is, phone gets formatted nicely
  const formatIdentifier = (identifier) => {
    if (!identifier) return 'LinguaLink User'
    if (identifier.includes('@')) return identifier  // email
    // phone: show as-is but trim whitespace
    return identifier.trim()
  }

  return createPortal(
    <div style={glassModalOverlay} onClick={onClose}>
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        style={{ ...(isDark ? darkGlassModalContent : glassModalContent), width: '360px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Share Contact</h3>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{contactList.length} contact{contactList.length !== 1 ? 's' : ''} available</p>
        
        <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '4px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {contactList.length === 0 ? (
             <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '20px 0' }}>No contacts found</p>
          ) : contactList.map((c, i) => {
            const contactId = c._id || c.otherId
            const contactIdentifier = c.identifier || c.email || null
            const displayInfo = formatIdentifier(contactIdentifier)
            const isEmail = contactIdentifier?.includes('@')
            return (
              <div key={contactId || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  {c.profilePic ? (
                    <img src={c.profilePic} alt={c.name} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `linear-gradient(135deg, ${getColor(contactId, i)}, ${getColor(contactId, i)}aa)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>
                      {(c.initials || c.name?.substring(0, 2) || 'U').toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: '11.5px', color: isEmail ? '#0EA5E9' : '#10B981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ opacity: 0.7 }}>{isEmail ? '✉️' : '📱'}</span>
                      {displayInfo}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => { 
                    onSend({ 
                      text: `👤 Contact: ${c.name}`, 
                      mediaType: 'contact', 
                      metadata: { 
                        name: c.name, 
                        id: contactId,
                        identifier: contactIdentifier,
                        // store email or phone separately for bubble display
                        ...(isEmail ? { email: contactIdentifier } : (contactIdentifier ? { phone: contactIdentifier } : {}))
                      } 
                    }); 
                    onClose(); 
                  }}
                  style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#0EA5E9,#38BDF8)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '12px', flexShrink: 0, marginLeft: '10px' }}>
                  Send
                </button>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

// ── Premium Camera Modal ─────────────────────────────────────────────
function CameraModal({ onClose, onSend }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [captured, setCaptured] = useState(null)   // dataUrl of captured photo
  const [camError, setCamError] = useState(false)
  const [sending, setSending] = useState(false)

  React.useEffect(() => {
    let mounted = true
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(s => {
        if (!mounted) { s.getTracks().forEach(t => t.stop()); return }
        streamRef.current = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
      })
      .catch(e => { console.error('Camera error:', e); if (mounted) setCamError(true) })
    return () => { mounted = false; streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    // Mirror to match preview
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCaptured(dataUrl)
    // Stop camera stream
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const retake = () => {
    setCaptured(null)
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(s => {
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => setCamError(true))
  }

  const sendPhoto = () => {
    if (!captured || sending) return
    setSending(true)
    // Convert dataUrl → File
    const arr = captured.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8 = new Uint8Array(n)
    while (n--) u8[n] = bstr.charCodeAt(n)
    const file = new File([u8], `camera_${Date.now()}.jpg`, { type: mime })
    onSend({ type: 'file', file, label: 'Camera' })
    onClose()
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '420px', background: '#000', borderRadius: '28px', overflow: 'hidden', position: 'relative', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        
        {/* Floating Close Button */}
        <button type="button" onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: 'none', cursor: 'pointer', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.3)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}>
          <X size={20} />
        </button>

        {/* Camera / Preview Feed */}
        <div style={{ width: '100%', aspectRatio: '3/4', position: 'relative', background: '#111' }}>
          {camError ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '16px', padding: '30px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>🚫</div>
              <p style={{ margin: 0, fontSize: '15px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>Camera access denied.<br/>Please allow camera permission.</p>
            </div>
          ) : captured ? (
            <img src={captured} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
          )}
        </div>

        {/* Controls Overlay Area */}
        <div style={{ padding: '30px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {captured ? (
            <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
              <button type="button" onClick={retake}
                style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '15px', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}>
                Retake
              </button>
              <button type="button" onClick={sendPhoto} disabled={sending}
                style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: sending ? '#9CA3AF' : 'var(--primary)', color: '#fff', cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <button type="button"
                onClick={capturePhoto}
                disabled={camError}
                style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#fff', border: '4px solid rgba(255,255,255,0.4)', backgroundClip: 'padding-box', cursor: camError ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s, border-color 0.2s', opacity: camError ? 0.5 : 1 }}
                onMouseDown={e => !camError && (e.currentTarget.style.transform = 'scale(0.92)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseEnter={e => !camError && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => !camError && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)')}
                title="Capture photo"
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}


// ── Sticker Modal ─────────────────────────────────────────────
function StickerModal({ onClose, onSend }) {
  const isDark = document.documentElement.classList.contains('dark')
  const STICKERS = ['👍', '❤️', '😂', '🔥', '🎉', '🌟', '🙏', '🙌', '💯', '✨', '🚀', '💡', '✅', '😎', '🥹', '👀']

  return createPortal(
    <div style={glassModalOverlay} onClick={onClose}>
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        style={{ ...(isDark ? darkGlassModalContent : glassModalContent), width: '340px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Send Sticker</h3>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '20px' }}>
          {STICKERS.map(s => (
            <motion.button type="button" key={s} 
              whileHover={{ scale: 1.25, originY: 1 }} whileTap={{ scale: 0.9 }}
              onClick={() => {
                onSend({ text: s, mediaType: 'sticker', metadata: { sticker: s } }); 
                onClose();
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
              {s}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

export default function AttachmentMenu({ open, onClose, onSelect }) {
  const [activeModal, setActiveModal] = useState(null)
  const isDark = document.documentElement.classList.contains('dark')
  const fileRefs = useRef({})
  const menuRef = useRef(null)
  const fileDialogOpenRef = useRef(false)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      // Don't close menu if a file dialog is being opened
      if (fileDialogOpenRef.current) return
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  const handleClick = (item) => {
    if (item.type === 'file') {
      fileDialogOpenRef.current = true
      fileRefs.current[item.label]?.click()
      // Reset after a short delay (file dialog blocks JS but we need to reset eventually)
      setTimeout(() => { fileDialogOpenRef.current = false }, 500)
    } else {
      setActiveModal(item.label)
      onClose()
    }
  }

  const handleFile = (label, e) => {
    fileDialogOpenRef.current = false
    const file = e.target.files?.[0]
    if (file) {
      onSelect?.({ type: 'file', file, label })
    }
    e.target.value = ''
    onClose()
  }

  const handleModalSend = (msg) => {
    onSelect?.(msg)
    setActiveModal(null)
  }

  return (
    <>
      {/* Hidden file inputs */}
      {ITEMS.filter(i => i.type === 'file').map(item => (
        <input key={item.label} type="file" accept={item.accept} capture={item.capture}
          ref={el => fileRefs.current[item.label] = el}
          style={{ display: 'none' }}
          onChange={e => handleFile(item.label, e)}
        />
      ))}

      {/* Modals */}
      {activeModal === 'Vote' && <PollModal onClose={() => setActiveModal(null)} onSend={handleModalSend} />}
      {activeModal === 'Schedule Session' && <EventModal onClose={() => setActiveModal(null)} onSend={handleModalSend} />}
      {activeModal === 'Assign Task' && <TaskModal onClose={() => setActiveModal(null)} onSend={handleModalSend} />}
      {activeModal === 'Location' && <LocationModal onClose={() => setActiveModal(null)} onSend={handleModalSend} />}
      {activeModal === 'Contact' && <ContactModal onClose={() => setActiveModal(null)} onSend={handleModalSend} />}
      {activeModal === 'Camera' && <CameraModal onClose={() => setActiveModal(null)} onSend={handleModalSend} />}
      {activeModal === 'New sticker' && <StickerModal onClose={() => setActiveModal(null)} onSend={handleModalSend} />}


      {/* WhatsApp-Style Vertical Attachment Menu */}
      <AnimatePresence>
        {open && !activeModal && (
          <motion.div
            ref={menuRef}
            style={{
              position: 'absolute', bottom: '65px', left: '16px', zIndex: 40,
              background: isDark ? '#233138' : '#ffffff',
                borderRadius: '16px',
                border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.08)',
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)',
                padding: '12px 0',
                width: '240px',
                display: 'flex',
                flexDirection: 'column',
              }}
              initial={{ opacity: 0, scale: 0.95, y: 10, originY: 1, originX: 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {ITEMS.map(({ icon: Icon, label, color }, i) => (
                <button type="button"
                  key={label}
                  onClick={() => handleClick({ icon: Icon, label, color, ...ITEMS[i] })}
                  className="wa-attachment-item"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '12px 20px', cursor: 'pointer',
                    background: 'transparent', border: 'none',
                    width: '100%', textAlign: 'left',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Icon size={22} color={color} strokeWidth={2} />
                  <span style={{ fontSize: '15px', fontWeight: 500, color: isDark ? '#E9EDEF' : '#111B21', fontFamily: 'Inter, sans-serif' }}>
                    {label}
                  </span>
                </button>
              ))}
            </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
