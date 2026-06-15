import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import {
  Users, Monitor, ShieldAlert, Activity,
  TrendingUp, ChevronRight, RefreshCw, Clock,
  CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import api from '../utils/api';
import Badge from '../components/Badge';

const StatCard = ({ title, value, subtitle, icon: Icon, color, linkTo, loading }) => (
  <Link
    to={linkTo || '#'}
    className="block bg-null-surface border border-null-border rounded p-5 hover:border-null-signal/40 transition-all group"
  >
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs font-mono uppercase tracking-wider text-null-muted mb-2">{title}</div>
        {loading ? (
          <div className="h-8 w-16 bg-null-border/50 rounded animate-pulse" />
        ) : (
          <div className={`text-3xl font-mono font-bold ${color}`}>{value ?? '—'}</div>
        )}
        {subtitle && (
          <div className="text-xs font-sans text-null-muted mt-1">{subtitle}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className={`p-2 rounded ${color.replace('text-', 'bg-').replace('null-', 'null-')}/10 border border-current/10`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-null-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  </Link>
);

const getActivityIcon = (activity) => {
  const act = (activity || '').toUpperCase();
  if (act.includes('SUCCESS') || act.includes('GRANTED') || act.includes('TRUSTED') || act.includes('ENABLED'))
    return <CheckCircle className="w-3 h-3 text-null-signal flex-shrink-0" />;
  if (act.includes('FAIL') || act.includes('DENIED') || act.includes('REVOKED') || act.includes('BLOCKED'))
    return <XCircle className="w-3 h-3 text-null-deny flex-shrink-0" />;
  return <AlertTriangle className="w-3 h-3 text-null-warn flex-shrink-0" />;
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [usersRes, devicesRes, sessionsRes, logsRes] = await Promise.all([
        api.get('/users'),
        api.get('/devices'),
        api.get('/sessions'),
        api.get('/audit-logs'),
      ]);

      const users = usersRes.data;
      const devices = devicesRes.data;
      const sessions = sessionsRes.data;
      const logs = logsRes.data;

      // Count logins containing 'FAIL' or devices containing 'BLOCKED'/'REVOKED'/'UNRECOGNIZED'
      const failedLogins = logs.filter(l => 
        (l.activity || '').toUpperCase().includes('FAIL') ||
        (l.activity || '').toUpperCase().includes('BLOCKED') ||
        (l.activity || '').toUpperCase().includes('UNRECOGNIZED')
      ).length;

      setStats({
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        pendingDevices: devices.filter(d => d.trust_status === 'pending').length,
        trustedDevices: devices.filter(d => d.trust_status === 'trusted').length,
        revokedDevices: devices.filter(d => d.trust_status === 'revoked').length,
        activeSessions: sessions.filter(s => s.status === 'active').length,
        totalSessions: sessions.length,
        failedLogins
      });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load dashboard statistics.' });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchRecentLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/audit-logs');
      setRecentLogs(res.data.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch audit logs:', err.message);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentLogs();
  }, [fetchStats, fetchRecentLogs]);

  const refresh = () => {
    fetchStats();
    fetchRecentLogs();
  };

  return (
    <Layout title="Admin Dashboard">
      <div className="flex flex-col gap-6">

        {/* Header Banner */}
        <div className="flex items-center justify-between p-4 bg-null-signal-dim/10 border border-null-signal/20 rounded">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-null-signal" />
            <div>
              <div className="text-sm font-sans font-semibold text-null-text">Zero Trust Administrative Console</div>
              <div className="text-xs font-mono text-null-muted mt-0.5">
                Full system visibility and control. All actions are logged.
              </div>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loadingStats}
            className="flex items-center gap-1.5 text-xs font-mono text-null-muted hover:text-null-text transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers}
            subtitle={`${stats?.activeUsers ?? '—'} active`}
            icon={Users}
            color="text-null-info"
            linkTo="/admin/users"
            loading={loadingStats}
          />
          <StatCard
            title="Pending Trust"
            value={stats?.pendingDevices}
            subtitle="Devices awaiting approval"
            icon={AlertTriangle}
            color="text-null-warn"
            linkTo="/admin/devices"
            loading={loadingStats}
          />
          <StatCard
            title="Active Sessions"
            value={stats?.activeSessions}
            subtitle={`${stats?.totalSessions ?? '—'} total`}
            icon={Activity}
            color="text-null-signal"
            linkTo="/admin/sessions"
            loading={loadingStats}
          />
          <StatCard
            title="Failed Logins"
            value={stats?.failedLogins}
            subtitle="Recent access rejections"
            icon={ShieldAlert}
            color="text-null-deny"
            linkTo="/admin/audit-logs"
            loading={loadingStats}
          />
        </div>

        {/* Device Trust Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Device Trust Breakdown */}
          <Card title="Device Trust Status" subtitle="Overview of all registered hardware nodes">
            {loadingStats ? (
              <div className="space-y-3 mt-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-null-border/30 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-3">
                {[
                  { label: 'Trusted', value: stats?.trustedDevices ?? 0, total: (stats?.trustedDevices + stats?.pendingDevices + stats?.revokedDevices) || 1, status: 'trusted', color: 'bg-null-signal' },
                  { label: 'Pending', value: stats?.pendingDevices ?? 0, total: (stats?.trustedDevices + stats?.pendingDevices + stats?.revokedDevices) || 1, status: 'pending', color: 'bg-null-warn' },
                  { label: 'Revoked', value: stats?.revokedDevices ?? 0, total: (stats?.trustedDevices + stats?.pendingDevices + stats?.revokedDevices) || 1, status: 'revoked', color: 'bg-null-deny' },
                ].map(item => {
                  const pct = Math.round((item.value / item.total) * 100);
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Badge status={item.label} />
                          <span className="text-xs font-sans text-null-muted">{item.value} device{item.value !== 1 ? 's' : ''}</span>
                        </div>
                        <span className="font-mono text-xs text-null-muted">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-null-border rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <Link
                  to="/admin/devices"
                  className="mt-2 text-xs font-mono text-null-signal hover:underline flex items-center gap-1"
                >
                  Manage all devices <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </Card>

          {/* Recent Audit Events */}
          <Card
            title="Recent Security Events"
            subtitle="Latest audit trail entries"
            headerAction={
              <Link to="/admin/audit-logs" className="text-xs font-mono text-null-signal hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            }
          >
            {loadingLogs ? (
              <div className="space-y-2 mt-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-9 bg-null-border/30 rounded animate-pulse" />
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="text-center py-8 font-sans text-sm text-null-muted">No audit events recorded yet.</div>
            ) : (
              <div className="flex flex-col divide-y divide-null-border mt-2">
                {recentLogs.map(log => (
                  <div key={log.log_id} className="flex items-start gap-3 py-2.5">
                    <div className="mt-0.5">{getActivityIcon(log.activity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-null-text truncate">{log.activity}</div>
                      <div className="font-sans text-[10px] text-null-muted mt-0.5">
                        {log.user_name || 'Anonymous'} · {log.ip_address || '—'}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 text-[10px] font-mono text-null-muted">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'User Directory', icon: Users, path: '/admin/users', desc: 'Manage identities & roles' },
            { label: 'Device Registry', icon: Monitor, path: '/admin/devices', desc: 'Approve & revoke hardware trust' },
            { label: 'Sessions', icon: Activity, path: '/admin/sessions', desc: 'Enforce active token states' },
            { label: 'Access Policies', icon: ShieldAlert, path: '/admin/policies', desc: 'Configure RBAC rules' },
            { label: 'Audit Logs', icon: TrendingUp, path: '/admin/audit-logs', desc: 'Full security event trail' },
          ].map(item => (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col gap-2 p-4 bg-null-surface border border-null-border rounded hover:border-null-signal/40 hover:bg-null-surface-raised/30 transition-all group"
            >
              <item.icon className="w-4 h-4 text-null-muted group-hover:text-null-signal transition-colors" />
              <div className="text-sm font-sans font-semibold text-null-text">{item.label}</div>
              <div className="text-[11px] font-sans text-null-muted">{item.desc}</div>
            </Link>
          ))}
        </div>

      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </Layout>
  );
};

export default AdminDashboard;
