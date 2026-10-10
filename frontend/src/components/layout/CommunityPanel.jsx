/**
 * CommunityPanel.jsx — Production-Level Communities
 * ─────────────────────────────────────────────────────────────────────────
 * Full-stack, real-time community hub with:
 *   • Beautiful discovery feed with category filtering
 *   • Rich community detail view with member list, stats, description
 *   • Join / Leave with live member count updates
 *   • Create community with category picker and emoji
 *   • Add / browse channels with message count badges
 *   • Click channel → opens group ChatWindow instantly
 *   • Animated transitions and premium micro-interactions
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Users, Hash, ChevronRight, ArrowLeft,
  X, Check, Bell, Loader2, AlertCircle, MessageSquare,
  Settings, Globe, Shield, TrendingUp, Zap, Star,
  Lock, Unlock, UserPlus, Crown, Info, Menu
} from 'lucide-react'
import { communityAPI } from '../../api/client'
import useStore from '../../store/useStore'
import ChatWindow from './ChatWindow.jsx'

// ── Category config ───────────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  Tech:      { color: '#4C74F9', emoji: '💻', desc: 'Development, AI, tools' },
  Health:    { color: '#EF4444', emoji: '❤️', desc: 'Wellness, fitness, mental health' },
  Sports:    { color: '#10B981', emoji: '⚽', desc: 'Teams, leagues, live updates' },
  Business:  { color: '#F59E0B', emoji: '💼', desc: 'Startups, finance, networking' },
  Education: { color: '#8B5CF6', emoji: '📚', desc: 'Learning, courses, research' },
  Creative:  { color: '#EC4899', emoji: '🎨', desc: 'Art, music, design, writing' },
  Travel:    { color: '#0EA5E9', emoji: '✈️', desc: 'Adventure, tips, experiences' },
  Food:      { color: '#F97316', emoji: '🍕', desc: 'Recipes, restaurants, culture' },
  General:   { color: '#6B7280', emoji: '🌐', desc: 'Open discussions' },
}
const CATEGORIES = Object.keys(CATEGORY_CONFIG)
const colorFor = (c)  => c?.color || CATEGORY_CONFIG[c?.category]?.color || '#4C74F9'
const emojiFor = (c)  => c?.emoji || CATEGORY_CONFIG[c?.category]?.emoji || '🌐'
const fmtNum   = (n)  => !n ? '0' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)

// ── Spinner ───────────────────────────────────────────────────────────────
function Spinner({ size = 28 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <Loader2 size={size} color="var(--primary)" />
      </motion.div>
    </div>
  )
}

// ── Create Community Modal ────────────────────────────────────────────────
function CreateCommunityModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', category: 'General' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const cfg = CATEGORY_CONFIG[form.category]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Community name is required'); return }
    setSaving(true); setErr('')
    try {
      const created = await communityAPI.create({ ...form, color: cfg.color, emoji: cfg.emoji })
      onCreate(created); onClose()
    } catch (e) { setErr(e.message || 'Failed to create community') }
    finally { setSaving(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, y: 24, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, borderRadius: 24, background: 'var(--bg-panel)', border: '1px solid var(--border-light)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Coloured banner */}
        <div style={{ height: 90, background: `linear-gradient(135deg, ${cfg.color}CC, ${cfg.color}77)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, flexShrink: 0, position: 'relative' }}>
          {cfg.emoji}
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <form onSubmit={handleSubmit} style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit,sans-serif' }}>Create Community</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Build a space for people with shared interests</p>
            </div>

            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Community Name *</label>
              <input
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Developers of India" maxLength={60} autoFocus
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border-light)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = cfg.color}
                onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
              />
            </div>

            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Description</label>
              <textarea
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What is this community about? Who is it for?" rows={3} maxLength={280}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border-light)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: 13.5, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = cfg.color}
                onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
              />
            </div>

            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Category</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {CATEGORIES.map(cat => (
                  <button type="button" key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                    style={{
                      padding: '6px 13px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.18s',
                      background: form.category === cat ? CATEGORY_CONFIG[cat].color : 'var(--bg-hover)',
                      color: form.category === cat ? '#fff' : 'var(--text-secondary)',
                      boxShadow: form.category === cat ? `0 3px 12px ${CATEGORY_CONFIG[cat].color}55` : 'none',
                      transform: form.category === cat ? 'scale(1.05)' : 'scale(1)'
                    }}
                  >
                    {CATEGORY_CONFIG[cat].emoji} {cat}
                  </button>
                ))}
              </div>
            </div>

            {err && <p style={{ color: '#EF4444', fontSize: 13, margin: 0, background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 8 }}>{err}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1.5px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancel</button>
              <motion.button
                type="submit" disabled={saving} whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ flex: 2, padding: 12, borderRadius: 12, background: saving ? 'var(--bg-hover)' : `linear-gradient(135deg, ${cfg.color}, ${cfg.color}bb)`, color: saving ? 'var(--text-muted)' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: saving ? 'none' : `0 4px 20px ${cfg.color}55` }}
              >
                {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : '🚀 Create Community'}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Add Channel Modal ─────────────────────────────────────────────────────
function AddChannelModal({ communityId, communityColor, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', description: '', isAnnouncement: false })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Channel name is required'); return }
    setSaving(true); setErr('')
    try {
      const updated = await communityAPI.addChannel(communityId, form)
      onAdded(updated); onClose()
    } catch (e) { setErr(e.message || 'Failed to add channel') }
    finally { setSaving(false) }
  }

  const cleanName = (v) => v.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-')

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 360, borderRadius: 20, background: 'var(--bg-panel)', border: '1px solid var(--border-light)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden' }}
      >
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: communityColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hash size={16} color={communityColor} />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>New Channel</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Channel Name *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 11, border: '1.5px solid var(--border-light)', background: 'var(--bg-hover)' }}>
              <Hash size={14} color={communityColor} />
              <input
                value={form.name} onChange={e => setForm(f => ({ ...f, name: cleanName(e.target.value) }))}
                placeholder="channel-name" autoFocus
                style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Description</label>
            <input
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What's this channel for?"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-light)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {/* Announcement toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'var(--bg-hover)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={14} color="#F59E0B" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Announcements</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Only admins can post</div>
              </div>
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, isAnnouncement: !f.isAnnouncement }))}
              style={{ width: 38, height: 22, borderRadius: 11, background: form.isAnnouncement ? '#F59E0B' : 'var(--border-medium)', border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.isAnnouncement ? 19 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            </button>
          </div>
          {err && <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 11, border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancel</button>
            <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ flex: 1.5, padding: '11px', borderRadius: 11, background: `linear-gradient(135deg, ${communityColor}, ${communityColor}aa)`, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Adding…' : '+ Add Channel'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Community Card ────────────────────────────────────────────────────────
function CommunityCard({ c, onClick, onJoin }) {
  const color = colorFor(c)
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: `0 8px 28px ${color}22` }}
      onClick={onClick}
      style={{ borderRadius: 16, border: '1px solid var(--border-light)', background: 'var(--bg-surface)', cursor: 'pointer', overflow: 'hidden', transition: 'box-shadow 0.2s' }}
    >
      {/* Top gradient bar */}
      <div style={{ height: 6, background: `linear-gradient(90deg, ${color}, ${color}77)` }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: color + '18', border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
            {emojiFor(c)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              {c.isMember && <span style={{ fontSize: 9.5, fontWeight: 700, background: color + '22', color, padding: '2px 8px', borderRadius: 99, flexShrink: 0, border: `1px solid ${color}40` }}>Joined</span>}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{c.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} /> {fmtNum(c.memberCount)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Hash size={10} /> {c.channelCount || c.channels?.length || 0}</span>
              </div>
              {!c.isMember && (
                <motion.button
                  whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                  onClick={e => { e.stopPropagation(); onJoin(c._id) }}
                  style={{ padding: '4px 13px', borderRadius: 99, background: color + '18', border: `1.5px solid ${color}50`, color, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <UserPlus size={11} /> Join
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Community List ────────────────────────────────────────────────────────
function CommunityList({ communities, loading, error, onRetry, onSelect, onJoin, search, setSearch, onNew, setMobileSidebarOpen }) {
  const [activeTab, setActiveTab] = useState('all')
  const joined = communities.filter(c => c.isMember)
  const visible = communities.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
    if (activeTab === 'mine') return c.isMember && matchSearch
    return matchSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 18px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="mobile-only" onClick={() => setMobileSidebarOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
              <Menu size={24} />
            </button>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit,sans-serif', margin: '0 0 2px' }}>Communities</h1>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{communities.length} communities available</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={onNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#6366F1)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}
          >
            <Plus size={15} /> Create
          </motion.button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search communities…"
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, background: 'var(--bg-hover)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={14} /></button>}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[['all', 'Discover', Globe], ['mine', `Joined (${joined.length})`, Check]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.18s',
                background: activeTab === id ? 'var(--primary)' : 'var(--bg-hover)',
                color: activeTab === id ? '#fff' : 'var(--text-secondary)',
              }}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 18px' }}>
        {loading && <Spinner />}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <AlertCircle size={32} color="#EF4444" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 14px' }}>{error}</p>
            <button onClick={onRetry} style={{ padding: '8px 20px', borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
          </div>
        )}
        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{activeTab === 'mine' ? '👋' : '🔍'}</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{activeTab === 'mine' ? 'You haven\'t joined any communities yet' : 'No communities found'}</p>
              </div>
            ) : visible.map((c, i) => (
              <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <CommunityCard c={c} onClick={() => onSelect(c)} onJoin={onJoin} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Community Detail ──────────────────────────────────────────────────────
function CommunityDetail({ community, onBack, onJoin, onLeave, onChannelOpen, onUpdated }) {
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [activeTab, setActiveTab] = useState('channels') // 'channels' | 'members'
  const color = colorFor(community)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Banner */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ height: 120, background: `linear-gradient(135deg,${color}DD,${color}88)`, position: 'relative', overflow: 'hidden' }}>
          {/* Abstract circles */}
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -10, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <motion.button onClick={onBack} whileHover={{ scale: 1.08 }}
            style={{ position: 'absolute', top: 12, left: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.28)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <ArrowLeft size={16} />
          </motion.button>
          <div style={{ position: 'absolute', bottom: 14, left: 16, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 17, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.4)', fontSize: 28, flexShrink: 0 }}>
              {emojiFor(community)}
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'Outfit,sans-serif', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{community.name}</h2>
              <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11} /> {fmtNum(community.memberCount)} members</span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Hash size={11} /> {community.channels?.length || 0} channels</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions row */}
        <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0, flex: 1 }}>{community.description}</p>
          {community.isMember ? (
            <motion.button onClick={() => onLeave(community._id)} whileHover={{ scale: 1.04 }}
              style={{ padding: '6px 13px', borderRadius: 10, border: '1.5px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <Check size={12} /> Joined
            </motion.button>
          ) : (
            <motion.button onClick={() => onJoin(community._id)} whileHover={{ scale: 1.04 }}
              style={{ padding: '6px 13px', borderRadius: 10, background: color, border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 3px 12px ${color}55` }}>
              <UserPlus size={12} /> Join Community
            </motion.button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '12px 16px 0', borderBottom: '1px solid var(--border-light)' }}>
          {[['channels', 'Channels'], ['members', 'Members']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'transparent',
                color: activeTab === id ? color : 'var(--text-secondary)',
                borderBottom: activeTab === id ? `2px solid ${color}` : '2px solid transparent',
                transition: 'all 0.2s', marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'channels' && (
            <motion.div key="channels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Add channel btn */}
              {community.isMember && (
                <div style={{ padding: '12px 16px 4px', display: 'flex', justifyContent: 'flex-end' }}>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddChannel(true)}
                    style={{ padding: '7px 14px', borderRadius: 10, background: color + '18', border: `1.5px solid ${color}40`, color, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={13} /> Add Channel
                  </motion.button>
                </div>
              )}

              {/* Channel list */}
              {community.channels?.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                  <Hash size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>No channels yet</p>
                </div>
              )}
              {community.channels?.map(ch => (
                <motion.div key={ch._id} whileHover={{ background: 'var(--bg-hover)' }}
                  onClick={() => {
                    if (!community.isMember) return alert('Join the community first to access its channels.')
                    if (ch.chatId) onChannelOpen(ch.chatId, ch.name)
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: community.isMember ? 'pointer' : 'default', transition: 'background 0.15s' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: ch.isAnnouncement ? 'rgba(245,158,11,0.12)' : color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {ch.isAnnouncement ? <Bell size={17} color="#F59E0B" /> : <Hash size={17} color={color} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>#{ch.name}</span>
                      {ch.isAnnouncement && <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '2px 6px', borderRadius: 99, border: '1px solid rgba(245,158,11,0.3)' }}>ANNOUNCE</span>}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.description || 'No description'}</p>
                  </div>
                  {ch.chatId && community.isMember && <MessageSquare size={14} color={color} style={{ flexShrink: 0, opacity: 0.7 }} />}
                  {!community.isMember && <Lock size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                </motion.div>
              ))}

              {/* Leave btn */}
              {community.isMember && (
                <div style={{ padding: '16px' }}>
                  <motion.button whileHover={{ scale: 1.02 }} onClick={() => onLeave(community._id)}
                    style={{ width: '100%', padding: 11, borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1.5px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <X size={14} /> Leave Community
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'members' && (
            <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '8px 0' }}>
              {!community.members || community.members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                  <Users size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Member list not available</p>
                </div>
              ) : community.members.map((m, i) => {
                const isAdmin = community.admins?.includes(String(m._id || m.id))
                const isSystemAdmin = m.role === 'admin'
                return (
                  <div key={m._id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                    {m.profilePic
                      ? <img src={m.profilePic} alt={m.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 38, height: 38, borderRadius: '50%', background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color, flexShrink: 0 }}>{(m.initials || m.name?.substring(0,2) || 'U').toUpperCase()}</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {m.name}
                        {isSystemAdmin && <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Admin</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.language?.toUpperCase() || 'EN'}</div>
                    </div>
                    {isAdmin && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: color + '18', color, padding: '2px 8px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Crown size={9} /> Admin
                      </span>
                    )}
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAddChannel && (
          <AddChannelModal
            communityId={community._id}
            communityColor={color}
            onClose={() => setShowAddChannel(false)}
            onAdded={(updated) => { onUpdated(updated); setShowAddChannel(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Right Area (welcome / info) ───────────────────────────────────────────
function RightArea({ selected }) {
  if (!selected) return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', textAlign: 'center', padding: 40 }}
    >
      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} style={{ fontSize: 60, marginBottom: 20 }}>🌐</motion.div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit,sans-serif', marginBottom: 10 }}>Discover Communities</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 340, lineHeight: 1.7, marginBottom: 28 }}>
        Join communities based on your interests. Browse channels, connect with people worldwide, and chat in any language with live translation.
      </p>
      <div style={{ display: 'flex', gap: 20 }}>
        {[['🌍', 'Multilingual'], ['⚡', 'Real-time'], ['🔒', 'Private channels']].map(([e, l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{e}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)' }}>{l}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )

  const color = colorFor(selected)
  return (
    <motion.div key={selected._id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', textAlign: 'center', padding: 40 }}
    >
      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: 70, marginBottom: 20, filter: `drop-shadow(0 8px 24px ${color}55)` }}>
        {emojiFor(selected)}
      </motion.div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit,sans-serif', marginBottom: 8 }}>{selected.name}</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, lineHeight: 1.7, marginBottom: 28 }}>{selected.description}</p>
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 28, padding: '20px 40px', borderRadius: 18, background: color + '0d', border: `1px solid ${color}20` }}>
        <div><div style={{ fontSize: 26, fontWeight: 800, color }}>{fmtNum(selected.memberCount)}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Members</div></div>
        <div style={{ width: 1, background: 'var(--border-light)' }} />
        <div><div style={{ fontSize: 26, fontWeight: 800, color }}>{selected.channels?.length || 0}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Channels</div></div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {selected.isMember
          ? <><MessageSquare size={14} /> Click a channel on the left to start chatting</>
          : <><UserPlus size={14} /> Join this community to access all channels</>}
      </p>
    </motion.div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────
export default function CommunityPanel() {
  const { activeChat, setActiveChat, setActiveSidebar, setMobileSidebarOpen } = useStore()
  const [communities,  setCommunities]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [selected,     setSelected]     = useState(null)
  const [search,       setSearch]       = useState('')
  const [showCreate,   setShowCreate]   = useState(false)

  const loadCommunities = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await communityAPI.getAll()
      setCommunities(Array.isArray(data) ? data : [])
    } catch (e) { setError(e.message || 'Failed to load communities') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadCommunities() }, [loadCommunities])

  const handleJoin = async (id) => {
    try {
      const updated = await communityAPI.join(id)
      setCommunities(prev => prev.map(c => c._id === id ? { ...c, isMember: true, memberCount: updated.memberCount } : c))
      if (selected?._id === id) setSelected(updated)
      useStore.getState().loadChats()
    } catch (e) { alert(e.message) }
  }

  const handleLeave = async (id) => {
    try {
      const updated = await communityAPI.leave(id)
      setCommunities(prev => prev.map(c => c._id === id ? { ...c, isMember: false, memberCount: updated.memberCount } : c))
      if (selected?._id === id) { setSelected(null); setActiveChat(null) }
      useStore.getState().loadChats()
    } catch (e) { alert(e.message) }
  }

  const handleSelect = async (c) => {
    setActiveChat(null)
    try {
      const full = await communityAPI.getOne(c._id)
      setSelected(full)
    } catch (_) { setSelected(c) }
  }

  const handleChannelOpen = (chatId) => { setActiveChat(chatId) }

  const handleCreated = (newCommunity) => {
    setCommunities(prev => [newCommunity, ...prev])
    setSelected(newCommunity)
    useStore.getState().loadChats()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
      style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--bg-page)' }}
    >
      {/* Left panel */}
      <div className="fluid-left-panel" style={{ overflow: 'hidden', height: '100%' }}>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key="detail" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={{ duration: 0.18 }} style={{ height: '100%' }}>
              <CommunityDetail
                community={selected}
                onBack={() => { setActiveChat(null); setSelected(null) }}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onChannelOpen={handleChannelOpen}
                onUpdated={(updated) => {
                  setSelected(updated)
                  setCommunities(prev => prev.map(c => c._id === updated._id ? { ...c, ...updated } : c))
                  useStore.getState().loadChats()
                }}
              />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: 0.18 }} style={{ height: '100%' }}>
              <CommunityList
                communities={communities} loading={loading} error={error}
                onRetry={loadCommunities} onSelect={handleSelect} onJoin={handleJoin}
                search={search} setSearch={setSearch} onNew={() => setShowCreate(true)}
                setMobileSidebarOpen={setMobileSidebarOpen}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right area */}
      <div className="app-main-panel" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {activeChat ? <ChatWindow /> : <RightArea selected={selected} />}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && <CreateCommunityModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } } .spin { animation: spin 1s linear infinite }`}</style>
    </motion.div>
  )
}
