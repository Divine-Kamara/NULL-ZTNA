import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { Search, RefreshCw, LogOut, Clock, ShieldAlert } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const AdminSessions = () => {
  const { user: currentUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [terminatingId, setTerminatingId] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/sessions');
      setSessions(res.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch active sessions.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleTerminate = async (sessionId) => {
    if (!window.confirm(`Force terminate session #${sessionId}? The user will be immediately logged out.`)) return;

    setTerminatingId(sessionId);
    try {
      await api.delete(`/sessions/${sessionId}`);
      setToast({ type: 'success', message: `Session #${sessionId} terminated successfully.` });
      fetchSessions();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to terminate session.';
      setToast({ type: 'error', message: msg });
    } finally {
      setTerminatingId(null);
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(s.session_id).includes(q) ||
      (s.user_name || '').toLowerCase().includes(q) ||
      (s.user_email || '').toLowerCase().includes(q) ||
      (s.status || '').toLowerCase().includes(q)
    );
  });

  const activeSessionsCount = sessions.filter(s => s.status === 'active').length;
  const terminatedSessionsCount = sessions.filter(s => s.status === 'terminated' || s.status === 'expired').length;

  return (
    <Layout title="Session Manager">
      <div className="flex flex-col gap-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-null-surface border border-null-border rounded p-4">
            <div className="text-2xl font-mono font-bold text-null-info">{sessions.length}</div>
            <div className="text-xs font-sans text-null-muted mt-1 uppercase tracking-wider">Total Allocated Tokens</div>
          </div>
          <div className="bg-null-surface border border-null-border rounded p-4">
            <div className="text-2xl font-mono font-bold text-null-signal">{activeSessionsCount}</div>
            <div className="text-xs font-sans text-null-muted mt-1 uppercase tracking-wider">Active Sessions</div>
          </div>
          <div className="bg-null-surface border border-null-border rounded p-4">
            <div className="text-2xl font-mono font-bold text-null-muted">{terminatedSessionsCount}</div>
            <div className="text-xs font-sans text-null-muted mt-1 uppercase tracking-wider">Expired / Revoked</div>
          </div>
        </div>

        <Card
          title="Session Token Registry"
          subtitle="Enforce session state termination and trace token lifecycles"
          headerAction={
            <button
              onClick={fetchSessions}
              disabled={loading}
              className="text-null-muted hover:text-null-text transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          }
        >
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-null-muted" />
            <input
              type="text"
              placeholder="Search sessions by ID, user, email or status..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-null-bg border border-null-border rounded pl-8 pr-3 py-2 text-sm font-sans text-null-text placeholder:text-null-muted/50 focus:outline-none focus:border-null-signal focus:ring-2 focus:ring-null-signal/10 transition"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 font-mono text-xs text-null-muted animate-pulse">
              RESOLVING SESSION REGISTRY...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-10 h-10 text-null-muted mx-auto mb-3" />
              <p className="font-sans text-sm text-null-muted">No sessions matched search filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
                    <th className="py-3 px-4 font-sans font-semibold w-16">ID</th>
                    <th className="py-3 px-4 font-sans font-semibold">User Identity</th>
                    <th className="py-3 px-4 font-sans font-semibold">Login Time</th>
                    <th className="py-3 px-4 font-sans font-semibold">Expiry</th>
                    <th className="py-3 px-4 font-sans font-semibold">Status</th>
                    <th className="py-3 px-4 font-sans font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-null-border font-mono text-xs text-null-text">
                  {filteredSessions.map(sess => {
                    const isSelf = sess.user_email === currentUser?.email;
                    return (
                      <tr key={sess.session_id} className="hover:bg-null-surface/30 transition-colors">
                        <td className="py-3.5 px-4 text-null-info font-mono">#{sess.session_id}</td>
                        <td className="py-3.5 px-4 font-sans">
                          <div>
                            <div className="font-semibold text-null-text">{sess.user_name}</div>
                            <div className="text-xs text-null-muted font-mono">{sess.user_email}</div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-null-muted">
                          {new Date(sess.login_time).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-null-muted">
                          {new Date(sess.expiry_time).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge status={sess.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {sess.status === 'active' ? (
                            <Button
                              variant="ghost"
                              onClick={() => handleTerminate(sess.session_id)}
                              disabled={terminatingId === sess.session_id}
                              icon={LogOut}
                              className="text-null-deny hover:bg-null-deny-dim/10 py-1 px-2.5 text-[11px]"
                            >
                              {isSelf ? 'Logout Self' : 'Terminate'}
                            </Button>
                          ) : (
                            <span className="text-[10px] font-sans text-null-muted uppercase tracking-wider">
                              Inactive
                            </span>
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

        {/* Security Warning Callout */}
        <div className="p-4 bg-null-deny-dim/15 border border-null-deny/20 rounded flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-null-deny flex-shrink-0 mt-0.5" />
          <div className="text-xs font-sans text-null-muted">
            <strong className="text-null-deny">Administrative Termination:</strong> Revoking or force terminating an active session immediately blacklists the JWT token on all subsequent protected requests. The target browser will automatically be redirected to the authentication portal on their next endpoint interaction.
          </div>
        </div>

      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </Layout>
  );
};

export default AdminSessions;
