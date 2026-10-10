import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Shield, Moon, Sun, Globe, Camera,
  Check, X, Edit3, Loader2, LogOut, Lock, Eye, EyeOff,
  Fingerprint, Zap, Volume2, HelpCircle, Star, Info,
  AlertTriangle, Palette, MessageSquare, Search,
  ChevronDown, ExternalLink, Trash2, ArrowLeft, Ban, Download, ChevronLeft
} from 'lucide-react'
import useStore from '../../store/useStore.js'
import { useNavigate } from 'react-router-dom'
import { userAPI, authAPI, chatAPI } from '../../api/client.js'

// ── Full language list — same as AuthPage ─────────────────────────────────────
const ALL_LANGUAGES = [
  { code: 'en',    label: 'English' },
  { code: 'af',    label: 'Afrikaans' },
  { code: 'sq',    label: 'Albanian' },
  { code: 'am',    label: 'Amharic' },
  { code: 'ar',    label: 'Arabic' },
  { code: 'hy',    label: 'Armenian' },
  { code: 'az',    label: 'Azerbaijani' },
  { code: 'eu',    label: 'Basque' },
  { code: 'be',    label: 'Belarusian' },
  { code: 'bn',    label: 'Bengali' },
  { code: 'bs',    label: 'Bosnian' },
  { code: 'bg',    label: 'Bulgarian' },
  { code: 'ca',    label: 'Catalan' },
  { code: 'ceb',   label: 'Cebuano' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' },
  { code: 'co',    label: 'Corsican' },
  { code: 'hr',    label: 'Croatian' },
  { code: 'cs',    label: 'Czech' },
  { code: 'da',    label: 'Danish' },
  { code: 'nl',    label: 'Dutch' },
  { code: 'eo',    label: 'Esperanto' },
  { code: 'et',    label: 'Estonian' },
  { code: 'fi',    label: 'Finnish' },
  { code: 'fr',    label: 'French' },
  { code: 'fy',    label: 'Frisian' },
  { code: 'gl',    label: 'Galician' },
  { code: 'ka',    label: 'Georgian' },
  { code: 'de',    label: 'German' },
  { code: 'el',    label: 'Greek' },
  { code: 'gu',    label: 'Gujarati' },
  { code: 'ht',    label: 'Haitian Creole' },
  { code: 'ha',    label: 'Hausa' },
  { code: 'haw',   label: 'Hawaiian' },
  { code: 'he',    label: 'Hebrew' },
  { code: 'hi',    label: 'Hindi' },
  { code: 'hmn',   label: 'Hmong' },
  { code: 'hu',    label: 'Hungarian' },
  { code: 'is',    label: 'Icelandic' },
  { code: 'ig',    label: 'Igbo' },
  { code: 'id',    label: 'Indonesian' },
  { code: 'ga',    label: 'Irish' },
  { code: 'it',    label: 'Italian' },
  { code: 'ja',    label: 'Japanese' },
  { code: 'jv',    label: 'Javanese' },
  { code: 'kn',    label: 'Kannada' },
  { code: 'kk',    label: 'Kazakh' },
  { code: 'km',    label: 'Khmer' },
  { code: 'ko',    label: 'Korean' },
  { code: 'ku',    label: 'Kurdish' },
  { code: 'ky',    label: 'Kyrgyz' },
  { code: 'lo',    label: 'Lao' },
  { code: 'la',    label: 'Latin' },
  { code: 'lv',    label: 'Latvian' },
  { code: 'lt',    label: 'Lithuanian' },
  { code: 'lb',    label: 'Luxembourgish' },
  { code: 'mk',    label: 'Macedonian' },
  { code: 'mg',    label: 'Malagasy' },
  { code: 'ms',    label: 'Malay' },
  { code: 'ml',    label: 'Malayalam' },
  { code: 'mt',    label: 'Maltese' },
  { code: 'mi',    label: 'Maori' },
  { code: 'mr',    label: 'Marathi' },
  { code: 'mn',    label: 'Mongolian' },
  { code: 'my',    label: 'Myanmar (Burmese)' },
  { code: 'ne',    label: 'Nepali' },
  { code: 'no',    label: 'Norwegian' },
  { code: 'ny',    label: 'Nyanja (Chichewa)' },
  { code: 'ps',    label: 'Pashto' },
  { code: 'fa',    label: 'Persian' },
  { code: 'pl',    label: 'Polish' },
  { code: 'pt',    label: 'Portuguese' },
  { code: 'pa',    label: 'Punjabi' },
  { code: 'ro',    label: 'Romanian' },
  { code: 'ru',    label: 'Russian' },
  { code: 'sm',    label: 'Samoan' },
  { code: 'gd',    label: 'Scots Gaelic' },
  { code: 'sr',    label: 'Serbian' },
  { code: 'st',    label: 'Sesotho' },
  { code: 'sn',    label: 'Shona' },
  { code: 'sd',    label: 'Sindhi' },
  { code: 'si',    label: 'Sinhala' },
  { code: 'sk',    label: 'Slovak' },
  { code: 'sl',    label: 'Slovenian' },
  { code: 'so',    label: 'Somali' },
  { code: 'es',    label: 'Spanish' },
  { code: 'su',    label: 'Sundanese' },
  { code: 'sw',    label: 'Swahili' },
  { code: 'sv',    label: 'Swedish' },
  { code: 'tg',    label: 'Tajik' },
  { code: 'ta',    label: 'Tamil' },
  { code: 'te',    label: 'Telugu' },
  { code: 'th',    label: 'Thai' },
  { code: 'tr',    label: 'Turkish' },
  { code: 'uk',    label: 'Ukrainian' },
  { code: 'ur',    label: 'Urdu' },
  { code: 'uz',    label: 'Uzbek' },
  { code: 'vi',    label: 'Vietnamese' },
  { code: 'cy',    label: 'Welsh' },
  { code: 'xh',    label: 'Xhosa' },
  { code: 'yi',    label: 'Yiddish' },
  { code: 'yo',    label: 'Yoruba' },
  { code: 'zu',    label: 'Zulu' },
]

// ── Color palette for language code badges (instead of emoji flags) ────────────
const CODE_COLORS = [
  '#7C3AED','#6366F1','#3B82F6','#06B6D4','#10B981',
  '#F59E0B','#EF4444','#EC4899','#8B5CF6','#14B8A6',
]
function codeColor(code) {
  let h = 0
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) & 0xFFFF
  return CODE_COLORS[h % CODE_COLORS.length]
}

// ── Compress image ─────────────────────────────────────────────────────────────
const compressImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = (e) => {
    const img = new Image()
    img.src = e.target.result
    img.onload = () => {
      const MAX = 400
      let w = img.width, h = img.height
      if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX } }
      else        { if (h > MAX) { w *= MAX/h; h = MAX } }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
  }
  reader.onerror = reject
})

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ active, onChange, color = '#7C3AED' }) {
  return (
    <motion.div onClick={onChange} style={{
      width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', flexShrink: 0,
      background: active ? color : 'var(--border-medium)',
      boxShadow: active ? `0 0 0 3px ${color}22` : 'none',
      transition: 'background 0.2s, box-shadow 0.2s',
    }}>
      <motion.div animate={{ x: active ? 22 : 2 }} transition={{ type: 'spring', stiffness: 600, damping: 34 }}
        style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, boxShadow: '0 1px 4px rgba(0,0,0,.2)' }}
      />
    </motion.div>
  )
}

// ── Row ────────────────────────────────────────────────────────────────────────
function Row({ icon: Icon, bg = 'rgba(124,58,237,.1)', iconColor = '#7C3AED', title, sub, control, onClick, last, danger }) {
  return (
    <motion.div
      whileHover={onClick ? { background: 'var(--bg-hover)' } : {}}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px',
        borderBottom: last ? 'none' : '1px solid var(--border-light)',
        cursor: onClick ? 'pointer' : 'default', transition: 'background 0.15s',
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, background: danger ? 'rgba(239,68,68,.1)' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={danger ? '#EF4444' : iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: danger ? '#EF4444' : 'var(--text-primary)', lineHeight: 1.3 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {control && <div style={{ flexShrink: 0 }}>{control}</div>}
      {!control && onClick && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>}
    </motion.div>
  )
}

// ── Section label ──────────────────────────────────────────────────────────────
function SectionLabel({ children, accent = '#7C3AED' }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '24px 0 8px 2px', fontFamily: 'Outfit, sans-serif' }}>
      {children}
    </p>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────────
function Card({ children }) {
  return (
    <div style={{ background: 'var(--bg-panel)', borderRadius: 16, border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
      {children}
    </div>
  )
}

const TABS = [
  { id: 'profile',       label: 'Profile',           icon: User },
  { id: 'appearance',    label: 'Appearance',         icon: Palette },
  { id: 'language',      label: 'Language',           icon: Globe },
  { id: 'notifications', label: 'Notifications',      icon: Bell },
  { id: 'privacy',       label: 'Privacy & Security', icon: Shield },
  { id: 'about',         label: 'About',              icon: Info },
]

// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPanel() {
  const { user, logout, privacyMode, setPrivacyMode, autoTranslate, setAutoTranslate, darkMode, setDarkMode, updateProfile, setActiveSidebar } = useStore()
  const navigate = useNavigate()
  const fileRef  = useRef(null)

  const [activeTab,     setActiveTab]     = useState('profile')
  const [editingName,   setEditingName]   = useState(false)
  const [editingBio,    setEditingBio]    = useState(false)
  const [editName,      setEditName]      = useState('')
  const [editBio,       setEditBio]       = useState('')
  const [editPic,       setEditPic]       = useState('')
  const [isSaving,      setIsSaving]      = useState(false)
  const [toast,         setToast]         = useState(null)
  const [notifications, setNotifications] = useState(true)
  const [sounds,        setSounds]        = useState(true)
  const [readReceipts,  setReadReceipts]  = useState(true)
  const [langSearch,    setLangSearch]    = useState('')
  const [langLoading,   setLangLoading]   = useState(null)
  const [showHelp,      setShowHelp]      = useState(false)
  const [showRate,      setShowRate]      = useState(false)
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount]  = useState(false)
  const [deletingAccount, setDeletingAccount]      = useState(false)
  const [showBlocked,   setShowBlocked]   = useState(false)
  const [show2FA,       setShow2FA]       = useState(false)
  const [rating,        setRating]        = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [chatBackupProgress, setChatBackupProgress] = useState(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [editPic, user?.profilePic])

  useEffect(() => {
    if (user) {
      setEditName(user.name || '')
      setEditBio(user.bio || '')
      setEditPic(user.profilePic || '')
    }
  }, [user])

  const toast$ = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2600)
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsSaving(true)
    try {
      const compressed = await compressImage(file)
      setEditPic(compressed)
      await updateProfile({ profilePic: compressed })
      toast$('Photo updated!')
    } catch { toast$('Failed to upload photo', 'error') }
    finally { setIsSaving(false); e.target.value = '' }
  }

  const saveName = async () => {
    if (!editName.trim()) return
    setIsSaving(true)
    try {
      await updateProfile({ name: editName.trim() })
      setEditingName(false)
      toast$('Name updated!')
    } catch { toast$('Failed to save', 'error') }
    finally { setIsSaving(false) }
  }

  const saveBio = async () => {
    setIsSaving(true)
    try {
      await updateProfile({ bio: editBio })
      setEditingBio(false)
      toast$('About updated!')
    } catch { toast$('Failed to save', 'error') }
    finally { setIsSaving(false) }
  }

  const changeLanguage = async (code) => {
    if (user?.language === code || langLoading) return
    setLangLoading(code)
    try {
      await updateProfile({ language: code })
      const lang = ALL_LANGUAGES.find(l => l.code === code)
      toast$(`Language changed to ${lang?.label}!`)
    } catch { toast$('Failed to change language', 'error') }
    finally { setLangLoading(null) }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  const displayPic = editPic || user?.profilePic
  const currentLang = ALL_LANGUAGES.find(l => l.code === user?.language) || ALL_LANGUAGES[0]

  // filtered languages for search
  const filteredLangs = useMemo(() => {
    const q = langSearch.toLowerCase().trim()
    if (!q) return ALL_LANGUAGES
    return ALL_LANGUAGES.filter(l => l.label.toLowerCase().includes(q) || l.code.toLowerCase().includes(q))
  }, [langSearch])

  // ── Right panel renderer ──────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {

      // ── PROFILE ──────────────────────────────────────────────────────────
      case 'profile': return (
        <div>
          {/* Avatar + name block */}
          <div style={{ background: 'var(--bg-panel)', borderRadius: 18, border: '1px solid var(--border-light)', padding: '24px', marginBottom: 4, display: 'flex', gap: 22, alignItems: 'flex-start' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 84, height: 84, borderRadius: 22, background: 'linear-gradient(135deg,#7C3AED,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff', overflow: 'hidden', boxShadow: '0 8px 28px rgba(124,58,237,.28)' }}>
                {(displayPic && !imgError) ? <img src={displayPic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} /> : (user?.initials || 'U')}
              </div>
              <input type="file" accept="image/*" ref={fileRef} onChange={handleImageSelect} style={{ display: 'none' }} />
              <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                onClick={() => fileRef.current?.click()}
                style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', background: '#7C3AED', border: '2.5px solid var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 3px 10px rgba(124,58,237,.4)' }}
              >
                {isSaving ? <Loader2 size={12} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={12} color="#fff" />}
              </motion.button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Display Name</p>
              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setEditName(user?.name || '') } }}
                    autoFocus
                    style={{ flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-hover)', border: '2px solid #7C3AED', borderRadius: 10, outline: 'none', padding: '7px 12px', fontFamily: 'Outfit, sans-serif' }}
                  />
                  <button onClick={saveName} disabled={isSaving} style={{ width: 32, height: 32, borderRadius: '50%', background: '#22C55E', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Check size={14} color="#fff" /></button>
                  <button onClick={() => { setEditingName(false); setEditName(user?.name || '') }} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-hover)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} color="var(--text-muted)" /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{user?.name || 'Your Name'}</span>
                  <button onClick={() => setEditingName(true)} style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--bg-hover)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Edit3 size={12} color="var(--text-muted)" /></button>
                </div>
              )}
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Globe size={12} /> {user?.identifier}
              </p>
            </div>
          </div>

          <SectionLabel>About / Bio</SectionLabel>
          <Card>
            <div style={{ padding: '14px 16px' }}>
              {editingBio ? (
                <>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={140} rows={3} autoFocus
                    placeholder="Write something about yourself…"
                    style={{ width: '100%', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-hover)', border: '2px solid #7C3AED', borderRadius: 10, outline: 'none', padding: '10px 12px', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 10px', textAlign: 'right' }}>{editBio.length}/140</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveBio} disabled={isSaving} style={{ padding: '8px 20px', borderRadius: 10, background: '#7C3AED', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Save
                    </button>
                    <button onClick={() => { setEditingBio(false); setEditBio(user?.bio || '') }} style={{ padding: '8px 16px', borderRadius: 10, background: 'var(--bg-hover)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <p style={{ fontSize: 14.5, color: user?.bio ? 'var(--text-primary)' : 'var(--text-muted)', margin: 0, fontStyle: user?.bio ? 'normal' : 'italic', lineHeight: 1.6, flex: 1 }}>
                    {user?.bio || 'Tap the pencil to add your About…'}
                  </p>
                  <button onClick={() => setEditingBio(true)} style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-hover)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><Edit3 size={13} color="var(--text-muted)" /></button>
                </div>
              )}
            </div>
          </Card>

          <SectionLabel accent="#EF4444">Account</SectionLabel>
          <Card>
            <Row icon={LogOut} title="Log Out" sub="Sign out of LinguaLink" danger onClick={handleLogout} last />
          </Card>
        </div>
      )

      // ── APPEARANCE ───────────────────────────────────────────────────────
      case 'appearance': return (
        <div>
          <SectionLabel accent="#8B5CF6">Theme</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            {[{ label: 'Light Mode', icon: Sun, isDark: false }, { label: 'Dark Mode', icon: Moon, isDark: true }].map(t => {
              const isActive = darkMode === t.isDark
              return (
                <motion.button key={t.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setDarkMode(t.isDark)}
                  style={{ padding: '20px 16px', borderRadius: 16, background: isActive ? 'linear-gradient(135deg,#7C3AED,#6366F1)' : 'var(--bg-panel)', border: isActive ? 'none' : '1.5px solid var(--border-light)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxShadow: isActive ? '0 8px 24px rgba(124,58,237,.35)' : 'none', transition: 'all 0.2s' }}
                >
                  <t.icon size={26} color={isActive ? '#fff' : 'var(--text-secondary)'} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? '#fff' : 'var(--text-primary)' }}>{t.label}</span>
                  {isActive && <span style={{ fontSize: 11, background: 'rgba(255,255,255,.2)', color: '#fff', padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>Active</span>}
                </motion.button>
              )
            })}
          </div>

          <SectionLabel accent="#6366F1">Privacy</SectionLabel>
          <Card>
            <Row icon={privacyMode ? EyeOff : Eye} bg="rgba(99,102,241,.1)" iconColor="#6366F1"
              title="Privacy Blur" sub="Hide message previews in the sidebar"
              control={<Toggle active={privacyMode} onChange={() => setPrivacyMode(!privacyMode)} color="#6366F1" />} last />
          </Card>
        </div>
      )

      // ── LANGUAGE ─────────────────────────────────────────────────────────
      case 'language': return (
        <div>
          {/* Current language banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,.12), rgba(99,102,241,.08))',
            borderRadius: 16, padding: '16px 20px', marginBottom: 20,
            border: '1px solid rgba(124,58,237,.2)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: codeColor(currentLang.code), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: '0.03em' }}>
              {currentLang.code.slice(0,2).toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Current Language</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'Outfit, sans-serif' }}>{currentLang.label}</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,.12)', borderRadius: 99, padding: '4px 12px', border: '1px solid rgba(34,197,94,.25)' }}>
              <Check size={12} color="#22C55E" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#22C55E' }}>Selected</span>
            </div>
          </div>

          {/* Auto-translate */}
          <SectionLabel accent="#06B6D4">Translation</SectionLabel>
          <Card>
            <Row icon={Zap} bg="rgba(6,182,212,.1)" iconColor="#06B6D4"
              title="Auto-Translate Messages"
              sub="Automatically translate incoming messages to your language"
              control={<Toggle active={autoTranslate} onChange={() => setAutoTranslate(!autoTranslate)} color="#06B6D4" />} last />
          </Card>

          {/* Search */}
          <SectionLabel accent="#7C3AED">Choose Language ({ALL_LANGUAGES.length} available)</SectionLabel>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={langSearch}
              onChange={e => setLangSearch(e.target.value)}
              placeholder="Search languages…"
              style={{ width: '100%', padding: '10px 14px 10px 38px', background: 'var(--bg-panel)', border: '1.5px solid var(--border-light)', borderRadius: 12, fontSize: 14, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = '#7C3AED'}
              onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
            />
            {langSearch && (
              <button onClick={() => setLangSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Language grid */}
          {filteredLangs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Globe size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, margin: 0 }}>No languages match "<strong>{langSearch}</strong>"</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 440, overflowY: 'auto', paddingRight: 2 }}>
              {filteredLangs.map(lang => {
                const isActive  = user?.language === lang.code
                const isLoading = langLoading === lang.code
                const bg        = codeColor(lang.code)
                return (
                  <motion.button
                    key={lang.code}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => changeLanguage(lang.code)}
                    style={{
                      padding: '11px 14px', borderRadius: 13,
                      background: isActive ? `linear-gradient(135deg, ${bg}, ${bg}cc)` : 'var(--bg-panel)',
                      border: isActive ? `1.5px solid ${bg}` : '1.5px solid var(--border-light)',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      boxShadow: isActive ? `0 4px 16px ${bg}33` : '0 1px 4px rgba(0,0,0,.04)',
                      transition: 'all 0.18s', textAlign: 'left',
                    }}
                  >
                    {/* Code badge */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: isActive ? 'rgba(255,255,255,.25)' : `${bg}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, letterSpacing: '0.02em',
                      color: isActive ? '#fff' : bg,
                    }}>
                      {lang.code.slice(0,3).toUpperCase()}
                    </div>
                    {/* Label */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lang.label}
                      </div>
                    </div>
                    {/* Check / loader */}
                    {isLoading && <Loader2 size={14} color={isActive ? '#fff' : bg} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                    {isActive && !isLoading && <Check size={15} color="#fff" style={{ flexShrink: 0 }} />}
                  </motion.button>
                )
              })}
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
            {filteredLangs.length} of {ALL_LANGUAGES.length} languages shown
          </p>
        </div>
      )

      // ── NOTIFICATIONS ────────────────────────────────────────────────────
      case 'notifications': return (
        <div>
          <SectionLabel accent="#F59E0B">Notifications</SectionLabel>
          <Card>
            <Row icon={Bell} bg="rgba(245,158,11,.1)" iconColor="#F59E0B"
              title="Push Notifications" sub="Get notified about new messages and calls"
              control={<Toggle active={notifications} onChange={async () => {
                const newVal = !notifications
                setNotifications(newVal)
                try { await updateProfile({ notifications: newVal }) } catch {}
                toast$(newVal ? 'Notifications enabled' : 'Notifications muted')
              }} color="#F59E0B" />} />
            <Row icon={Volume2} bg="rgba(245,158,11,.1)" iconColor="#F59E0B"
              title="Notification Sounds" sub="Play audio when you receive a message"
              control={<Toggle active={sounds} onChange={async () => {
                const newVal = !sounds
                setSounds(newVal)
                try { await updateProfile({ sounds: newVal }) } catch {}
                toast$(newVal ? 'Sounds enabled' : 'Sounds muted')
              }} color="#F59E0B" />} last />
          </Card>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.6 }}>
            Tip: You can also mute individual conversations by right-clicking a chat in the sidebar.
          </p>
        </div>
      )

      // ── PRIVACY ──────────────────────────────────────────────────────────
      case 'privacy': return (
        <div>
          <SectionLabel accent="#10B981">Messaging</SectionLabel>
          <Card>
            <Row icon={Eye} bg="rgba(16,185,129,.1)" iconColor="#10B981"
              title="Read Receipts" sub="Let contacts see when you've read their messages"
              control={<Toggle active={readReceipts} onChange={async () => {
                const newVal = !readReceipts
                setReadReceipts(newVal)
                try { await updateProfile({ readReceipts: newVal }) } catch {}
                toast$(newVal ? 'Read receipts enabled' : 'Read receipts disabled')
              }} color="#10B981" />} />
            <Row icon={Lock} bg="rgba(16,185,129,.1)" iconColor="#10B981"
              title="Blocked Contacts" sub="Manage people you've blocked"
              onClick={() => setShowBlocked(true)} />
            <Row icon={Fingerprint} bg="rgba(16,185,129,.1)" iconColor="#10B981"
              title="Two-Factor Authentication" sub="Add an extra layer of security to your account"
              onClick={() => setShow2FA(true)} last />
          </Card>
          <SectionLabel accent="#EF4444">Data & Storage</SectionLabel>
          <Card>
            <Row icon={MessageSquare} bg="rgba(99,102,241,.1)" iconColor="#6366F1"
              title="Chat Backup" sub="Backup your conversations securely"
              onClick={async () => {
                setChatBackupProgress(10)
                try {
                  const backup = await chatAPI.backupChats()
                  setChatBackupProgress(50)
                  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `LinguaLink_Backup_${new Date().toISOString().split('T')[0]}.json`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  setChatBackupProgress(100)
                  setTimeout(() => setChatBackupProgress(null), 1000)
                  toast$('Chat backup completed!')
                } catch (err) {
                  setChatBackupProgress(null)
                  toast$('Chat backup failed', 'error')
                }
              }} />
            <Row icon={AlertTriangle} title="Delete Account" sub="Permanently delete your account and all data" danger
              onClick={() => setShowDeleteAccount(true)} last />
          </Card>

          {/* Chat backup progress */}
          <AnimatePresence>
            {chatBackupProgress !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                style={{ marginTop: 16, padding: '16px 18px', background: 'var(--bg-panel)', borderRadius: 14, border: '1px solid var(--border-light)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Backing up...</span>
                  <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>{chatBackupProgress}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${chatBackupProgress}%` }}
                    style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(135deg, #7C3AED, #6366F1)' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )

      // ── ABOUT ────────────────────────────────────────────────────────────
      case 'about': return (
        <div>
          <div style={{ textAlign: 'center', padding: '28px 20px', marginBottom: 16, background: 'var(--bg-panel)', borderRadius: 18, border: '1px solid var(--border-light)' }}>
            <div style={{ width: 76, height: 76, borderRadius: 22, margin: '0 auto 14px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(124,58,237,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
              <img src="/features/logo.PNG" alt="LinguaLink" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px', fontFamily: 'Outfit, sans-serif' }}>LinguaLink</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px' }}>Version 2.0</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,.1)', borderRadius: 99, padding: '5px 14px', border: '1px solid rgba(34,197,94,.25)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#22C55E' }}>All systems operational</span>
            </div>
          </div>
          <SectionLabel>Support</SectionLabel>
          <Card>
            <Row icon={HelpCircle} bg="rgba(99,102,241,.1)" iconColor="#6366F1" title="Help & FAQ" sub="Browse common questions and guides" onClick={() => setShowHelp(true)} />
            <Row icon={Star} bg="rgba(245,158,11,.1)" iconColor="#F59E0B" title="Rate LinguaLink" sub="Share your feedback with us" onClick={() => setShowRate(true)} />
            <Row icon={Info} bg="rgba(99,102,241,.1)" iconColor="#6366F1" title="Privacy Policy" sub="Read our data & privacy terms" onClick={() => setShowPrivacyPolicy(true)} last />
          </Card>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 24 }}>
            © 2026 LinguaLink · Bridging the World, One Message at a Time
          </p>
        </div>
      )

      default: return null
    }
  }

  return (
    <div className="app-main-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-chat)', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{ padding: '14px 24px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          className="mobile-only premium-icon-btn"
          onClick={() => setActiveSidebar('chats')}
          style={{ padding: '6px', marginRight: '8px' }}
        >
          <ChevronLeft size={24} />
        </button>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#7C3AED,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={15} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'Outfit, sans-serif' }}>Settings</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{TABS.find(t => t.id === activeTab)?.label}</p>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT NAV */}
        <div style={{ width: 210, flexShrink: 0, borderRight: '1px solid var(--border-light)', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', padding: '10px 8px', gap: 2, overflowY: 'auto' }}>

          {/* User mini chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px 14px', marginBottom: 4, borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#7C3AED,#6366F1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {((editPic || user?.profilePic) && !imgError) ? <img src={editPic || user?.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} /> : (user?.initials || 'U')}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{currentLang.label}</p>
            </div>
          </div>

          {/* Nav buttons */}
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <motion.button key={tab.id}
                whileHover={{ background: isActive ? undefined : 'var(--bg-hover)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 11, border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(124,58,237,.12)' : 'transparent',
                  color: isActive ? '#7C3AED' : 'var(--text-secondary)',
                  borderLeft: `3px solid ${isActive ? '#7C3AED' : 'transparent'}`,
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                <tab.icon size={15} />
                <span style={{ fontSize: 13.5, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap' }}>{tab.label}</span>
              </motion.button>
            )
          })}

          {/* Spacer + logout */}
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
            <motion.button whileHover={{ background: 'rgba(239,68,68,.07)' }} whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'transparent', color: '#EF4444', transition: 'all 0.15s', fontFamily: 'inherit' }}
            >
              <LogOut size={15} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Log Out</span>
            </motion.button>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 60px' }}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Help & FAQ Modal ── */}
      <AnimatePresence>
        {showHelp && (
          <SettingsModal onClose={() => setShowHelp(false)} title="Help & FAQ" icon={<HelpCircle size={18} color="#6366F1" />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { q: 'How does auto-translation work?', a: 'LinguaLink uses AI to detect the language of incoming messages and automatically translates them to your preferred language in real-time.' },
                { q: 'How do I change my language?', a: 'Go to Settings → Language and select your preferred language from the list. All incoming messages will be translated to your chosen language.' },
                { q: 'Are my messages encrypted?', a: 'Yes! All messages on LinguaLink are end-to-end encrypted. Only you and the recipient can read them.' },
                { q: 'How do I create a group?', a: 'Tap the "+" button in the Chats panel and select "New Group". Add members and give your group a name.' },
                { q: 'How do I block someone?', a: 'Open a chat, tap the contact name at the top to open their profile, then scroll down and tap "Block".' },
                { q: 'How do I delete my account?', a: 'Go to Settings → Privacy & Security → Delete Account. This action is permanent and cannot be undone.' },
                { q: 'How do I report a problem?', a: 'Open any chat, tap the contact name, scroll down and tap "Report". Select a reason and submit your report to our safety team.' },
                { q: 'Can I use LinguaLink on multiple devices?', a: 'Currently, LinguaLink supports one active session at a time. Multi-device support is coming soon!' },
              ].map((item, i) => (
                <FaqItem key={i} question={item.q} answer={item.a} />
              ))}
            </div>
            <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(99,102,241,.06)', borderRadius: 12, border: '1px solid rgba(99,102,241,.12)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Still need help? Contact us at <strong style={{ color: 'var(--primary)' }}>support@lingualink.app</strong>
              </p>
            </div>
          </SettingsModal>
        )}
      </AnimatePresence>

      {/* ── Rate LinguaLink Modal ── */}
      <AnimatePresence>
        {showRate && (
          <SettingsModal onClose={() => { setShowRate(false); setRating(0); setRatingComment(''); setRatingSubmitted(false) }} title="Rate LinguaLink" icon={<Star size={18} color="#F59E0B" />}>
            {ratingSubmitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,.1)', border: '2px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Thank You!</h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>Your feedback helps us improve LinguaLink.</p>
              </motion.div>
            ) : (
              <>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px', textAlign: 'center', lineHeight: 1.6 }}>
                  How would you rate your experience with LinguaLink?
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                  {[1,2,3,4,5].map(star => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.2, y: -4 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setRating(star)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 36, padding: 4, filter: star <= rating ? 'none' : 'grayscale(1) opacity(0.35)', transition: 'filter 0.2s' }}
                    >⭐</motion.button>
                  ))}
                </div>
                {rating > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', textAlign: 'center' }}>
                      {rating <= 2 ? 'We can do better!' : rating <= 4 ? 'Thanks! What can improve?' : 'Awesome! 🎉'}
                    </p>
                    <textarea
                      value={ratingComment}
                      onChange={e => setRatingComment(e.target.value)}
                      placeholder="Tell us more (optional)..."
                      rows={3}
                      style={{ width: '100%', resize: 'none', boxSizing: 'border-box', background: 'var(--bg-hover)', border: '1.5px solid var(--border-light)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setRatingSubmitted(true); toast$('Thanks for your feedback!') }}
                      style={{ width: '100%', marginTop: 14, padding: 13, borderRadius: 13, background: 'linear-gradient(135deg,#F59E0B,#EF4444)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(245,158,11,.35)' }}
                    ><Star size={16} /> Submit Review</motion.button>
                  </motion.div>
                )}
              </>
            )}
          </SettingsModal>
        )}
      </AnimatePresence>

      {/* ── Privacy Policy Modal ── */}
      <AnimatePresence>
        {showPrivacyPolicy && (
          <SettingsModal onClose={() => setShowPrivacyPolicy(false)} title="Privacy Policy" icon={<Shield size={18} color="#6366F1" />}>
            <div style={{ maxHeight: 420, overflowY: 'auto', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>1. Data Collection</h4>
              <p style={{ margin: '0 0 16px' }}>We collect only the information necessary to provide our services: your name, contact identifier (email or phone), preferred language, and messages you send through LinguaLink. Messages are encrypted end-to-end.</p>
              <h4 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>2. How We Use Your Data</h4>
              <p style={{ margin: '0 0 16px' }}>Your data is used to deliver messages, provide real-time translation, improve our AI translation models, and ensure platform security. We never sell your personal data to third parties.</p>
              <h4 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>3. Message Privacy</h4>
              <p style={{ margin: '0 0 16px' }}>All messages are encrypted end-to-end. Translations are processed in real-time and not stored permanently. Only you and your conversation partner(s) can read your messages.</p>
              <h4 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>4. Data Retention</h4>
              <p style={{ margin: '0 0 16px' }}>We retain your account data as long as your account is active. Status updates expire automatically after 24 hours. You can delete your account and all associated data at any time.</p>
              <h4 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>5. Your Rights</h4>
              <p style={{ margin: '0 0 16px' }}>You have the right to access, correct, or delete your personal data at any time. You can export your chat history, manage blocked contacts, and control notification preferences through the Settings panel.</p>
              <h4 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>6. Contact Us</h4>
              <p style={{ margin: 0 }}>For privacy-related inquiries, reach out to <strong style={{ color: 'var(--primary)' }}>privacy@lingualink.app</strong></p>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '16px 0 0', textAlign: 'center' }}>Last updated: June 2026</p>
          </SettingsModal>
        )}
      </AnimatePresence>

      {/* ── Delete Account Modal ── */}
      <AnimatePresence>
        {showDeleteAccount && (
          <SettingsModal onClose={() => setShowDeleteAccount(false)} title="Delete Account" icon={<Trash2 size={18} color="#EF4444" />}>
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,.1)', border: '2px solid rgba(239,68,68,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle size={28} color="#EF4444" />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Are you sure?</h3>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                This will permanently delete your account, all your messages, contacts, and data. This action <strong style={{ color: '#EF4444' }}>cannot be undone</strong>.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteAccount(false)}
                  style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                >Cancel</button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    if (!window.confirm('FINAL CONFIRMATION: This will permanently delete your account. Continue?')) return
                    setDeletingAccount(true)
                    try {
                      await logout()
                      navigate('/auth')
                      toast$('Account deletion requested', 'success')
                    } catch { toast$('Failed to process. Try again.', 'error') }
                    finally { setDeletingAccount(false); setShowDeleteAccount(false) }
                  }}
                  disabled={deletingAccount}
                  style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: deletingAccount ? 'var(--border-medium)' : 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: deletingAccount ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Trash2 size={14} /> {deletingAccount ? 'Deleting...' : 'Delete Account'}
                </motion.button>
              </div>
            </div>
          </SettingsModal>
        )}
      </AnimatePresence>

      {/* ── Blocked Contacts Modal ── */}
      <AnimatePresence>
        {showBlocked && (
          <SettingsModal onClose={() => setShowBlocked(false)} title="Blocked Contacts" icon={<Ban size={18} color="#EF4444" />}>
            {(user?.blockedUsers?.length || 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Check size={24} color="#10B981" />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>No blocked contacts</h4>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>You haven't blocked anyone yet.<br/>Blocked contacts can't send you messages.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {user.blockedUsers.map((id, i) => (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-hover)', border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ban size={16} color="#EF4444" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Blocked User</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>ID: {String(id).substring(0,8)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SettingsModal>
        )}
      </AnimatePresence>

      {/* ── Two-Factor Auth Modal ── */}
      <AnimatePresence>
        {show2FA && (
          <SettingsModal onClose={() => setShow2FA(false)} title="Two-Factor Authentication" icon={<Fingerprint size={18} color="#10B981" />}>
            <TwoFactorModal onClose={() => setShow2FA(false)} user={user} updateProfile={updateProfile} toast={toast$} />
          </SettingsModal>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'error' ? '#EF4444' : '#22C55E', color: '#fff', padding: '10px 20px', borderRadius: 99, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 28px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
          >
            {toast.type === 'error' ? <X size={14} /> : <Check size={14} />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Reusable Subcomponents ───────────────────────────────────────────────────

function SettingsModal({ title, icon, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          position: 'relative', zIndex: 901,
          width: '92%', maxWidth: 440, background: 'var(--bg-surface)',
          borderRadius: 24, padding: 0,
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)', border: '1px solid var(--border-medium)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-panel)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {icon}
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-hover)', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

function TwoFactorModal({ onClose, user, updateProfile, toast }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  
  const isEnabled = user?.isTwoFactorEnabled

  const requestOTP = async () => {
    setLoading(true)
    try {
      await authAPI.sendOTP(user.identifier)
      setOtpSent(true)
      toast('Verification code sent!')
    } catch (err) {
      toast('Failed to send verification code', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    if (!code) return toast('Please enter the code', 'error')
    setLoading(true)
    try {
      if (isEnabled) {
        await authAPI.disable2fa(code)
        await updateProfile({ isTwoFactorEnabled: false })
        toast('2FA disabled successfully!')
        onClose()
      } else {
        await authAPI.enable2fa(code)
        await updateProfile({ isTwoFactorEnabled: true })
        toast('2FA enabled successfully!')
        onClose()
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Invalid code', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,.1)', border: '2px solid rgba(16,185,129,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Fingerprint size={28} color="#10B981" />
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{isEnabled ? 'Disable 2FA' : 'Enable 2FA'}</h3>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {isEnabled 
          ? 'Enter the 6-digit code sent to your registered email or phone to confirm you want to disable 2FA.'
          : 'Secure your account with an email or SMS verification code.'}
      </p>

      {!otpSent ? (
        <motion.button
          disabled={loading}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={requestOTP}
          style={{ width: '100%', padding: 13, borderRadius: 13, background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(59,130,246,.35)' }}
        >
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Fingerprint size={16} />}
          Send Verification Code
        </motion.button>
      ) : (
        <>
          <input 
            value={code} 
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid var(--border-light)', background: 'var(--bg-hover)', fontSize: 24, letterSpacing: '8px', textAlign: 'center', color: 'var(--text-primary)', outline: 'none', marginBottom: 20, fontFamily: 'monospace' }}
          />
          <motion.button
            disabled={loading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleToggle}
            style={{ width: '100%', padding: 13, borderRadius: 13, background: isEnabled ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 6px 20px ${isEnabled ? 'rgba(239,68,68,.35)' : 'rgba(16,185,129,.35)'}` }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Fingerprint size={16} />}
            {isEnabled ? 'Verify & Disable' : 'Verify & Enable'}
          </motion.button>
        </>
      )}
    </div>
  )
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius: 12, background: 'var(--bg-hover)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13.5 }}
      >
        {question}
        <motion.div animate={{ rotate: open ? 180 : 0 }} style={{ color: 'var(--text-muted)' }}><ChevronDown size={16} /></motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
