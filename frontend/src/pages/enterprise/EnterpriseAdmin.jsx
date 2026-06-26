import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import {
  Users, Activity, FileEdit, ShieldAlert, RefreshCw,
  CheckCircle, XCircle, Info, Clock, Search
} from 'lucide-react';
import api from '../../utils/api';

// ──────────────────────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon: Icon, loading }) => (
  <div className="bg-null-surface border border-null-border rounded p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className={`text-3xl font-mono font-bold ${color}`}>
          {loading ? <span className="animate-pulse text-null-muted">—</span> : value}
        </div>
        <div className="font-sans text-xs text-null-muted mt-1 uppercase tracking-wider">{label}</div>
      </div>
      <div className={`p-2 rounded border ${color.replace('text-', 'bg-').replace('null-', 'null-').replace('-signal', '-signal-dim/30').replace('-info', '-info/10').replace('-deny', '-deny-dim/30').replace('-warn', '-warn/10')} border-opacity-20`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────
// Role badge helper
// ──────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  if (role === 'Administrator') return <Badge status="active" className="!text-null-signal" />;
  if (role === 'Employee') return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-medium uppercase tracking-wider bg-null-info/10 text-null-info border border-null-info/20">
      Staff
    </span>
  );
  return <Badge status="pending" />;
};

// ──────────────────────────────────────────────────────────
// Section renderers
// ──────────────────────────────────────────────────────────
const UsersTable = ({ users, loading }) => (
  <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
          <th className="py-3 px-4">Full Name</th>
          <th className="py-3 px-4">Email</th>
          <th className="py-3 px-4">Role</th>
          <th className="py-3 px-4">Status</th>
          <th className="py-3 px-4">2FA</th>
          <th className="py-3 px-4 text-right">Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
        {loading ? (
          <tr><td colSpan={6} className="py-12 text-center font-mono text-xs text-null-muted animate-pulse">QUERYING DIRECTORY...</td></tr>
        ) : users.length === 0 ? (
          <tr><td colSpan={6} className="py-12 text-center font-sans text-xs text-null-muted">No users found.</td></tr>
        ) : users.map(u => (
          <tr key={u.user_id} className="hover:bg-null-surface/30 transition-colors">
            <td className="py-3 px-4 font-medium">{u.full_name}</td>
            <td className="py-3 px-4 font-mono text-xs text-null-muted">{u.email}</td>
            <td className="py-3 px-4"><RoleBadge role={u.role_name} /></td>
            <td className="py-3 px-4"><Badge status={u.status} /></td>
            <td className="py-3 px-4">{u.totp_enabled
              ? <CheckCircle className="w-3.5 h-3.5 text-null-signal" />
              : <XCircle className="w-3.5 h-3.5 text-null-deny" />}
            </td>
            <td className="py-3 px-4 text-right font-mono text-xs text-null-muted">
              {new Date(u.created_at).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TranscriptAuditTable = ({ logs, loading }) => {
  const transcriptLogs = logs.filter(l => (l.activity || '').toUpperCase().includes('TRANSCRIPT'));
  return (
    <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
            <th className="py-3 px-4">Timestamp</th>
            <th className="py-3 px-4">Staff Member</th>
            <th className="py-3 px-4">Action</th>
            <th className="py-3 px-4">IP Address</th>
            <th className="py-3 px-4 text-right">Logged</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
          {loading ? (
            <tr><td colSpan={5} className="py-12 text-center font-mono text-xs text-null-muted animate-pulse">QUERYING AUDIT DATABASE...</td></tr>
          ) : transcriptLogs.length === 0 ? (
            <tr><td colSpan={5} className="py-12 text-center font-sans text-xs text-null-muted">No transcript edits recorded yet.</td></tr>
          ) : transcriptLogs.map(log => (
            <tr key={log.log_id} className="hover:bg-null-surface/30 transition-colors border-l-2 border-null-signal">
              <td className="py-3 px-4 font-mono text-xs text-null-muted">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="py-3 px-4">
                <div className="font-medium">{log.user_name || '—'}</div>
                <div className="font-mono text-[10px] text-null-muted">{log.user_email}</div>
              </td>
              <td className="py-3 px-4 font-mono text-xs text-null-text max-w-xs truncate">{log.activity}</td>
              <td className="py-3 px-4 font-mono text-xs text-null-muted">{log.ip_address || '—'}</td>
              <td className="py-3 px-4 text-right">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider bg-null-signal-dim text-null-signal border border-null-signal/20">
                  LOGGED
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const FullAuditTable = ({ logs, loading }) => (
  <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
          <th className="py-3 px-4">User</th>
          <th className="py-3 px-4">Activity</th>
          <th className="py-3 px-4">IP</th>
          <th className="py-3 px-4 text-right">Timestamp</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
        {loading ? (
          <tr><td colSpan={4} className="py-12 text-center font-mono text-xs text-null-muted animate-pulse">QUERYING AUDIT DATABASE...</td></tr>
        ) : logs.slice(0,30).map(log => (
          <tr key={log.log_id} className="hover:bg-null-surface/30 transition-colors">
            <td className="py-3 px-4">
              <div className="font-medium text-sm">{log.user_name || 'System'}</div>
              <div className="font-mono text-[10px] text-null-muted">{log.user_email}</div>
            </td>
            <td className="py-3 px-4 font-mono text-xs">{log.activity}</td>
            <td className="py-3 px-4 font-mono text-xs text-null-muted">{log.ip_address || '—'}</td>
            <td className="py-3 px-4 text-right font-mono text-xs text-null-muted">
              {new Date(log.timestamp).toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SessionsTable = ({ sessions, loading }) => (
  <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
          <th className="py-3 px-4">User</th>
          <th className="py-3 px-4">Login Time</th>
          <th className="py-3 px-4">Expiry</th>
          <th className="py-3 px-4">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
        {loading ? (
          <tr><td colSpan={4} className="py-12 text-center font-mono text-xs text-null-muted animate-pulse">LOADING SESSIONS...</td></tr>
        ) : sessions.filter(s => s.status === 'active').length === 0 ? (
          <tr><td colSpan={4} className="py-12 text-center font-sans text-xs text-null-muted">No active sessions.</td></tr>
        ) : sessions.filter(s => s.status === 'active').map(s => (
          <tr key={s.session_id} className="hover:bg-null-surface/30 transition-colors">
            <td className="py-3 px-4">
              <div className="font-medium">{s.user_name}</div>
              <div className="font-mono text-[10px] text-null-muted">{s.user_email}</div>
            </td>
            <td className="py-3 px-4 font-mono text-xs text-null-muted">{new Date(s.login_time).toLocaleString()}</td>
            <td className="py-3 px-4 font-mono text-xs text-null-muted">{new Date(s.expiry_time).toLocaleString()}</td>
            <td className="py-3 px-4"><Badge status={s.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PoliciesTable = ({ policies, loading }) => (
  <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
          <th className="py-3 px-4">Resource</th>
          <th className="py-3 px-4">Role</th>
          <th className="py-3 px-4">Condition</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
        {loading ? (
          <tr><td colSpan={3} className="py-12 text-center font-mono text-xs text-null-muted animate-pulse">LOADING POLICIES...</td></tr>
        ) : policies.map(p => (
          <tr key={p.policy_id} className="hover:bg-null-surface/30 transition-colors">
            <td className="py-3 px-4 font-medium">{p.resource_name}</td>
            <td className="py-3 px-4"><RoleBadge role={p.role_name} /></td>
            <td className="py-3 px-4 font-mono text-xs text-null-muted">{p.access_condition}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ──────────────────────────────────────────────────────────
// Tab nav
// ──────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Staff & Students' },
  { key: 'transcripts', label: 'Transcript Audit' },
  { key: 'audit', label: 'Full Audit Trail' },
  { key: 'sessions', label: 'Active Sessions' },
  { key: 'policies', label: 'Policy Registry' },
];

// ──────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────
const EnterpriseAdmin = ({ section }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(section || 'overview');

  const [stats, setStats] = useState({ users: 0, sessions: 0, transcriptEdits: 0, failedAccess: 0 });
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, sessionsRes, auditRes, policiesRes] = await Promise.all([
        api.get('/users'),
        api.get('/sessions'),
        api.get('/enterprise/audit'),
        api.get('/policies'),
      ]);
      setUsers(usersRes.data);
      setSessions(sessionsRes.data);
      setAuditLogs(auditRes.data);
      setPolicies(policiesRes.data);
      setStats({
        users: usersRes.data.length,
        sessions: sessionsRes.data.filter(s => s.status === 'active').length,
        transcriptEdits: auditRes.data.filter(l => (l.activity || '').toUpperCase().includes('TRANSCRIPT_EDIT')).length,
        failedAccess: auditRes.data.filter(l => (l.activity || '').toUpperCase().includes('DENIED') || (l.activity || '').toUpperCase().includes('UNAUTHORIZED')).length,
      });
    } catch (err) {
      console.error('Failed to load admin data:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (section) setActiveTab(section); }, [section]);

  return (
    <Layout title="School System — Administrator">
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-mono text-base font-bold text-null-text tracking-widest">
              NEXUS ACADEMY <span className="text-null-muted text-xs">// ADMIN CONSOLE</span>
            </h2>
            <p className="font-sans text-xs text-null-muted mt-1">
              Full system oversight for{' '}
              <span className="font-mono text-null-signal">{user?.full_name}</span>
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-null-surface border border-null-border rounded text-xs font-mono text-null-muted hover:text-null-text transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Registered Users" value={stats.users} color="text-null-info" icon={Users} loading={loading} />
          <StatCard label="Active Sessions Now" value={stats.sessions} color="text-null-signal" icon={Activity} loading={loading} />
          <StatCard label="Transcript Edits" value={stats.transcriptEdits} color="text-null-warn" icon={FileEdit} loading={loading} />
          <StatCard label="Failed Access Attempts" value={stats.failedAccess} color="text-null-deny" icon={ShieldAlert} loading={loading} />
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 border-b border-null-border overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              id={`admin-tab-${t.key}`}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-null-signal text-null-signal'
                  : 'border-transparent text-null-muted hover:text-null-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-null-surface border border-null-border rounded p-5">
                <h3 className="font-sans text-sm font-semibold text-null-text mb-4">Recent System Events</h3>
                <FullAuditTable logs={auditLogs.slice(0, 10)} loading={loading} />
              </div>
            </div>
          )}
          {activeTab === 'users' && (
            <div className="bg-null-surface border border-null-border rounded p-5">
              <h3 className="font-sans text-sm font-semibold text-null-text mb-4">Staff & Student Directory</h3>
              <UsersTable users={users} loading={loading} />
            </div>
          )}
          {activeTab === 'transcripts' && (
            <div className="bg-null-surface border border-null-border rounded p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-sans text-sm font-semibold text-null-text">Transcript Audit Log</h3>
                  <p className="font-sans text-xs text-null-muted mt-0.5">
                    Every grade modification made by academic staff — who changed what, when, from which device.
                  </p>
                </div>
                <span className="font-mono text-xs text-null-warn bg-null-warn/10 px-2 py-1 rounded border border-null-warn/20">
                  {auditLogs.filter(l => (l.activity || '').toUpperCase().includes('TRANSCRIPT')).length} edits
                </span>
              </div>
              <TranscriptAuditTable logs={auditLogs} loading={loading} />
            </div>
          )}
          {activeTab === 'audit' && (
            <div className="bg-null-surface border border-null-border rounded p-5">
              <h3 className="font-sans text-sm font-semibold text-null-text mb-4">Full System Audit Trail</h3>
              <FullAuditTable logs={auditLogs} loading={loading} />
            </div>
          )}
          {activeTab === 'sessions' && (
            <div className="bg-null-surface border border-null-border rounded p-5">
              <h3 className="font-sans text-sm font-semibold text-null-text mb-4">Active Sessions Monitor</h3>
              <SessionsTable sessions={sessions} loading={loading} />
            </div>
          )}
          {activeTab === 'policies' && (
            <div className="bg-null-surface border border-null-border rounded p-5">
              <h3 className="font-sans text-sm font-semibold text-null-text mb-4">ZTNA Policy Registry</h3>
              <PoliciesTable policies={policies} loading={loading} />
            </div>
          )}
        </div>

        {/* Amber notice */}
        <div className="flex items-start gap-3 p-4 bg-null-warn/5 border border-null-warn/20 rounded">
          <div className="w-1.5 h-1.5 rounded-full bg-null-warn mt-1.5 flex-shrink-0 animate-pulse" />
          <p className="font-sans text-xs text-null-warn">
            All actions within this portal are recorded and monitored under Zero Trust policy.
            Unauthorized access attempts are logged and flagged.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default EnterpriseAdmin;
