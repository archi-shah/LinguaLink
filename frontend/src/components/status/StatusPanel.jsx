/**
 * StatusPanel.jsx — Full Working Status System (WhatsApp-style)
 * ─────────────────────────────────────────────────────────────────────────
 * Features:
 *  • My Status — view/create/delete your own statuses
 *  • Recent Updates — real contacts' statuses from backend API
 *  • Create Status: text (with bg colour picker) or image upload
 *  • Story Viewer with progress bar, viewer count, swipe between slides
 *  • Auto-mark as viewed when opened
 *  • Delete own status
 *  • Respects privacy mode (blur names)
 *  • 24-hour expiry handled by backend TTL index
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Eye, Clock, X, Trash2, ChevronLeft, ChevronRight,
  Send, Image as ImageIcon, Type, Loader2, AlertCircle, Check, Menu
} from 'lucide-react'
import { statusAPI } from '../../api/client'
import useStore from '../../store/useStore.js'

// ── Colour palette for text statuses ─────────────────────────────────────
const BG_COLORS = [
  '#7C3AED', '#6366F1', '#EC4899', '#EF4444', '#F97316',
  '#F59E0B', '#10B981', '#0EA5E9', '#14B8A6', '#1E293B',
]

// ── Helpers ───────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function hashColor(str) {
  let h = 0
  for (let i = 0; i < (str || '').length; i++) h = (h << 5) - h + str.charCodeAt(i)
  return BG_COLORS[Math.abs(h) % BG_COLORS.length]
}

function getMediaUrl(path) {
  if (!path) return ''
  if (path.startsWith('http') || path.startsWith('data:')) return path
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

// ── Story Viewer ──────────────────────────────────────────────────────────
function StoryViewer({ stories, startIndex = 0, onClose, onDelete, myId }) {
  const [idx, setIdx] = useState(startIndex)
  const [progress, setProgress] = useState(0)
  const [viewed, setViewed] = useState(new Set())
  const [paused, setPaused] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [viewerUsers, setViewerUsers] = useState(null)  // null = not loaded, [] = no viewers
  const timerRef = useRef(null)
  const DURATION = 5000

  const story = stories[idx]
  const isOwn = story ? String(story.userId?._id || story.userId) === String(myId) : false

  // ── timer ──
  useEffect(() => {
    if (paused || showViewers) return
    const TICK = 80
    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (TICK / DURATION) * 100
        if (next >= 100) {
          clearInterval(timerRef.current)
          if (idx < stories.length - 1) {
            setTimeout(() => { setIdx(i => i + 1); setProgress(0) }, 0)
          } else {
            setTimeout(onClose, 0)
          }
          return 100
        }
        return next
      })
    }, TICK)
    return () => clearInterval(timerRef.current)
  }, [idx, paused, showViewers, stories.length, onClose])

  // reset progress on index change
  useEffect(() => { setProgress(0); setShowViewers(false); setViewerUsers(null) }, [idx])

  // mark viewed
  useEffect(() => {
    if (story && !viewed.has(story._id)) {
      setViewed(prev => new Set([...prev, story._id]))
      statusAPI.viewStatus(story._id).catch(() => { })
    }
  }, [story?._id])

  // load viewer user data when panel opened
  useEffect(() => {
    if (!showViewers || !story || !isOwn) return
    if (viewerUsers !== null) return // already loaded
    const ids = story.viewers || []
    if (ids.length === 0) { setViewerUsers([]); return }
    // We may not have user details — we just show IDs for now
    // If backend populates viewers, it should return user objects
    setViewerUsers(ids.map(v => (typeof v === 'object' && v !== null) ? v : { _id: v, name: String(v).substring(0, 8) }))
  }, [showViewers, story?._id, isOwn])

  if (!story) return null

  const userName = story.userId?.name || 'Unknown'
  const userInitials = story.userId?.initials || userName.substring(0, 2).toUpperCase()
  const color = story.backgroundColor || hashColor(userName)

  const prev = (e) => { e.stopPropagation(); if (idx > 0) setIdx(i => i - 1) }
  const next = (e) => { e.stopPropagation(); if (idx < stories.length - 1) setIdx(i => i + 1); else onClose() }

  const handleEyeClick = (e) => {
    e.stopPropagation()
    setPaused(true)
    setShowViewers(v => !v)
  }

  const togglePause = (e) => {
    e.stopPropagation()
    setPaused(p => !p)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,18,.93)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <div style={{ width: 360, position: 'relative', userSelect: 'none' }} onClick={e => e.stopPropagation()}>

        {/* ── Progress bars ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, padding: '0 2px' }}>
          {stories.map((s, i) => (
            <div key={s._id} style={{ flex: 1, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.2)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: paused ? 'rgba(255,255,255,.7)' : '#fff',
                width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%',
                transition: paused ? 'none' : undefined,
              }} />
            </div>
          ))}
        </div>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '0 2px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 15, flexShrink: 0, overflow: 'hidden', border: '2px solid rgba(255,255,255,.25)' }}>
            {story.userId?.profilePic
              ? <img src={getMediaUrl(story.userId.profilePic)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : userInitials}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{userName}</p>
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 11.5, margin: 0 }}>{timeAgo(story.createdAt)}{paused ? ' · Paused' : ''}</p>
          </div>

          {/* Pause / Play toggle */}
          <button
            onClick={togglePause}
            style={{ background: 'rgba(255,255,255,.12)', border: 'none', cursor: 'pointer', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            }
          </button>

          {isOwn && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(story._id) }}
              style={{ background: 'rgba(239,68,68,.18)', border: 'none', cursor: 'pointer', color: '#FF6B6B', padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onClose() }}
            style={{ background: 'rgba(255,255,255,.08)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.7)', display: 'flex', padding: 6, borderRadius: '50%', backdropFilter: 'blur(8px)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Story Card ── */}
        <motion.div
          key={idx}
          initial={{ scale: .94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{
            borderRadius: 24, overflow: 'hidden', minHeight: 440,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: story.mediaType === 'image' ? '#000' : color,
            position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,.6)',
          }}
        >
          {story.mediaType === 'image' && story.mediaUrl ? (
            <img src={getMediaUrl(story.mediaUrl)} alt="status"
              style={{ width: '100%', maxHeight: 560, objectFit: 'contain' }} draggable={false} />
          ) : (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <p style={{ color: '#fff', fontSize: 24, fontWeight: 700, lineHeight: 1.5, margin: 0, textShadow: '0 2px 16px rgba(0,0,0,.4)' }}>
                {story.content || '…'}
              </p>
            </div>
          )}

          {/* Small pause badge — shown top-right, doesn't cover the content */}
          {paused && (
            <div style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(0,0,0,.55)',
              borderRadius: 20, padding: '4px 10px',
              display: 'flex', alignItems: 'center', gap: 5,
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,.15)',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em' }}>PAUSED</span>
            </div>
          )}

          {/* Viewer eye button (own status only) — bottom */}
          {isOwn && (
            <button
              onClick={handleEyeClick}
              style={{
                position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
                background: showViewers ? 'rgba(124,58,237,.7)' : 'rgba(0,0,0,.55)',
                border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 24, padding: '7px 18px',
                display: 'flex', alignItems: 'center', gap: 7,
                cursor: 'pointer', backdropFilter: 'blur(10px)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                boxShadow: showViewers ? '0 4px 20px rgba(124,58,237,.5)' : '0 4px 12px rgba(0,0,0,.4)',
                transition: 'all 0.2s',
              }}
            >
              <Eye size={15} color="#fff" />
              <span>{story.viewers?.length || 0} {(story.viewers?.length || 0) === 1 ? 'viewer' : 'viewers'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                style={{ transform: showViewers ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}

          {/* ── Viewers Slide-up Panel ── */}
          <AnimatePresence>
            {showViewers && isOwn && (
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(15,15,30,.92)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '0 0 24px 24px',
                  padding: '20px 18px 24px',
                  maxHeight: '55%',
                  overflowY: 'auto',
                  borderTop: '1px solid rgba(255,255,255,.1)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Eye size={16} color="rgba(255,255,255,.7)" />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                      Viewed by {story.viewers?.length || 0}
                    </span>
                  </div>
                  <button onClick={() => { setShowViewers(false); setPaused(false) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', display: 'flex' }}>
                    <X size={16} />
                  </button>
                </div>

                {!viewerUsers || viewerUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,.4)', fontSize: 13 }}>
                    <Eye size={28} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                    No one has viewed this yet
                  </div>
                ) : viewerUsers.map((v, i) => {
                  const vName = v.name || v.identifier || `Viewer ${i + 1}`
                  const vInitials = v.initials || vName.substring(0, 2).toUpperCase()
                  return (
                    <div key={String(v._id || i)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < viewerUsers.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: hashColor(vName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                        {v.profilePic ? <img src={getMediaUrl(v.profilePic)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : vInitials}
                      </div>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 600, fontSize: 13.5, margin: 0 }}>{vName}</p>
                        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11.5, margin: 0 }}>Viewed this status</p>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Prev / Next nav ── */}
        {idx > 0 && (
          <button onClick={prev} style={{ position: 'absolute', left: -50, top: '55%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.13)', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(8px)' }}>
            <ChevronLeft size={22} />
          </button>
        )}
        {idx < stories.length - 1 && (
          <button onClick={next} style={{ position: 'absolute', right: -50, top: '55%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.13)', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(8px)' }}>
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Create Status Modal ───────────────────────────────────────────────────
function CreateStatusModal({ onClose, onCreate }) {
  const [tab, setTab] = useState('text')   // 'text' | 'image'
  const [text, setText] = useState('')
  const [bgColor, setBgColor] = useState(BG_COLORS[0])
  const [imgUrl, setImgUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef()

  const [imgFile, setImgFile] = useState(null) // actual File object for upload

  const handleImageFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErr('Image must be under 5 MB'); return }
    setImgFile(file)
    // Preview via object URL (no base64 bloat)
    setImgUrl(URL.createObjectURL(file))
    setErr('')
  }

  const handlePost = async () => {
    if (tab === 'text' && !text.trim()) { setErr('Please write something'); return }
    if (tab === 'image' && !imgFile) { setErr('Please select an image'); return }
    setSaving(true); setErr('')
    try {
      let mediaUrl = ''
      // Upload the image file first, get a server URL back
      if (tab === 'image' && imgFile) {
        const uploadRes = await statusAPI.uploadImage(imgFile)
        mediaUrl = uploadRes.url || uploadRes
      }
      const mediaType = tab === 'text' ? 'text' : 'image'
      const bg = tab === 'text' ? bgColor : '#000'
      const res = await statusAPI.createStatus(text.trim(), mediaUrl, mediaType, bg)
      onCreate(res.status || res)
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to post status')
    } finally { setSaving(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: .88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .88, y: 24 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 420, borderRadius: 24, background: 'var(--bg-panel)', border: '1px solid var(--border-light)', boxShadow: '0 32px 80px rgba(0,0,0,.55)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit,sans-serif' }}>Add Status Update</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 8 }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 18px 0' }}>
          {[{ id: 'text', icon: <Type size={14} />, label: 'Text' }, { id: 'image', icon: <ImageIcon size={14} />, label: 'Image' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setErr('') }}
              style={{
                flex: 1, padding: '8px', borderRadius: 11, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                background: tab === t.id ? 'linear-gradient(135deg,#7C3AED,#6366F1)' : 'var(--bg-hover)',
                color: tab === t.id ? '#fff' : 'var(--text-secondary)',
                boxShadow: tab === t.id ? '0 4px 14px rgba(124,58,237,.4)' : 'none',
              }}
            >{t.icon}{t.label}</button>
          ))}
        </div>

        <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Preview */}
          <div style={{ borderRadius: 16, minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: tab === 'image' && imgUrl ? '#000' : bgColor, position: 'relative' }}>
            {tab === 'image' && imgUrl
              ? <img src={imgUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
              : <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 16, fontWeight: 600, padding: '16px 20px', textAlign: 'center', margin: 0 }}>{text || 'Your status preview…'}</p>
            }
          </div>

          {/* Text input */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={tab === 'text' ? 'What\'s on your mind?' : 'Add a caption (optional)'}
            rows={3}
            maxLength={300}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--border-light)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
          />

          {/* BG colour picker (text tab) */}
          {tab === 'text' && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Background</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {BG_COLORS.map(c => (
                  <button key={c} onClick={() => setBgColor(c)}
                    style={{ width: 28, height: 28, borderRadius: 8, background: c, border: bgColor === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer', outline: bgColor === c ? `2px solid ${c}` : 'none', outlineOffset: 1, transition: 'all .15s' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Image picker */}
          {tab === 'image' && (
            <div>
              <input type="file" accept="image/*" ref={fileRef} onChange={handleImageFile} style={{ display: 'none' }} />
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={() => fileRef.current.click()}
                style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1.5px dashed var(--border-medium)', background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <ImageIcon size={16} /> {imgUrl ? 'Change Image' : 'Choose Image'}
              </motion.button>
            </div>
          )}

          {err && <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{err}</p>}

          <motion.button
            onClick={handlePost} disabled={saving}
            whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : .97 }}
            style={{ padding: '13px', borderRadius: 13, background: 'linear-gradient(135deg,#7C3AED,#6366F1)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 6px 20px rgba(124,58,237,.45)' }}
          >
            {saving ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Posting…</> : <><Send size={17} /> Post Status</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Contact row ───────────────────────────────────────────────────────────
function ContactStatusRow({ group, onView, privacyMode }) {
  const latest = group.statuses[0]
  const unviewed = group.statuses.filter(s => !(s.viewers || []).includes(group.userId))
  const color = latest?.backgroundColor || hashColor(group.name)
  const hasNew = unviewed.length > 0

  return (
    <motion.div
      whileHover={{ background: 'var(--bg-hover)' }}
      onClick={() => onView(group.statuses, 0)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer', borderRadius: 14, transition: 'background .15s' }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    >
      {/* Avatar with ring */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', padding: 2.5,
          background: hasNew
            ? `conic-gradient(${color} 0%, ${color} ${(unviewed.length / group.statuses.length) * 360}deg, var(--border-light) 0deg)`
            : 'var(--border-light)',
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 15, border: '2px solid var(--bg-panel)', overflow: 'hidden' }}>
            {group.profilePic
              ? <img src={getMediaUrl(group.profilePic)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : group.initials}
          </div>
        </div>
        {hasNew && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#7C3AED', border: '2px solid var(--bg-panel)' }} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', filter: privacyMode ? 'blur(5px)' : 'none' }}>
          {group.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <Clock size={10} color="var(--text-muted)" />
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{timeAgo(latest?.createdAt)}</span>
          {group.statuses.length > 1 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {group.statuses.length} updates</span>}
        </div>
      </div>

    </motion.div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────
export default function StatusPanel() {
  const { user, privacyMode, setMobileSidebarOpen } = useStore()
  const myId = user?._id || user?.id

  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [viewing, setViewing] = useState(null)   // { stories, startIdx }

  // Load all statuses
  const loadStatuses = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await statusAPI.getStatuses()
      setStatuses(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load statuses')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadStatuses() }, [loadStatuses])

  // Group statuses by userId
  const grouped = statuses.reduce((acc, s) => {
    const uid = String(s.userId?._id || s.userId)
    if (!acc[uid]) {
      acc[uid] = {
        userId: uid,
        name: s.userId?.name || 'Unknown',
        initials: s.userId?.initials || (s.userId?.name || 'U').substring(0, 2).toUpperCase(),
        profilePic: s.userId?.profilePic || '',
        backgroundColor: s.backgroundColor,
        statuses: [],
      }
    }
    acc[uid].statuses.push(s)
    return acc
  }, {})

  const myGroup = grouped[String(myId)] || null
  const othersGroups = Object.values(grouped).filter(g => g.userId !== String(myId))

  const handleDelete = async (statusId) => {
    try {
      await statusAPI.deleteStatus(statusId)
      setStatuses(prev => prev.filter(s => s._id !== statusId))
      // Close viewer if no more of mine
      const remaining = statuses.filter(s => s._id !== statusId && String(s.userId?._id || s.userId) === String(myId))
      if (remaining.length === 0) setViewing(null)
      else setViewing({ stories: remaining, startIdx: 0 })
    } catch (e) { alert(e.message) }
  }

  const handleCreated = (newStatus) => {
    setStatuses(prev => [newStatus, ...prev])
  }

  const openViewer = (stories, startIdx) => {
    setViewing({ stories, startIdx: startIdx || 0 })
  }

  return (
    <motion.div
      className="fluid-left-panel"
      style={{ height: '100%' }}
      initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      transition={{ duration: .25 }}
    >
      {/* Header */}
      <div style={{ padding: '22px 18px 14px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="mobile-only" onClick={() => setMobileSidebarOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
            <Menu size={24} />
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', margin: '0 0 14px', letterSpacing: '-.02em', marginBottom: 0 }}>
            Status
          </h1>
        </div>
        <div style={{ height: 14 }}></div>

        {/* My Status row */}
        <motion.div
          whileHover={{ background: 'var(--bg-hover)' }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 14, cursor: 'pointer', border: '1.5px dashed var(--border-medium)', transition: 'background .18s', position: 'relative' }}
        >
          {/* View own status (if exists) */}
          {myGroup ? (
            <div onClick={() => openViewer(myGroup.statuses, 0)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', padding: 2.5, background: `linear-gradient(135deg,#7C3AED,#6366F1)`, flexShrink: 0 }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', border: '2px solid var(--bg-panel)', overflow: 'hidden' }}>
                  {user?.profilePic ? (
                    <img src={getMediaUrl(user.profilePic)} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user?.initials || 'Me'
                  )}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>My Status</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>{myGroup.statuses.length} update{myGroup.statuses.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, pointerEvents: 'none' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--brand-gradient, linear-gradient(135deg,#7C3AED,#6366F1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                {user?.profilePic ? (
                  <img src={getMediaUrl(user.profilePic)} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.initials || 'Me'
                )}
              </div>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>My Status</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>Tap + to add a status update</p>
              </div>
            </div>
          )}

          {/* Add button */}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: .9 }}
            onClick={() => setShowCreate(true)}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#6366F1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,.4)' }}
          >
            <Plus size={16} color="#fff" strokeWidth={2.5} />
          </motion.button>
        </motion.div>
      </div>

      {/* Status list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={26} color="var(--primary)" />
            </motion.div>
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <AlertCircle size={28} color="#EF4444" style={{ marginBottom: 8 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 10px' }}>{error}</p>
            <button onClick={loadStatuses} style={{ padding: '7px 18px', borderRadius: 9, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {othersGroups.length === 0 && !myGroup && (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                
                <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>No status updates</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>Status updates from your contacts will appear here. They expire after 24 hours.</p>
              </div>
            )}

            {othersGroups.length > 0 && (
              <>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '6px 6px 6px', margin: 0 }}>
                  Recent Updates
                </p>
                {othersGroups.map((group, i) => (
                  <motion.div key={group.userId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <ContactStatusRow
                      group={group}
                      onView={openViewer}
                      privacyMode={privacyMode}
                    />
                  </motion.div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewing && (
          <StoryViewer
            stories={viewing.stories}
            startIndex={viewing.startIdx}
            myId={myId}
            onClose={() => setViewing(null)}
            onDelete={async (id) => { await handleDelete(id); setViewing(null) }}
          />
        )}
      </AnimatePresence>

      {/* Create Status Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateStatusModal
            onClose={() => setShowCreate(false)}
            onCreate={handleCreated}
          />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </motion.div>
  )
}
