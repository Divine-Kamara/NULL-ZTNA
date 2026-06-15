import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Toast from '../components/Toast';
import { Search, RefreshCw, Filter, AlertTriangle, CheckCircle, XCircle, Info, Clock } from 'lucide-react';
import api from '../utils/api';

const ACTIVITY_GROUPS = {
  'Login Events': ['LOGIN_SUCCESS', 'LOGIN_FAIL_PASSWORD', 'LOGIN_FAIL_UNKNOWN_USER', 'LOGIN_FAIL_USER_DISABLED', 'LOGOUT'],
  'TOTP Events': ['TOTP_SETUP_INITIATED', 'TOTP_ENABLED', 'TOTP_FAIL'],
  'Device Events': ['DEVICE_TRUSTED_BOOTSTRAP', 'DEVICE_UNRECOGNIZED', 'DEVICE_TRUSTED', 'DEVICE_REVOKED', 'DEVICE_PENDING', 'DEVICE_REGISTERED', 'DEVICE_DELETED', 'DEVICE_SHARING_BLOCKED'],
  'Access Events': ['ACCESS_GRANTED', 'ACCESS_DENIED_2FA_NOT_ENABLED', 'ACCESS_DENIED_NO_DEVICE', 'ACCESS_DENIED_POLICY_NOT_FOUND', 'ACCESS_DENIED_CONDITION_NOT_MET', 'ACCESS_DENIED_SESSION_EXPIRED'],
  'Admin Events': ['USER_REGISTERED', 'USER_MODIFIED', 'USER_DELETED', 'POLICY_CREATED', 'POLICY_UPDATED', 'POLICY_DELETED', 'SESSION_TERMINATED'],
};

const getActivityIcon = (activity) => {
  const act = (activity || '').toUpperCase();
  if (act.includes('SUCCESS') || act.includes('GRANTED') || act.includes('TRUSTED') || act.includes('ENABLED')) {
    return <CheckCircle className="w-3.5 h-3.5 text-null-signal" />;
  }
  if (act.includes('FAIL') || act.includes('DENIED') || act.includes('REVOKED') || act.includes('BLOCKED') || act.includes('DISABLED')) {
    return <XCircle className="w-3.5 h-3.5 text-null-deny" />;
  }
  if (act.includes('PENDING') || act.includes('UNRECOGNIZED') || act.includes('WARN')) {
    return <AlertTriangle className="w-3.5 h-3.5 text-null-warn" />;
  }
  return <Info className="w-3.5 h-3.5 text-null-info" />;
};

const getActivityBadgeStatus = (activity) => {
  const act = (activity || '').toUpperCase();
  if (act.includes('SUCCESS') || act.includes('GRANTED') || act.includes('TRUSTED') || act.includes('ENABLED')) return 'active';
  if (act.includes('FAIL') || act.includes('DENIED') || act.includes('REVOKED') || act.includes('BLOCKED') || act.includes('DISABLED')) return 'revoked';
  if (act.includes('PENDING') || act.includes('UNRECOGNIZED')) return 'pending';
  return 'info';
};

const PAGE_SIZE = 20;

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activityFilter) params.activity = activityFilter;
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch audit logs.' });
    } finally {
      setLoading(false);
    }
  }, [activityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side filtering for search & group
  useEffect(() => {
    let result = [...logs];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        (l.user_name || '').toLowerCase().includes(q) ||
        (l.user_email || '').toLowerCase().includes(q) ||
        (l.activity || '').toLowerCase().includes(q) ||
        (l.ip_address || '').toLowerCase().includes(q)
      );
    }

    if (groupFilter) {
      const groupActivities = ACTIVITY_GROUPS[groupFilter] || [];
      result = result.filter(l =>
        groupActivities.some(a => l.activity?.toUpperCase().startsWith(a))
      );
    }

    setFiltered(result);
    setPage(1);
  }, [logs, searchQuery, groupFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const clearFilters = () => {
    setSearchQuery('');
    setActivityFilter('');
    setGroupFilter('');
  };

  const hasFilters = searchQuery || activityFilter || groupFilter;

  return (
    <Layout title="System Audit Records">
      <div className="flex flex-col gap-6">

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: logs.length, color: 'text-null-info' },
            {
              label: 'Success Events',
              value: logs.filter(l => ['SUCCESS', 'GRANTED', 'TRUSTED', 'ENABLED'].some(k => l.activity?.toUpperCase().includes(k))).length,
              color: 'text-null-signal'
            },
            {
              label: 'Failure Events',
              value: logs.filter(l => ['FAIL', 'DENIED', 'REVOKED', 'BLOCKED', 'DISABLED'].some(k => l.activity?.toUpperCase().includes(k))).length,
              color: 'text-null-deny'
            },
            {
              label: 'Device Events',
              value: logs.filter(l => l.activity?.toUpperCase().includes('DEVICE')).length,
              color: 'text-null-warn'
            },
          ].map(stat => (
            <div key={stat.label} className="bg-null-surface border border-null-border rounded p-4">
              <div className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs font-sans text-null-muted mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters Card */}
        <Card
          title="Audit Trail"
          subtitle="All security-relevant events logged by the ZTNA pipeline"
          headerAction={
            <div className="flex items-center gap-2">
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-mono text-null-warn hover:text-null-text uppercase tracking-wider transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="text-null-muted hover:text-null-text transition-colors disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          }
        >
          {/* Filter Row */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-null-muted" />
              <input
                type="text"
                placeholder="Search by user, email, activity, or IP..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-null-bg border border-null-border rounded pl-8 pr-3 py-2 text-sm font-sans text-null-text placeholder:text-null-muted/50 focus:outline-none focus:border-null-signal focus:ring-2 focus:ring-null-signal/10 transition"
              />
            </div>

            {/* Group Filter */}
            <div className="relative flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-null-muted flex-shrink-0" />
              <select
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                className="bg-null-bg border border-null-border rounded px-3 py-2 text-sm font-sans text-null-text focus:outline-none focus:border-null-signal transition appearance-none pr-8"
              >
                <option value="">All Categories</option>
                {Object.keys(ACTIVITY_GROUPS).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          {hasFilters && (
            <div className="text-xs font-mono text-null-muted mb-3">
              Showing {filtered.length} of {logs.length} events
            </div>
          )}

          {/* Logs Table */}
          {loading ? (
            <div className="text-center py-12 font-mono text-xs text-null-muted animate-pulse">
              QUERYING AUDIT DATABASE...
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-sans text-sm text-null-muted">No audit records match the current filters.</p>
              <p className="font-mono text-[11px] text-null-muted/60 mt-1 uppercase tracking-wider">Adjust search parameters to expand results.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
                    <th className="py-3 px-4 font-sans font-semibold w-8">#</th>
                    <th className="py-3 px-4 font-sans font-semibold">User Identity</th>
                    <th className="py-3 px-4 font-sans font-semibold">Activity</th>
                    <th className="py-3 px-4 font-sans font-semibold">Status</th>
                    <th className="py-3 px-4 font-sans font-semibold">IP Address</th>
                    <th className="py-3 px-4 font-sans font-semibold text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
                  {paginated.map((log) => (
                    <tr key={log.log_id} className="hover:bg-null-surface/30 transition-colors">
                      {/* Log ID */}
                      <td className="py-3 px-4 font-mono text-xs text-null-muted">
                        {log.log_id}
                      </td>

                      {/* User Identity */}
                      <td className="py-3 px-4">
                        {log.user_name ? (
                          <div>
                            <div className="font-medium text-null-text">{log.user_name}</div>
                            <div className="text-xs font-mono text-null-muted mt-0.5">{log.user_email}</div>
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-null-muted/60 uppercase">System / Anonymous</span>
                        )}
                      </td>

                      {/* Activity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getActivityIcon(log.activity)}
                          <span className="font-mono text-xs text-null-text">{log.activity}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <Badge status={getActivityBadgeStatus(log.activity)} />
                      </td>

                      {/* IP */}
                      <td className="py-3 px-4 font-mono text-xs text-null-muted">
                        {log.ip_address || '—'}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-mono text-xs text-null-text">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                          <span className="font-mono text-[10px] text-null-muted flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="font-mono text-xs text-null-muted">
                Page {page} of {totalPages} &mdash; {filtered.length} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs font-mono bg-null-surface border border-null-border rounded text-null-text hover:border-null-signal/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, page - 2);
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-xs font-mono rounded border transition ${
                        p === page
                          ? 'bg-null-signal text-null-bg border-null-signal'
                          : 'bg-null-surface border-null-border text-null-text hover:border-null-signal/40'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-xs font-mono bg-null-surface border border-null-border rounded text-null-text hover:border-null-signal/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next →
                </button>
              </div>
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

export default AdminAuditLogs;
