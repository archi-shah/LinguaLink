// AdminOverview.jsx — Stats, charts, recent signups
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Globe, Wifi, ShieldOff, CheckCircle, Activity, TrendingUp } from 'lucide-react';
import useStore from '../../store/useStore';
import { adminAPI } from '../../api/client';

const LANG_NAMES = {
  en: 'English', hi: 'Hindi', fr: 'French', es: 'Spanish', de: 'German',
  ja: 'Japanese', ar: 'Arabic', zh: 'Chinese', ru: 'Russian', pt: 'Portuguese',
};

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F43F5E', '#14B8A6', '#84CC16'
];

function BarChart({ data, color = '#7C3AED', label = 'count' }) {
  if (!data || data.length === 0) return (
    <div className="admin-empty" style={{ padding: '40px' }}>
      <Activity size={32} strokeWidth={1.2} />
      <p>No data available</p>
    </div>
  );
  const max = Math.max(...data.map(d => d[label] || d.count || 0), 1);
  return (
    <div className="admin-chart-container">
      {data.map((d, i) => {
        const val = d[label] || d.count || 0;
        const pct = Math.max((val / max) * 100, 2);
        const key = d._id || d.date || i;
        const shortKey = key.length > 5 ? key.slice(5) : key;
        return (
          <div key={i} className="chart-bar-wrap">
            <div
              className="chart-bar"
              data-value={val}
              style={{ height: `${pct}%`, background: color, opacity: 0.75 + (i / data.length) * 0.25 }}
            />
            <div className="chart-bar-label">{shortKey}</div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.count, 0);
  let cumulative = 0;
  const segments = data.map((d, i) => {
    const pct = (d.count / total) * 100;
    const offset = cumulative;
    cumulative += pct;
    return { ...d, pct, offset, color: COLORS[i % COLORS.length] };
  });

  const r = 45, cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="donut-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="18"
            strokeDasharray={`${(seg.pct / 100) * circumference} ${circumference}`}
            strokeDashoffset={-(seg.offset / 100) * circumference}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        ))}
        <circle cx={cx} cy={cy} r={r - 9} fill="var(--bg-surface)" />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontWeight="800" fontFamily="Outfit,sans-serif">
          {total}
        </text>
      </svg>
      <div className="donut-legend">
        {segments.slice(0, 5).map((seg, i) => (
          <div key={i} className="donut-legend-item">
            <div className="donut-legend-dot" style={{ background: seg.color }} />
            <span>{LANG_NAMES[seg._id] || seg._id || 'Unknown'}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '12px' }}>{seg.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [adminStats, setAdminStats] = React.useState(null);
  const [adminLoading, setAdminLoading] = React.useState(true);

  const fetchAdminStats = async () => {
    setAdminLoading(true);
    try {
      const data = await adminAPI.getStats();
      setAdminStats(data);
    } catch (e) {
      console.error(e);
      // Fallback dummy data if backend route is not complete
      setAdminStats({
        totalUsers: 0, activeUsers: 0, totalMessages: 0, totalCommunities: 0,
        bannedUsers: 0, verifiedUsers: 0, messagesLast7Days: [], signupsLast7Days: [], languageDist: []
      });
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => { fetchAdminStats(); }, []);

  if (adminLoading && !adminStats) {
    return <div className="admin-loading"><div className="admin-spinner" /></div>;
  }

  const stats = adminStats || {};

  const cards = [
    {
      label: 'Total Users', value: stats.totalUsers ?? '—',
      icon: Users, color: '#7C3AED', bg: 'rgba(124,58,237,0.1)',
    },
    {
      label: 'Online Now', value: stats.activeUsers ?? '—',
      icon: Wifi, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
    },
    {
      label: 'Total Messages', value: stats.totalMessages ?? '—',
      icon: MessageSquare, color: '#6366F1', bg: 'rgba(99,102,241,0.1)',
    },
    {
      label: 'Communities', value: stats.totalCommunities ?? '—',
      icon: Globe, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',
    },
    {
      label: 'Blocked Users', value: stats.bannedUsers ?? '—',
      icon: ShieldOff, color: '#EF4444', bg: 'rgba(239,68,68,0.1)',
    },
    {
      label: 'Verified Users', value: stats.verifiedUsers ?? '—',
      icon: CheckCircle, color: '#059669', bg: 'rgba(16,185,129,0.1)',
    },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Overview</h1>
          <p className="admin-page-subtitle">System health & platform statistics</p>
        </div>
        <button
          onClick={() => fetchAdminStats()}
          className="admin-btn-primary"
          style={{ padding: '9px 16px' }}
        >
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="admin-stats-grid">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            className="admin-stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="admin-stat-icon" style={{ background: card.bg }}>
              <card.icon size={22} color={card.color} strokeWidth={2} />
            </div>
            <div className="admin-stat-value">{card.value.toLocaleString?.() ?? card.value}</div>
            <div className="admin-stat-label">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <motion.div
          className="admin-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="admin-card-header">
            <span className="admin-card-title">📈 Messages (Last 7 Days)</span>
          </div>
          <div className="admin-card-body">
            <BarChart data={stats.messagesLast7Days} color="var(--primary)" label="count" />
          </div>
        </motion.div>

        <motion.div
          className="admin-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="admin-card-header">
            <span className="admin-card-title">👤 New Signups (Last 7 Days)</span>
          </div>
          <div className="admin-card-body">
            <BarChart data={stats.signupsLast7Days} color="#10B981" label="count" />
          </div>
        </motion.div>
      </div>

      {/* Language Distribution + Recent Signups */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
        <motion.div
          className="admin-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="admin-card-header">
            <span className="admin-card-title">🌍 Language Distribution</span>
          </div>
          <div className="admin-card-body">
            <DonutChart data={stats.languageDist || []} />
          </div>
        </motion.div>

        <motion.div
          className="admin-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="admin-card-header">
            <span className="admin-card-title">🆕 Recent Signups</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentSignups || []).map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--primary)' }}>
                          {u.profilePic
                            ? <>
                                <img src={u.profilePic.startsWith('http') || u.profilePic.startsWith('data:') ? u.profilePic : `http://localhost:5000${u.profilePic}`} alt={u.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'inline'; }} />
                                <span style={{ display: 'none' }}>{(u.name?.[0] || '?').toUpperCase()}</span>
                              </>
                            : (u.name?.[0] || '?').toUpperCase()
                          }
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {u.name}
                            {u.role === 'admin' && <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>Admin</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{u.identifier}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${u.onlineStatus === 'online' ? 'online' : 'offline'}`}>
                        {u.onlineStatus}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
