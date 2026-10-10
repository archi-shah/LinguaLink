// AdminUserProfile.jsx — Per-user detail drawer for admin
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Shield, ShieldOff, Trash2, UserCheck, UserX,
  MessageSquare, Globe, Clock, Calendar, CheckCircle,
  XCircle, Mail, Phone, Hash, Users, ChevronRight,
  Activity, MessageCircle, RefreshCw, Image, FileText,
  Mic, MapPin, User, Crown, AlertTriangle, TrendingUp
} from 'lucide-react';
import { adminAPI } from '../../api/client';

const SERVER = 'http://localhost:5000';

// ── helpers ──────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

const timeAgo = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const MEDIA_ICON = { image: Image, audio: Mic, file: FileText, location: MapPin, text: MessageCircle };
const MEDIA_LABEL = { image: 'Photo', audio: 'Voice', file: 'File', location: 'Location', text: 'Text' };
const LANG_NAMES = {
  en: 'English', hi: 'Hindi', fr: 'French', es: 'Spanish', de: 'German',
  ja: 'Japanese', ar: 'Arabic', zh: 'Chinese', ru: 'Russian', pt: 'Portuguese',
};

// ── ConfirmModal ──────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onClose, danger }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <motion.div
        className="admin-modal" style={{ maxWidth: 380 }}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="admin-modal-header">
          <span className="admin-modal-title">{title}</span>
          <button className="admin-btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-modal-body">
          <p style={{ fontSize: 14, color: 'var(--ll-text-3)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={danger ? 'admin-btn-danger' : 'admin-btn-primary'}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
              onClose();
            }}
          >
            {busy ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── InfoChip ─────────────────────────────────────────────────────────
function InfoChip({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      background: 'var(--ll-bg-elem)', borderRadius: 12,
      padding: '14px 16px', flex: '1 1 140px', minWidth: 0,
      border: '1px solid var(--ll-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: color ? `${color}18` : 'var(--ll-bg-hover)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color={color || 'var(--ll-text-3)'} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ll-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ll-text-1)', wordBreak: 'break-word' }}>
        {value || '—'}
      </div>
    </div>
  );
}

// ── BarChart ─────────────────────────────────────────────────────────
function BarChart({ data, color = '#7C3AED', label = 'count' }) {
  if (!data || data.length === 0) return (
    <div className="admin-empty" style={{ padding: '30px' }}>
      <Activity size={24} strokeWidth={1.2} />
      <p style={{ fontSize: 13 }}>No data available</p>
    </div>
  );
  const max = Math.max(...data.map(d => d[label] || d.count || 0), 1);
  return (
    <div className="admin-chart-container" style={{ height: 160, display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 10 }}>
      {data.map((d, i) => {
        const val = d[label] || d.count || 0;
        const pct = Math.max((val / max) * 100, 2);
        const key = d._id || d.date || i;
        const shortKey = key.length > 5 ? key.slice(5) : key;
        return (
          <div key={i} className="chart-bar-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div
              className="chart-bar"
              data-value={val}
              style={{ width: '100%', maxWidth: 30, height: `${pct}%`, background: color, borderRadius: '4px 4px 0 0', opacity: 0.75 + (i / data.length) * 0.25, position: 'relative' }}
            >
              <span style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'var(--text-secondary)' }}>{val}</span>
            </div>
            <div className="chart-bar-label" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>{shortKey}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── StatBall ─────────────────────────────────────────────────────────
function StatBall({ value, label, color, icon: Icon }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', background: 'var(--ll-bg-card)',
      borderRadius: 16, padding: '20px 12px',
      border: `1px solid ${color}30`,
      boxShadow: `0 4px 16px ${color}12`,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}18`, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 10px',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--ll-text-1)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ll-text-3)', marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function AdminUserProfile({ userId, onClose, onUserUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [tab, setTab] = useState('messages'); // 'messages' | 'chats'

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminAPI.getUserProfile(userId);
      setData(result);
    } catch (e) {
      setError(e.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleBan = async () => {
    setActionBusy(true);
    try {
      await adminAPI.toggleBan(userId);
      await load();
      onUserUpdated?.();
    } finally { setActionBusy(false); }
  };

  const handleDelete = async () => {
    setActionBusy(true);
    try {
      await adminAPI.deleteUser(userId);
      onUserUpdated?.();
      onClose();
    } finally { setActionBusy(false); }
  };

  const u = data?.user;
  const stats = data?.stats || {};

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 35 }}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 580, maxWidth: '96vw',
          background: 'var(--ll-bg)',
          borderLeft: '1px solid var(--ll-border)',
          zIndex: 1001,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* ── Drawer Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          background: 'var(--ll-bg-card)',
          borderBottom: '1px solid var(--ll-border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,#4C74F9,#8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ll-text-1)', fontFamily: 'Outfit, sans-serif' }}>
                User Profile
              </div>
              <div style={{ fontSize: 11, color: 'var(--ll-text-3)', fontWeight: 500 }}>
                Detailed view & management
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="admin-btn-icon"
              onClick={load}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button className="admin-btn-icon" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading && !data ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div className="admin-spinner" />
            </div>
          ) : error ? (
            <div style={{
              padding: 24, textAlign: 'center', color: 'var(--ll-red)',
              background: 'rgba(239,68,68,0.06)', borderRadius: 12,
              border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <AlertTriangle size={32} style={{ marginBottom: 10, opacity: 0.6 }} />
              <div style={{ fontWeight: 600 }}>{error}</div>
              <button className="admin-btn-primary" style={{ marginTop: 16 }} onClick={load}>Retry</button>
            </div>
          ) : u ? (
            <>
              {/* ── Profile Hero ── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 18,
                background: 'var(--ll-bg-card)', borderRadius: 16,
                padding: '20px 24px', marginBottom: 20,
                border: '1px solid var(--ll-border)',
                boxShadow: 'var(--ll-shadow-sm)',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Gradient accent bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: 'linear-gradient(135deg,#4C74F9,#8B5CF6)',
                }} />

                {/* Avatar */}
                <div style={{
                  width: 72, height: 72, borderRadius: 18,
                  background: u.profilePic ? 'transparent' : 'linear-gradient(135deg,#4C74F9,#8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 800, color: '#fff',
                  overflow: 'hidden', flexShrink: 0,
                  boxShadow: '0 8px 24px rgba(76,116,249,0.25)',
                }}>
                  {u.profilePic
                    ? <>
                        <img src={u.profilePic.startsWith('http') || u.profilePic.startsWith('data:') ? u.profilePic : `${SERVER}${u.profilePic}`} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'inline'; }} />
                        <span style={{ display: 'none' }}>{(u.name?.[0] || '?').toUpperCase()}</span>
                      </>
                    : (u.name?.[0] || '?').toUpperCase()
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ll-text-1)', fontFamily: 'Outfit, sans-serif' }}>
                      {u.name}
                    </span>
                    {u.role === 'admin' && (
                      <span className="admin-badge admin-role" style={{ gap: 4 }}>
                        <Crown size={10} />Admin
                      </span>
                    )}
                    {u.isBanned && (
                      <span className="admin-badge banned">Blocked</span>
                    )}
                    {u.isVerified && (
                      <span className="admin-badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                        <CheckCircle size={10} />Verified
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--ll-text-3)', marginTop: 4 }}>
                    {u.identifier}
                  </div>

                  {u.bio && (
                    <div style={{
                      fontSize: 12, color: 'var(--ll-text-2)', marginTop: 6,
                      fontStyle: 'italic', lineHeight: 1.5,
                      background: 'var(--ll-bg-elem)', borderRadius: 8, padding: '6px 10px',
                    }}>
                      "{u.bio}"
                    </div>
                  )}

                  {/* Online status indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: u.onlineStatus === 'online' ? '#10B981' : u.onlineStatus === 'away' ? '#F59E0B' : '#6B7A9E',
                      boxShadow: u.onlineStatus === 'online' ? '0 0 6px #10B981' : 'none',
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ll-text-3)', textTransform: 'capitalize' }}>
                      {u.onlineStatus}
                      {u.onlineStatus !== 'online' && u.lastSeen && ` · ${timeAgo(u.lastSeen)}`}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  {u.role !== 'admin' && (
                    <button
                      className={`admin-btn-icon ${u.isBanned ? '' : 'ban'}`}
                      title={u.isBanned ? 'Unblock User' : 'Block User'}
                      disabled={actionBusy}
                      onClick={() => setConfirm({
                        title: u.isBanned ? 'Unblock User' : 'Block User',
                        message: u.isBanned
                          ? `Allow ${u.name} back onto the platform?`
                          : `Block ${u.name}? They will be immediately logged out.`,
                        onConfirm: handleBan,
                        danger: !u.isBanned,
                      })}
                      style={{ width: 36, height: 36 }}
                    >
                      {u.isBanned ? <UserCheck size={16} /> : <UserX size={16} />}
                    </button>
                  )}
                  {u.role !== 'admin' && (
                    <button
                      className="admin-btn-icon delete"
                      title="Delete User"
                      disabled={actionBusy}
                      onClick={() => setConfirm({
                        title: 'Delete User',
                        message: `Permanently delete ${u.name}? This cannot be undone.`,
                        onConfirm: handleDelete,
                        danger: true,
                      })}
                      style={{ width: 36, height: 36 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Stats Row ── */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                <StatBall value={stats.totalMessages} label="Total Messages" color="#4C74F9" icon={MessageSquare} />
                <StatBall value={stats.totalChats} label="Total Chats" color="#8B5CF6" icon={Users} />
                <StatBall value={stats.messagesToday} label="Today" color="#10B981" icon={Activity} />
              </div>

              {/* ── Info Grid ── */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                <InfoChip icon={Calendar} label="Joined" value={fmtDate(u.createdAt)} color="#4C74F9" />
                <InfoChip icon={Clock} label="Last Seen" value={timeAgo(u.lastSeen)} color="#8B5CF6" />
                <InfoChip icon={Globe} label="Language"
                  value={LANG_NAMES[u.language] || u.language?.toUpperCase() || 'EN'} color="#06B6D4" />
                <InfoChip
                  icon={u.isVerified ? CheckCircle : XCircle}
                  label="Verified"
                  value={u.isVerified ? 'Yes' : 'No'}
                  color={u.isVerified ? '#10B981' : '#EF4444'}
                />
                <InfoChip
                  icon={u.preferences?.autoTranslate ? CheckCircle : XCircle}
                  label="Auto Translate"
                  value={u.preferences?.autoTranslate ? 'On' : 'Off'}
                  color="#F59E0B"
                />
                <InfoChip
                  icon={u.preferences?.readReceipts ? CheckCircle : XCircle}
                  label="Read Receipts"
                  value={u.preferences?.readReceipts ? 'On' : 'Off'}
                  color="#6366F1"
                />
              </div>

              {/* ── Activity Chart ── */}
              <div style={{
                background: 'var(--ll-bg-card)', borderRadius: 16,
                padding: '20px 24px', marginBottom: 20,
                border: '1px solid var(--ll-border)',
                boxShadow: 'var(--ll-shadow-sm)'
              }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ll-text-1)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color="#10B981" />
                  Activity (Last 7 Days)
                </div>
                <BarChart data={stats.messagesLast7Days} color="#10B981" />
              </div>

              {/* ── Tabs ── */}
              <div style={{
                display: 'flex', borderBottom: '2px solid var(--ll-border)',
                marginBottom: 16, gap: 0,
              }}>
                {[
                  { id: 'messages', label: 'Recent Messages', icon: MessageCircle },
                  { id: 'chats', label: 'Chats', icon: Users },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '10px 20px', border: 'none', cursor: 'pointer',
                      background: 'transparent',
                      borderBottom: tab === t.id ? '2px solid #4C74F9' : '2px solid transparent',
                      marginBottom: -2, fontWeight: tab === t.id ? 700 : 500,
                      fontSize: 13, color: tab === t.id ? '#4C74F9' : 'var(--ll-text-3)',
                      transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <t.icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Tab: Recent Messages ── */}
              {tab === 'messages' && (
                <div className="admin-card">
                  {(!data.recentMessages || data.recentMessages.length === 0) ? (
                    <div className="admin-empty" style={{ padding: 40 }}>
                      <MessageSquare size={32} strokeWidth={1.2} />
                      <p>No messages found</p>
                    </div>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Message</th>
                            <th>Type</th>
                            <th>Chat</th>
                            <th>Sent</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentMessages.map((msg) => {
                            const MIcon = MEDIA_ICON[msg.mediaType] || MessageCircle;
                            return (
                              <tr key={msg._id}>
                                <td style={{ maxWidth: 180 }}>
                                  <div style={{
                                    fontSize: 13, fontWeight: 500,
                                    color: 'var(--ll-text-1)',
                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {msg.mediaType !== 'text'
                                      ? <span style={{ color: 'var(--ll-text-3)', fontStyle: 'italic' }}>
                                          [{MEDIA_LABEL[msg.mediaType] || msg.mediaType}]
                                        </span>
                                      : (msg.text === '🔒 Encrypted Message'
                                          ? <span className="admin-badge" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10B981'}}>🔒 Encrypted Message</span>
                                          : msg.text || '—')
                                    }
                                  </div>
                                </td>
                                <td>
                                  <span className={`admin-badge ${msg.mediaType}-type`}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <MIcon size={10} />
                                    {MEDIA_LABEL[msg.mediaType] || msg.mediaType}
                                  </span>
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--ll-text-3)' }}>
                                  {msg.chat
                                    ? (msg.chat.isGroup ? `👥 ${msg.chat.chatName || 'Group'}` : '💬 Direct')
                                    : '—'}
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--ll-text-3)', whiteSpace: 'nowrap' }}>
                                  {fmtDateTime(msg.createdAt)}
                                </td>
                                <td>
                                  <span className={`admin-badge ${msg.status === 'read' ? 'online' : 'offline'}`}>
                                    {msg.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Chats ── */}
              {tab === 'chats' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(!data.chats || data.chats.length === 0) ? (
                    <div className="admin-empty" style={{ padding: 40 }}>
                      <Users size={32} strokeWidth={1.2} />
                      <p>No chats found</p>
                    </div>
                  ) : (
                    data.chats.map((chat) => {
                      const others = chat.members.filter(m => String(m._id) !== userId);
                      const chatLabel = chat.isGroup
                        ? (chat.chatName || 'Group Chat')
                        : (others[0]?.name || 'Direct Chat');

                      return (
                        <div
                          key={chat._id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            background: 'var(--ll-bg-card)', borderRadius: 12,
                            padding: '14px 18px',
                            border: '1px solid var(--ll-border)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                            background: chat.isGroup
                              ? 'linear-gradient(135deg,#4C74F9,#8B5CF6)'
                              : 'linear-gradient(135deg,#10B981,#06B6D4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, fontWeight: 800, color: '#fff',
                          }}>
                            {chat.isGroup ? <Users size={18} color="#fff" /> : chatLabel[0]?.toUpperCase()}
                          </div>

                          {/* Details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ll-text-1)', marginBottom: 2 }}>
                              {chatLabel}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ll-text-3)' }}>
                              {chat.isGroup
                                ? `${chat.members.length} members`
                                : (others[0]?.identifier || '—')
                              }
                            </div>
                            {chat.latestMessage && (
                              <div style={{
                                fontSize: 11, color: 'var(--ll-text-3)', marginTop: 3,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {chat.latestMessage.text || `[${chat.latestMessage.mediaType}]`}
                              </div>
                            )}
                          </div>

                          {/* Stats */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 800,
                              color: 'var(--ll-blue)', fontFamily: 'Outfit, sans-serif',
                            }}>
                              {chat.messageCount}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--ll-text-3)', fontWeight: 600 }}>msgs</div>
                            <div style={{ fontSize: 10, color: 'var(--ll-text-3)', marginTop: 4 }}>
                              {timeAgo(chat.updatedAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </motion.div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirm && (
          <ConfirmModal
            title={confirm.title}
            message={confirm.message}
            onConfirm={confirm.onConfirm}
            onClose={() => setConfirm(null)}
            danger={confirm.danger}
          />
        )}
      </AnimatePresence>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
