// AdminUsers.jsx — Full user management: search, filter, ban, edit, delete, promote
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, UserX, UserCheck, Trash2, Edit3,
  ChevronLeft, ChevronRight, X, Save, Crown, RefreshCw, Eye
} from 'lucide-react';
import useStore from '../../store/useStore';
import { adminAPI } from '../../api/client';
import AdminUserProfile from './AdminUserProfile';

function EditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({ name: user.name, language: user.language, bio: user.bio || '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      await adminAPI.editUser(user._id, form);
      onSave();
    } catch (e) { setErr(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <motion.div className="admin-modal" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">Edit User</span>
          <button className="admin-btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-modal-body">
          {err && <div className="admin-alert error">{err}</div>}
          <div className="admin-form-field">
            <label>Display Name</label>
            <input className="admin-form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="admin-form-field">
            <label>Language Code (e.g. en, hi, fr)</label>
            <input className="admin-form-input" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} />
          </div>
          <div className="admin-form-field">
            <label>Bio</label>
            <textarea className="admin-form-input" rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="admin-btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onClose, danger }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <motion.div className="admin-modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">{title}</span>
          <button className="admin-btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-modal-body">
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={danger ? 'admin-btn-danger' : 'admin-btn-primary'}
            onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); onClose(); }}
            disabled={loading}
          >
            {loading ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminUsers() {
  const { toggleUserBan, deleteUser } = useStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [viewingUserId, setViewingUserId] = useState(null);
  const LIMIT = 15;

  const doFetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminAPI.getUsers({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        page,
        limit: LIMIT
      });
      setUsers(result.users || []);
      setTotalPages(result.pages || 1);
      setTotalCount(result.total || 0);
    } catch (e) {
      console.error('Failed to fetch users', e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, page]);

  useEffect(() => { doFetch(); }, [search, statusFilter, roleFilter, page]);

  const handleBan = async (user) => {
    setActionLoading(l => ({ ...l, [user._id]: true }));
    try {
      await adminAPI.toggleBan(user._id);
      setUsers(us => us.map(u => u._id === user._id ? { ...u, isBanned: !u.isBanned } : u));
    } finally {
      setActionLoading(l => ({ ...l, [user._id]: false }));
    }
  };

  const handleDelete = async (userId) => {
    await adminAPI.deleteUser(userId);
    setUsers(us => us.filter(u => u._id !== userId));
    setTotalCount(c => c - 1);
  };

  const handlePromote = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setActionLoading(l => ({ ...l, [user._id]: true }));
    try {
      await adminAPI.changeRole(user._id, newRole);
      doFetch();
    } finally {
      setActionLoading(l => ({ ...l, [user._id]: false }));
    }
  };


  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">User Management</h1>
          <p className="admin-page-subtitle">{totalCount} total users · Search, edit, block or remove accounts</p>
        </div>
        <button className="admin-btn-primary" onClick={doFetch}>
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
                placeholder="Search by name or email…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="admin-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="banned">Blocked</option>
              <option value="verified">Verified</option>
            </select>
            <select className="admin-filter-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {loading && users.length === 0 ? (
          <div className="admin-loading"><div className="admin-spinner" /></div>
        ) : users.length === 0 ? (
          <div className="admin-empty">
            <Search size={40} strokeWidth={1.2} />
            <p>No users found</p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Language</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last Seen</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <motion.tr key={u._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <td>
                        <div className="admin-user-cell">
                          <div
                            className="admin-avatar"
                            style={{
                              background: u.profilePic ? 'transparent' : 'rgba(124,58,237,0.1)',
                              color: 'var(--primary)'
                            }}
                          >
                            {u.profilePic
                              ? <>
                                  <img src={u.profilePic.startsWith('http') || u.profilePic.startsWith('data:') ? u.profilePic : `http://localhost:5000${u.profilePic}`} alt={u.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'inline'; }} />
                                  <span style={{ display: 'none' }}>{(u.name?.[0] || '?').toUpperCase()}</span>
                                </>
                              : (u.name?.[0] || '?').toUpperCase()
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>
                              {u.name}
                              {u.isBanned && (
                                <span className="admin-badge banned" style={{ marginLeft: 8, fontSize: '10px' }}>Blocked</span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{u.identifier}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="admin-badge user-role" style={{ textTransform: 'uppercase' }}>
                          {u.language || 'en'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.role === 'admin' ? 'admin-role' : 'user-role'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.onlineStatus === 'online' ? 'online' : 'offline'}`}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                          {u.onlineStatus}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {u.lastSeen ? new Date(u.lastSeen).toLocaleString() : '—'}
                      </td>
                      <td>
                        <div className="admin-actions">
                          {/* View Profile */}
                          <button
                            className="admin-btn-icon"
                            title="View Full Profile"
                            onClick={() => setViewingUserId(u._id)}
                            style={{ color: 'var(--ll-purple)' }}
                          >
                            <Eye size={15} />
                          </button>
                          {/* Edit */}
                          <button
                            className="admin-btn-icon edit"
                            title="Edit user"
                            onClick={() => setEditingUser(u)}
                            disabled={!!actionLoading[u._id]}
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Promote / Demote */}
                          <button
                            className={`admin-btn-icon ${u.role === 'admin' ? '' : 'promote'}`}
                            title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            onClick={() => setConfirmAction({
                              title: u.role === 'admin' ? 'Demote to User' : 'Promote to Admin',
                              message: u.role === 'admin'
                                ? `Remove admin privileges from ${u.name}?`
                                : `Grant admin privileges to ${u.name}? They will have full system access.`,
                              onConfirm: () => handlePromote(u),
                              danger: false
                            })}
                            disabled={!!actionLoading[u._id]}
                          >
                            <Crown size={15} />
                          </button>

                          {/* Block / Unblock — disabled for admins */}
                          {u.role !== 'admin' && (
                            <button
                              className="admin-btn-icon ban"
                              title={u.isBanned ? 'Unblock User' : 'Block User'}
                              onClick={() => setConfirmAction({
                                title: u.isBanned ? 'Unblock User' : 'Block User',
                                message: u.isBanned
                                  ? `Allow ${u.name} to access the platform again?`
                                  : `Block ${u.name}? They will be immediately logged out and denied access.`,
                                onConfirm: () => handleBan(u),
                                danger: !u.isBanned
                              })}
                              disabled={!!actionLoading[u._id]}
                            >
                              {u.isBanned ? <UserCheck size={15} /> : <UserX size={15} />}
                            </button>
                          )}

                          {/* Delete — disabled for admins */}
                          {u.role !== 'admin' && (
                            <button
                              className="admin-btn-icon delete"
                              title="Delete User"
                              onClick={() => setConfirmAction({
                                title: 'Delete User',
                                message: `Permanently delete ${u.name}? This action cannot be undone.`,
                                onConfirm: () => handleDelete(u._id),
                                danger: true
                              })}
                              disabled={!!actionLoading[u._id]}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <span className="admin-page-info">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalCount)} of {totalCount} users
              </span>
              <div className="admin-page-btns">
                <button className="admin-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, page - 2) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      className={`admin-page-btn ${pageNum === page ? 'current' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button className="admin-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingUser && (
          <EditModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSave={() => { setEditingUser(null); doFetch(); }}
          />
        )}
        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            onConfirm={confirmAction.onConfirm}
            onClose={() => setConfirmAction(null)}
            danger={confirmAction.danger}
          />
        )}
        {viewingUserId && (
          <AdminUserProfile
            userId={viewingUserId}
            onClose={() => setViewingUserId(null)}
            onUserUpdated={() => doFetch()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
