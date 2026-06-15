import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { Search, RefreshCw, ShieldCheck, UserX, Trash2, Edit2, X, Check } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ role_id: '', status: '' });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/roles'),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch user directory.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role_name || '').toLowerCase().includes(q)
    );
  });

  const startEdit = (user) => {
    setEditingId(user.user_id);
    setEditForm({ role_id: String(user.role_id), status: user.status });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ role_id: '', status: '' });
  };

  const handleSaveEdit = async (userId) => {
    setSaving(true);
    try {
      await api.patch(`/users/${userId}`, {
        role_id: parseInt(editForm.role_id),
        status: editForm.status,
      });
      setToast({ type: 'success', message: 'User identity record updated successfully.' });
      cancelEdit();
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update user.';
      setToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (userId === currentUser?.user_id) {
      setToast({ type: 'error', message: 'You cannot delete your own account.' });
      return;
    }
    if (!window.confirm(`Permanently delete user "${userName}"? This cannot be undone.`)) return;

    try {
      await api.delete(`/users/${userId}`);
      setToast({ type: 'success', message: `User "${userName}" has been deleted.` });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to delete user.';
      setToast({ type: 'error', message: msg });
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    if (user.user_id === currentUser?.user_id) {
      setToast({ type: 'error', message: 'You cannot disable your own account.' });
      return;
    }
    try {
      await api.patch(`/users/${user.user_id}`, { status: newStatus });
      setToast({ type: 'success', message: `User "${user.full_name}" ${newStatus === 'disabled' ? 'disabled' : 'reactivated'}.` });
      fetchUsers();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update user status.' });
    }
  };

  return (
    <Layout title="User Directory">
      <div className="flex flex-col gap-6">

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: users.length, color: 'text-null-info' },
            { label: 'Active', value: users.filter(u => u.status === 'active').length, color: 'text-null-signal' },
            { label: 'Disabled', value: users.filter(u => u.status === 'disabled').length, color: 'text-null-deny' },
            { label: '2FA Enrolled', value: users.filter(u => u.totp_enabled).length, color: 'text-null-warn' },
          ].map(stat => (
            <div key={stat.label} className="bg-null-surface border border-null-border rounded p-4">
              <div className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs font-sans text-null-muted mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        <Card
          title="Identity Registry"
          subtitle="All enrolled user accounts and role assignments"
          headerAction={
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="text-null-muted hover:text-null-text transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          }
        >
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-null-muted" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-null-bg border border-null-border rounded pl-8 pr-3 py-2 text-sm font-sans text-null-text placeholder:text-null-muted/50 focus:outline-none focus:border-null-signal focus:ring-2 focus:ring-null-signal/10 transition"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 font-mono text-xs text-null-muted animate-pulse">
              LOADING IDENTITY REGISTRY...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-sans text-sm text-null-muted">No users match the search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
                    <th className="py-3 px-4 font-sans font-semibold">Identity</th>
                    <th className="py-3 px-4 font-sans font-semibold">Role</th>
                    <th className="py-3 px-4 font-sans font-semibold">Status</th>
                    <th className="py-3 px-4 font-sans font-semibold">2FA</th>
                    <th className="py-3 px-4 font-sans font-semibold">Enrolled</th>
                    <th className="py-3 px-4 font-sans font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
                  {filteredUsers.map((u) => {
                    const isEditing = editingId === u.user_id;
                    const isSelf = u.user_id === currentUser?.user_id;

                    return (
                      <tr key={u.user_id} className={`hover:bg-null-surface/30 transition-colors ${isSelf ? 'bg-null-signal-dim/5' : ''}`}>

                        {/* Identity */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-null-text flex items-center gap-2">
                            {u.full_name}
                            {isSelf && (
                              <span className="font-mono text-[9px] uppercase tracking-wider bg-null-signal-dim text-null-signal px-1.5 py-0.5 rounded-full border border-null-signal/15">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-null-muted mt-0.5">{u.email}</div>
                        </td>

                        {/* Role — editable */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <select
                              value={editForm.role_id}
                              onChange={e => setEditForm(f => ({ ...f, role_id: e.target.value }))}
                              disabled={isSelf}
                              className="bg-null-surface border border-null-signal/50 rounded px-2 py-1 text-xs font-mono text-null-text focus:outline-none focus:border-null-signal transition appearance-none"
                            >
                              {roles.map(r => (
                                <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge status={u.role_name} />
                          )}
                        </td>

                        {/* Status — editable */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <select
                              value={editForm.status}
                              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                              disabled={isSelf}
                              className="bg-null-surface border border-null-signal/50 rounded px-2 py-1 text-xs font-mono text-null-text focus:outline-none focus:border-null-signal transition appearance-none"
                            >
                              <option value="active">Active</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          ) : (
                            <Badge status={u.status} />
                          )}
                        </td>

                        {/* 2FA */}
                        <td className="py-3 px-4">
                          <Badge status={u.totp_enabled ? 'enabled' : 'pending'} />
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 font-mono text-xs text-null-muted">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="primary"
                                className="py-1 px-2.5 text-xs flex items-center gap-1 bg-null-signal text-null-bg hover:bg-null-signal/90"
                                onClick={() => handleSaveEdit(u.user_id)}
                                disabled={saving}
                              >
                                <Check className="w-3 h-3" />
                                {saving ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="ghost"
                                className="py-1 px-2 text-xs text-null-muted hover:text-null-text"
                                onClick={cancelEdit}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {/* Edit */}
                              <Button
                                variant="ghost"
                                className="py-1 px-2 text-xs text-null-muted hover:text-null-info hover:bg-null-info/5 flex items-center gap-1 rounded transition-colors"
                                onClick={() => startEdit(u)}
                                title="Edit Role / Status"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>

                              {/* Disable / Enable */}
                              {!isSelf && (
                                <Button
                                  variant="ghost"
                                  className={`py-1 px-2 text-xs rounded flex items-center gap-1 transition-colors ${
                                    u.status === 'active'
                                      ? 'text-null-warn hover:bg-null-warn/10'
                                      : 'text-null-signal hover:bg-null-signal/10'
                                  }`}
                                  onClick={() => handleToggleStatus(u)}
                                  title={u.status === 'active' ? 'Disable Account' : 'Enable Account'}
                                >
                                  {u.status === 'active' ? (
                                    <UserX className="w-3.5 h-3.5" />
                                  ) : (
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              )}

                              {/* Delete */}
                              {!isSelf && (
                                <Button
                                  variant="ghost"
                                  className="py-1 px-2 text-null-muted hover:text-null-deny hover:bg-null-deny-dim/10 rounded transition-colors"
                                  onClick={() => handleDeleteUser(u.user_id, u.full_name)}
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  );
};

export default AdminUsers;
