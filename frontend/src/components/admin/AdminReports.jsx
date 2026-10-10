// AdminReports.jsx — Period-based reports with charts and CSV export
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, BarChart2, FileText, RefreshCw } from 'lucide-react';
import { adminAPI } from '../../api/client';

function BarChart({ data, valueKey, labelKey = '_id', color = '#7C3AED', maxHeight = 180 }) {
  if (!data || data.length === 0) return (
    <div className="admin-empty" style={{ padding: '40px' }}>
      <BarChart2 size={32} strokeWidth={1.2} />
      <p>No data for this period</p>
    </div>
  );
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className="admin-chart-container" style={{ height: maxHeight }}>
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const pct = Math.max((val / max) * 100, 2);
        const key = d[labelKey] || i;
        const short = typeof key === 'string' && key.length > 5 ? key.slice(5) : key;
        return (
          <div key={i} className="chart-bar-wrap">
            <div className="chart-bar" data-value={val}
              style={{ height: `${pct}%`, background: color, borderRadius: '6px 6px 0 0' }} />
            <div className="chart-bar-label">{short}</div>
          </div>
        );
      })}
    </div>
  );
}

function exportCSV(report) {
  if (!report) return;
  const rows = [
    ['Metric', 'Value'],
    ['Period From', new Date(report.period.from).toLocaleDateString()],
    ['Period To', new Date(report.period.to).toLocaleDateString()],
    ['New Users', report.summary.newUsers],
    ['Total Messages', report.summary.totalMessages],
    ['Media Messages', report.summary.mediaMessages],
    ['Banned in Period', report.summary.bannedInPeriod],
    [],
    ['Date', 'Messages'],
    ...(report.dailyMessages || []).map(d => [d._id, d.messages]),
    [],
    ['Date', 'Signups'],
    ...(report.dailySignups || []).map(d => [d._id, d.signups]),
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lingualink-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReports() {
  const today = new Date();
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const fmt = d => d.toISOString().slice(0, 10);

  const [from, setFrom] = useState(fmt(monthAgo));
  const [to, setTo] = useState(fmt(today));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getReports(from, to);
      setReport(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, []);

  const MEDIA_COLORS = {
    text: '#6366F1', image: '#10B981', audio: '#F59E0B',
    video: '#EF4444', document: '#3B82F6', sticker: '#EC4899', contact: '#8B5CF6'
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Generate Reports</h1>
          <p className="admin-page-subtitle">Analyze platform activity over a custom date range</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="admin-btn-secondary" onClick={() => exportCSV(report)} disabled={!report}>
            <Download size={14} />
            Export CSV
          </button>
          <button className="admin-btn-primary" onClick={fetchReport} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-header">
          <span className="admin-card-title">📅 Date Range</span>
        </div>
        <div className="admin-card-body">
          <div className="admin-report-controls">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>From</label>
              <input type="date" className="admin-date-input" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>To</label>
              <input type="date" className="admin-date-input" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['Last 7 days', 7], ['Last 30 days', 30], ['Last 3 months', 90]
              ].map(([label, days]) => (
                <button key={label} className="admin-btn-secondary"
                  style={{ padding: '7px 14px', fontSize: 12 }}
                  onClick={() => {
                    const t = new Date();
                    const f = new Date();
                    f.setDate(f.getDate() - days);
                    setFrom(fmt(f));
                    setTo(fmt(t));
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="admin-loading"><div className="admin-spinner" /></div>}

      {report && !loading && (
        <>
          {/* Summary Cards */}
          <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'New Users', value: report.summary.newUsers, color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
              { label: 'Total Messages', value: report.summary.totalMessages, color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
              { label: 'Media Shared', value: report.summary.mediaMessages, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
              { label: 'Users Banned', value: report.summary.bannedInPeriod, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
            ].map((s, i) => (
              <motion.div key={s.label} className="admin-stat-card"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <div className="admin-stat-icon" style={{ background: s.bg }}>
                  <FileText size={20} color={s.color} />
                </div>
                <div className="admin-stat-value">{(s.value || 0).toLocaleString()}</div>
                <div className="admin-stat-label">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <motion.div className="admin-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <div className="admin-card-header">
                <span className="admin-card-title">💬 Daily Messages</span>
              </div>
              <div className="admin-card-body">
                <BarChart data={report.dailyMessages} valueKey="messages" color="#7C3AED" />
              </div>
            </motion.div>

            <motion.div className="admin-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="admin-card-header">
                <span className="admin-card-title">👤 Daily Signups</span>
              </div>
              <div className="admin-card-body">
                <BarChart data={report.dailySignups} valueKey="signups" color="#10B981" />
              </div>
            </motion.div>
          </div>

          {/* Media Type Distribution */}
          <motion.div className="admin-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="admin-card-header">
              <span className="admin-card-title">📎 Media Type Breakdown</span>
            </div>
            <div className="admin-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                {(report.mediaTypeDist || []).map((mt, i) => {
                  const total = report.summary.totalMessages || 1;
                  const pct = ((mt.count / total) * 100).toFixed(1);
                  const color = MEDIA_COLORS[mt._id] || '#9CA3AF';
                  return (
                    <div key={mt._id} style={{
                      background: 'var(--bg-page)', borderRadius: 12, padding: '16px',
                      border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 8
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color, textTransform: 'capitalize' }}>{mt._id || 'unknown'}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
                        {mt.count.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
