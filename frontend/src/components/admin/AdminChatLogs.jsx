// AdminChatLogs.jsx — View & moderate all chat messages
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, MessageSquare, Image, Mic, Video, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { adminAPI } from '../../api/client';

const MEDIA_ICONS = {
  text: MessageSquare,
  image: Image,
  audio: Mic,
  video: Video,
  sticker: '🎉',
};

const MEDIA_COLORS = {
  text: '#6366F1',
  image: '#10B981',
  audio: '#F59E0B',
  video: '#EF4444',
  document: '#3B82F6',
  sticker: '#EC4899',
};

function ConfirmModal({ message, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <motion.div className="admin-modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">Delete Message</span>
          <button className="admin-btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-modal-body">
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="admin-btn-danger" onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); onClose(); }} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ChatContextModal({ chatId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getChatContext(chatId).then(data => {
      setMessages(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [chatId]);

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <motion.div className="admin-modal" style={{ maxWidth: 600, width: '100%', height: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}>
        <div className="admin-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <span className="admin-modal-title">Chat Context</span>
          <button className="admin-btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" /></div>
          ) : messages.length === 0 ? (
            <div className="admin-empty"><p>No messages found in this chat.</p></div>
          ) : (
            messages.map(msg => {
              const isReported = msg.isReported;
              return (
                <div key={msg._id} style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: isReported ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-hover)',
                  border: isReported ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-light)',
                  alignSelf: 'flex-start',
                  maxWidth: '85%'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    {msg.senderId?.name || 'Unknown'} • {new Date(msg.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {msg.deleted || msg.deletedForEveryone ? (
                      <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Message deleted</span>
                    ) : msg.mediaType && msg.mediaType !== 'text' ? (
                      `[${msg.mediaType.toUpperCase()} MEDIA]`
                    ) : (
                      msg.originalText || msg.text || '—'
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminChatLogs() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [contextChatId, setContextChatId] = useState(null);
  const LIMIT = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getChatLogs({
        search: search.trim() || undefined,
        mediaType: mediaFilter !== 'all' ? mediaFilter : undefined,
        page,
        limit: LIMIT
      });
      setMessages(data.messages);
      setTotalPages(data.pages);
      setTotalCount(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, mediaFilter, page]);

  useEffect(() => { fetchLogs(); }, [search, mediaFilter, page]);

  const handleDelete = async (id) => {
    await adminAPI.deleteMessage(id);
    setMessages(m => m.filter(msg => msg._id !== id));
    setTotalCount(c => c - 1);
  };

  const getTypeIcon = (type) => {
    const Icon = MEDIA_ICONS[type];
    if (!Icon) return <MessageSquare size={14} />;
    if (typeof Icon === 'string') return <span>{Icon}</span>;
    return <Icon size={14} />;
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reported Messages</h1>
          <p className="admin-page-subtitle">{totalCount.toLocaleString()} flagged messages · Review and moderate reported content</p>
        </div>
        <button className="admin-btn-primary" onClick={fetchLogs}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-toolbar">
            <div className="admin-search-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search message content…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select
              className="admin-filter-select"
              value={mediaFilter}
              onChange={e => { setMediaFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Types</option>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="sticker">Sticker</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="admin-empty">
            <MessageSquare size={40} strokeWidth={1.2} />
            <p>No messages found</p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Reported Message</th>
                    <th>Reporters & Reasons</th>
                    <th>Chat Info</th>
                    <th>Reported At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(msg => (
                    <motion.tr key={msg._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-avatar" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--primary)' }}>
                            {msg.senderId?.profilePic
                              ? <>
                                  <img src={msg.senderId.profilePic.startsWith('http') || msg.senderId.profilePic.startsWith('data:') ? msg.senderId.profilePic : `http://localhost:5000${msg.senderId.profilePic}`} alt="" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'inline'; }} />
                                  <span style={{ display: 'none' }}>{(msg.senderId?.name?.[0] || '?').toUpperCase()}</span>
                                </>
                              : (msg.senderId?.name?.[0] || '?').toUpperCase()
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{msg.senderId?.name || 'Deleted User'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{msg.senderId?.identifier || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ maxWidth: 240 }}>
                        {msg.deleted || msg.deletedForEveryone ? (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                            🗑 Message deleted
                          </span>
                        ) : msg.mediaType && msg.mediaType !== 'text' ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                            {msg.mediaUrl ? (
                              msg.mediaType === 'image'
                                ? <img src={`http://localhost:5000${msg.mediaUrl}`} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                                : <span>📎 {msg.mediaType} file</span>
                            ) : '—'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {msg.originalText || msg.text || '—'}
                          </span>
                        )}
                      </td>
                      <td style={{ minWidth: 200 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {msg.reports && msg.reports.length > 0 ? msg.reports.map((r, i) => (
                            <div key={i} style={{ fontSize: '12px', background: 'var(--bg-hover)', padding: '8px', borderRadius: '6px', borderLeft: '3px solid #EF4444' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{r.reportedBy?.name || 'Unknown User'}</strong>
                              <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>"{r.reason || 'No reason provided'}"</div>
                            </div>
                          )) : <span className="admin-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>Custom Report</span>}
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {msg.chatId?.isGroup ? (
                          <span>👥 {msg.chatId.chatName || 'Group'}</span>
                        ) : (
                          <span>💬 Private Match</span>
                        )}
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(msg.reports?.[0]?.timestamp || msg.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            className="admin-btn-secondary"
                            title="Dismiss Report"
                            onClick={() => {
                              // If dismiss is implemented in future, hook it here. For now, remove locally or prompt
                              if (window.confirm("Dismiss this report?")) {
                                setMessages(m => m.filter(x => x._id !== msg._id));
                                setTotalCount(c => c - 1);
                              }
                            }}
                          >
                            Dismiss
                          </button>
                          <button
                            className="admin-btn-danger"
                            title="Delete message"
                            onClick={() => setDeleteTarget(msg)}
                          >
                            Delete Message
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <span className="admin-page-info">
                Page {page} of {totalPages} · {totalCount.toLocaleString()} messages
              </span>
              <div className="admin-page-btns">
                <button className="admin-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={15} />
                </button>
                <button className="admin-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {deleteTarget && (
                <ConfirmModal
                  message={`Are you sure you want to delete this message? This action cannot be undone.`}
                  onConfirm={() => handleDelete(deleteTarget._id)}
                  onClose={() => setDeleteTarget(null)}
                />
              )}
              {contextChatId && (
                <ChatContextModal
                  chatId={contextChatId}
                  onClose={() => setContextChatId(null)}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
