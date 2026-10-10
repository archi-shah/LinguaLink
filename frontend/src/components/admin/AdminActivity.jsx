// AdminActivity.jsx — View real-time user activity, top senders, online users
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Wifi, MessageSquare, Users, Clock, RefreshCw, Radio, X, Send } from 'lucide-react';
import { adminAPI } from '../../api/client';

function BroadcastModal({ onClose }) {
  const [msg, setMsg] = useState('');
  const [severity, setSeverity] = useState('info');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await adminAPI.sendBroadcast(msg, severity);
      setResult('success');
      setTimeout(onClose, 2000);
    } catch (e) {
      setResult('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <motion.div className="admin-modal" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">Live Global Broadcast</span>
          <button className="admin-btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-modal-body">
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 16 }}>
            Send an instant floating notification to all online users.
          </p>
          <div className="admin-form-field">
            <label>Message</label>
            <textarea className="admin-form-input" rows={3} placeholder="System will go down for maintenance..."
              value={msg} onChange={e => setMsg(e.target.value)} />
          </div>
          <div className="admin-form-field">
            <label>Severity</label>
            <select className="admin-form-input" value={severity} onChange={e => setSeverity(e.target.value)}>
              <option value="info">Info (Blue)</option>
              <option value="warning">Warning (Orange)</option>
              <option value="important">Important (Red)</option>
            </select>
          </div>
          {result === 'success' && <div className="admin-alert success">Broadcast sent successfully!</div>}
          {result === 'error' && <div className="admin-alert error">Failed to send broadcast.</div>}
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="admin-btn-primary" onClick={handleSend} disabled={sending || !msg.trim()}>
            <Send size={14} /> {sending ? 'Transmitting...' : 'Send Now'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function UserRow({ user, metric, metricLabel }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: '1px solid var(--border-light)'
    }}>
      <div className="admin-avatar" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--primary)' }}>
        {user.profilePic
          ? <>
              <img src={user.profilePic.startsWith('http') || user.profilePic.startsWith('data:') ? user.profilePic : `http://localhost:5000${user.profilePic}`} alt="" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'inline'; }} />
              <span style={{ display: 'none' }}>{(user.name?.[0] || '?').toUpperCase()}</span>
            </>
          : (user.name?.[0] || '?').toUpperCase()
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {user.name}
          {user.role === 'admin' && <span style={{ background: '#EF4444', color: '#fff', fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: 800 }}>ADMIN</span>}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.identifier}</div>
      </div>
      {metric !== undefined && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--primary)', fontFamily: 'Outfit' }}>{metric}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{metricLabel}</div>
        </div>
      )}
    </div>
  );
}

export default function AdminActivity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getActivity();
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">User Activity</h1>
          <p className="admin-page-subtitle">Real-time presence, top senders, and recently active users</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="admin-btn-secondary" onClick={() => setShowBroadcast(true)} style={{ color: 'var(--primary)', borderColor: 'var(--primary-soft)' }}>
            <Radio size={14} /> Send Broadcast
          </button>
          <button className="admin-btn-primary" onClick={fetch}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Stat Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { icon: Wifi, label: 'Online Now', value: data?.onlineNow?.length ?? 0, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
          { icon: MessageSquare, label: 'Top Senders', value: data?.topSenders?.length ?? 0, color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
          { icon: Clock, label: 'Active (24h)', value: data?.recentlyActive?.length ?? 0, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
          { icon: Users, label: 'Communities', value: data?.communities?.length ?? 0, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
        ].map((s, i) => (
          <motion.div key={s.label} className="admin-stat-card"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="admin-stat-icon" style={{ background: s.bg }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div className="admin-stat-value">{s.value}</div>
            <div className="admin-stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="admin-activity-grid">
        {/* Top Senders */}
        <motion.div className="admin-card"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="admin-card-header">
            <span className="admin-card-title">🏆 Top Message Senders</span>
          </div>
          <div className="admin-card-body">
            {(data?.topSenders || []).length === 0
              ? <div className="admin-empty" style={{ padding: '32px' }}><Activity size={32} strokeWidth={1.2} /><p>No data yet</p></div>
              : (data?.topSenders || []).map((s, i) => (
                  <UserRow key={s._id} user={s.user} metric={s.count} metricLabel="messages" />
                ))
            }
          </div>
        </motion.div>

        {/* Online Now */}
        <motion.div className="admin-card"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <div className="admin-card-header">
            <span className="admin-card-title">🟢 Online Right Now</span>
            <span className="admin-badge online">{data?.onlineNow?.length || 0} online</span>
          </div>
          <div className="admin-card-body">
            {(data?.onlineNow || []).length === 0
              ? <div className="admin-empty" style={{ padding: '32px' }}><Wifi size={32} strokeWidth={1.2} /><p>No users online</p></div>
              : (data?.onlineNow || []).map(u => (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ position: 'relative' }}>
                      <div className="admin-avatar" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--primary)' }}>
                        {u.profilePic ? <>
                          <img src={u.profilePic.startsWith('http') || u.profilePic.startsWith('data:') ? u.profilePic : `http://localhost:5000${u.profilePic}`} alt="" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'inline'; }} />
                          <span style={{ display: 'none' }}>{(u.name?.[0] || '?').toUpperCase()}</span>
                        </> : (u.name?.[0] || '?').toUpperCase()}
                      </div>
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: '#10B981', border: '2px solid var(--bg-surface)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {u.name}
                        {u.role === 'admin' && <span style={{ background: '#EF4444', color: '#fff', fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: 800 }}>ADMIN</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.identifier} · {u.language?.toUpperCase()}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        </motion.div>

        {/* Recently Active */}
        <motion.div className="admin-card"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <div className="admin-card-header">
            <span className="admin-card-title">⏱ Recently Active (24h)</span>
          </div>
          <div className="admin-card-body">
            {(data?.recentlyActive || []).length === 0
              ? <div className="admin-empty" style={{ padding: '32px' }}><Clock size={32} strokeWidth={1.2} /><p>No recent activity</p></div>
              : (data?.recentlyActive || []).map(u => (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div className="admin-avatar" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--primary)' }}>
                      {u.profilePic ? <>
                        <img src={u.profilePic.startsWith('http') || u.profilePic.startsWith('data:') ? u.profilePic : `http://localhost:5000${u.profilePic}`} alt="" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'inline'; }} />
                        <span style={{ display: 'none' }}>{(u.name?.[0] || '?').toUpperCase()}</span>
                      </> : (u.name?.[0] || '?').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {u.name}
                        {u.role === 'admin' && <span style={{ background: '#EF4444', color: '#fff', fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: 800 }}>ADMIN</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.identifier}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {new Date(u.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
            }
          </div>
        </motion.div>

        {/* Active Communities */}
        <motion.div className="admin-card"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <div className="admin-card-header">
            <span className="admin-card-title">🏘 Communities</span>
          </div>
          <div className="admin-card-body">
            {(data?.communities || []).length === 0
              ? <div className="admin-empty" style={{ padding: '32px' }}><Users size={32} strokeWidth={1.2} /><p>No communities</p></div>
              : (data?.communities || []).map(c => (
                  <div key={c._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span className="admin-badge user-role">{(c.members || []).length} members</span>
                        <span className="admin-badge text-type">{(c.channels || []).length} channels</span>
                      </div>
                    </div>
                    {c.description && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{c.description}</p>
                    )}
                  </div>
                ))
            }
          </div>
        </motion.div>
      </div>
      
      {/* Broadcast Modal */}
      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
    </div>
  );
}
