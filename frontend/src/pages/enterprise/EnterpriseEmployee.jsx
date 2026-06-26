import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import { Search, Edit3, X, CheckCircle2, RefreshCw, Clock, Monitor } from 'lucide-react';
import api from '../../utils/api';

const GRADES = ['A', 'B', 'C', 'D', 'F'];

// ──────────────────────────────────────────────────────────
// Grade Edit Modal
// ──────────────────────────────────────────────────────────
const EditModal = ({ student, onClose, onSaved }) => {
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const courses = Array.isArray(student.courses)
    ? student.courses
    : JSON.parse(student.courses || '[]');

  const handleSave = async () => {
    const changedCourses = Object.entries(edits);
    if (changedCourses.length === 0) { onClose(); return; }
    setSaving(true);
    try {
      for (const [courseCode, { oldGrade, newGrade }] of changedCourses) {
        const course = courses.find(c => c.code === courseCode);
        await api.post('/enterprise/transcript/edit', {
          studentId: student.student_id,
          studentName: student.student_name,
          courseCode,
          courseName: course?.name || courseCode,
          oldGrade,
          newGrade,
        });
      }
      setToast({ type: 'success', message: 'Grades saved and logged to audit trail.' });
      setTimeout(() => { onSaved(); onClose(); }, 1500);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-null-bg/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-null-surface border border-null-border rounded shadow-xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-null-border">
          <div>
            <h3 className="font-sans text-sm font-semibold text-null-text">Edit Transcript</h3>
            <p className="font-mono text-[10px] text-null-muted mt-0.5">
              {student.student_name} — {student.student_id}
            </p>
          </div>
          <button onClick={onClose} className="text-null-muted hover:text-null-deny transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Course rows */}
        <div className="p-5 flex flex-col gap-3">
          {courses.map(c => {
            const currentGrade = edits[c.code]?.newGrade || c.grade;
            const changed = edits[c.code] && edits[c.code].newGrade !== c.grade;
            return (
              <div key={c.code} className={`flex items-center gap-3 p-3 rounded border transition-colors ${changed ? 'border-null-warn/40 bg-null-warn/5' : 'border-null-border bg-null-bg'}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-null-muted">{c.code}</div>
                  <div className="font-sans text-sm text-null-text">{c.name}</div>
                  <div className="font-mono text-[10px] text-null-muted mt-0.5">{c.credits} credits</div>
                </div>
                <select
                  value={currentGrade}
                  onChange={e => {
                    const newGrade = e.target.value;
                    if (newGrade !== c.grade) {
                      setEdits(prev => ({ ...prev, [c.code]: { oldGrade: c.grade, newGrade } }));
                    } else {
                      setEdits(prev => { const n = { ...prev }; delete n[c.code]; return n; });
                    }
                  }}
                  className="bg-null-surface border border-null-border rounded px-3 py-1.5 text-sm font-mono text-null-text focus:outline-none focus:border-null-signal transition"
                >
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {changed && (
                  <span className="text-[10px] font-mono text-null-warn whitespace-nowrap">
                    {edits[c.code].oldGrade} → {edits[c.code].newGrade}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Toast inside modal */}
        {toast && (
          <div className={`mx-5 mb-4 p-3 rounded border text-xs font-sans ${
            toast.type === 'success'
              ? 'bg-null-signal-dim/20 border-null-signal/20 text-null-signal'
              : 'bg-null-deny-dim/20 border-null-deny/20 text-null-deny'
          }`}>
            {toast.message}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-null-border">
          <p className="font-sans text-[11px] text-null-muted">
            {Object.keys(edits).length} change{Object.keys(edits).length !== 1 ? 's' : ''} pending — all saves are logged
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-mono text-null-muted border border-null-border rounded hover:text-null-text transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-mono bg-null-signal text-null-bg rounded hover:bg-null-signal/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────
const EnterpriseEmployee = ({ section }) => {
  const { user, token, deviceInfo } = useAuth();
  const [activeTab, setActiveTab] = useState(section || 'transcripts');
  const [transcripts, setTranscripts] = useState([]);
  const [myLogs, setMyLogs] = useState([]);
  const [myDevices, setMyDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null);

  // Session countdown
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const getExp = () => {
      try { const p = JSON.parse(atob(token.split('.')[1])); return p.exp ? p.exp * 1000 : null; }
      catch { return null; }
    };
    const exp = getExp();
    if (!exp) { setTimeLeft('N/A'); return; }
    const upd = () => {
      const d = exp - Date.now();
      if (d <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    upd();
    const iv = setInterval(upd, 1000);
    return () => clearInterval(iv);
  }, [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, lRes, dRes] = await Promise.all([
        api.get('/enterprise/transcripts'),
        api.get('/enterprise/my-audit-logs'),
        api.get('/devices'),
      ]);
      setTranscripts(tRes.data);
      setMyLogs(lRes.data);
      setMyDevices(dRes.data);
    } catch (err) {
      console.error('Failed to load staff data:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (section) setActiveTab(section); }, [section]);

  const fpId = deviceInfo?.fingerprint
    ? `${deviceInfo.fingerprint.substring(0, 4)}...${deviceInfo.fingerprint.slice(-4)}`
    : 'N/A';

  const filtered = transcripts.filter(t =>
    t.student_name.toLowerCase().includes(search.toLowerCase()) ||
    t.student_id.toLowerCase().includes(search.toLowerCase()) ||
    t.programme.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Staff Portal — Transcript Manager">
      {editTarget && (
        <EditModal
          student={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={fetchData}
        />
      )}

      <div className="flex flex-col gap-6">

        {/* Welcome panel */}
        <div className="bg-null-surface border border-null-border rounded p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-sans text-base font-semibold text-null-text">
                Welcome, {user?.full_name} — Academic Staff Portal
              </h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-null-muted" />
                  <span className="font-mono text-xs text-null-muted">Session:</span>
                  <span className="font-mono text-xs text-null-signal">{timeLeft}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-3 h-3 text-null-muted" />
                  <span className="font-mono text-xs text-null-muted">FP: {fpId}</span>
                </div>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-null-bg border border-null-border rounded text-xs font-mono text-null-muted hover:text-null-text transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="mt-3 p-3 bg-null-warn/5 border border-null-warn/20 rounded">
            <p className="font-sans text-xs text-null-warn">
              All transcript modifications you make are recorded in the ZTNA audit log and are reviewable by the Administrator.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-null-border">
          {[
            { key: 'transcripts', label: 'Transcript Manager' },
            { key: 'activity', label: 'My Activity Log' },
            { key: 'devices', label: 'My Trusted Devices' },
          ].map(t => (
            <button
              key={t.key}
              id={`staff-tab-${t.key}`}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-null-signal text-null-signal'
                  : 'border-transparent text-null-muted hover:text-null-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Transcripts */}
        {activeTab === 'transcripts' && (
          <div className="bg-null-surface border border-null-border rounded p-5 flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-null-muted" />
              <input
                type="text"
                placeholder="Search by name, ID, or programme..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-null-bg border border-null-border rounded pl-9 pr-3 py-2 text-sm font-sans text-null-text placeholder:text-null-muted/50 focus:outline-none focus:border-null-signal transition"
              />
            </div>

            <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Programme</th>
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4">Courses</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
                  {loading ? (
                    <tr><td colSpan={5} className="py-12 text-center font-mono text-xs text-null-muted animate-pulse">LOADING STUDENT RECORDS...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center font-sans text-xs text-null-muted">No student records match your search.</td></tr>
                  ) : filtered.map(t => {
                    const courses = Array.isArray(t.courses) ? t.courses : JSON.parse(t.courses || '[]');
                    return (
                      <tr key={t.student_id} className="hover:bg-null-surface/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium">{t.student_name}</div>
                          <div className="font-mono text-[10px] text-null-muted">{t.student_id}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-null-muted">{t.programme}</td>
                        <td className="py-3 px-4 font-mono text-xs text-null-muted">{t.academic_year}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {courses.map(c => (
                              <span key={c.code} className="font-mono text-[10px] px-1.5 py-0.5 bg-null-surface border border-null-border rounded">
                                {c.code}: <span className="text-null-signal">{c.grade}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            id={`edit-btn-${t.student_id}`}
                            onClick={() => setEditTarget(t)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-null-surface border border-null-border rounded text-null-muted hover:border-null-signal/40 hover:text-null-signal transition-colors"
                          >
                            <Edit3 className="w-3 h-3" /> Edit Transcript
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Activity Log */}
        {activeTab === 'activity' && (
          <div className="bg-null-surface border border-null-border rounded p-5">
            <h3 className="font-sans text-sm font-semibold text-null-text mb-4">My Recent Activity</h3>
            {loading ? (
              <div className="text-center py-12 font-mono text-xs text-null-muted animate-pulse">LOADING...</div>
            ) : myLogs.length === 0 ? (
              <div className="text-center py-12 font-sans text-xs text-null-muted">No activity recorded yet.</div>
            ) : (
              <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4 text-right">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
                    {myLogs.map(l => (
                      <tr key={l.log_id} className="hover:bg-null-surface/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-null-muted">{new Date(l.timestamp).toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono text-xs">{l.activity}</td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-null-muted">{l.ip_address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: My Devices */}
        {activeTab === 'devices' && (
          <div className="bg-null-surface border border-null-border rounded p-5">
            <h3 className="font-sans text-sm font-semibold text-null-text mb-1">My Trusted Devices</h3>
            <p className="font-sans text-xs text-null-muted mb-4">
              ZTNA verified your current device before granting access.
            </p>
            {loading ? (
              <div className="text-center py-12 font-mono text-xs text-null-muted animate-pulse">LOADING...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {myDevices.length === 0 ? (
                  <p className="text-center py-8 font-sans text-xs text-null-muted">No devices registered.</p>
                ) : myDevices.map(d => (
                  <div key={d.device_id} className="flex items-center gap-4 p-4 bg-null-bg border border-null-border rounded">
                    <Monitor className="w-4 h-4 text-null-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-sm font-medium text-null-text">{d.device_name || 'Unnamed Device'}</div>
                      <div className="font-mono text-[10px] text-null-muted mt-0.5 truncate">{d.device_fingerprint}</div>
                    </div>
                    <Badge status={d.trust_status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

export default EnterpriseEmployee;
