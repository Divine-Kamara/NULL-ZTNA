import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Toast from '../components/Toast';
import {
  Plus, Edit2, Trash2, X, Check,
  Search, RefreshCw, FileCheck, ShieldCheck, Info
} from 'lucide-react';
import api from '../utils/api';

const CONDITION_CHIPS = [
  'trusted_device',
  'active_session',
  '2fa_required',
  'trusted_device AND active_session',
  'trusted_device AND active_session AND 2fa_required',
  'active_session',
];

const EMPTY_FORM = { role_id: '', resource_name: '', access_condition: '' };

// ------ Policy Form Modal ------
const PolicyModal = ({ policy, roles, onSave, onClose, saving }) => {
  const [form, setForm] = useState(
    policy
      ? { role_id: String(policy.role_id), resource_name: policy.resource_name, access_condition: policy.access_condition }
      : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.role_id) e.role_id = 'Role is required';
    if (!form.resource_name.trim()) e.resource_name = 'Resource name is required';
    if (!form.access_condition.trim()) e.access_condition = 'Access condition is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ role_id: parseInt(form.role_id), resource_name: form.resource_name.trim(), access_condition: form.access_condition.trim() });
  };

  const appendChip = (chip) => {
    setForm(f => ({
      ...f,
      access_condition: f.access_condition ? `${f.access_condition} AND ${chip}` : chip
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-null-bg/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-null-surface-raised border border-null-border rounded-md shadow-2xl animate-slide-in">

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-null-border">
          <div>
            <h3 className="font-sans text-base font-semibold text-null-text">
              {policy ? 'Edit Policy' : 'New Access Policy'}
            </h3>
            <p className="font-mono text-xs text-null-muted mt-0.5 uppercase tracking-wider">
              {policy ? `Editing policy #${policy.policy_id}` : 'Define role → resource access rule'}
            </p>
          </div>
          <button onClick={onClose} className="text-null-muted hover:text-null-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-sans font-medium text-null-muted uppercase tracking-wider">
              Target Role <span className="text-null-deny">*</span>
            </label>
            <select
              value={form.role_id}
              onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
              className={`w-full bg-null-bg border rounded px-3 py-2.5 text-sm font-sans text-null-text focus:outline-none focus:ring-2 focus:ring-null-signal/20 transition appearance-none ${
                errors.role_id ? 'border-null-deny' : 'border-null-border focus:border-null-signal'
              }`}
            >
              <option value="">Select a role...</option>
              {roles.map(r => (
                <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
              ))}
            </select>
            {errors.role_id && <p className="text-xs text-null-deny font-sans">{errors.role_id}</p>}
          </div>

          {/* Resource Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-sans font-medium text-null-muted uppercase tracking-wider">
              Resource Name <span className="text-null-deny">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. HR Portal, Admin Console, File Server..."
              value={form.resource_name}
              onChange={e => setForm(f => ({ ...f, resource_name: e.target.value }))}
              className={`w-full bg-null-bg border rounded px-3 py-2.5 text-sm font-sans text-null-text placeholder:text-null-muted/50 focus:outline-none focus:ring-2 focus:ring-null-signal/20 transition ${
                errors.resource_name ? 'border-null-deny' : 'border-null-border focus:border-null-signal'
              }`}
            />
            {errors.resource_name && <p className="text-xs text-null-deny font-sans">{errors.resource_name}</p>}
          </div>

          {/* Access Condition */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-sans font-medium text-null-muted uppercase tracking-wider">
              Access Condition <span className="text-null-deny">*</span>
            </label>
            <textarea
              placeholder="e.g. trusted_device AND active_session"
              value={form.access_condition}
              onChange={e => setForm(f => ({ ...f, access_condition: e.target.value }))}
              rows={3}
              className={`w-full bg-null-bg border rounded px-3 py-2.5 text-sm font-mono text-null-text placeholder:text-null-muted/50 focus:outline-none focus:ring-2 focus:ring-null-signal/20 transition resize-none ${
                errors.access_condition ? 'border-null-deny' : 'border-null-border focus:border-null-signal'
              }`}
            />
            {errors.access_condition && <p className="text-xs text-null-deny font-sans">{errors.access_condition}</p>}

            {/* Condition Chips */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-null-muted uppercase tracking-wider">Quick-insert conditions:</span>
              <div className="flex flex-wrap gap-1.5">
                {CONDITION_CHIPS.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => appendChip(chip)}
                    className="px-2 py-0.5 text-[10px] font-mono bg-null-bg border border-null-border rounded-full text-null-muted hover:text-null-signal hover:border-null-signal/40 transition-colors uppercase tracking-wider"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-null-info/5 border border-null-info/20 rounded">
            <Info className="w-3.5 h-3.5 text-null-info flex-shrink-0 mt-0.5" />
            <p className="text-[11px] font-sans text-null-muted">
              The access condition is evaluated during the Zero Trust pipeline. Conditions like <span className="font-mono text-null-info">trusted_device</span> and <span className="font-mono text-null-info">active_session</span> are enforced server-side on every access request.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              variant="primary"
              className="flex-1 py-2.5 justify-center flex items-center gap-2"
              disabled={saving}
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : policy ? 'Save Changes' : 'Create Policy'}
            </Button>
            <Button type="button" variant="ghost" className="py-2.5 px-4" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ------ Main Page ------
const AdminPolicies = () => {
  const [policies, setPolicies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [policiesRes, rolesRes] = await Promise.all([
        api.get('/policies'),
        api.get('/roles'),
      ]);
      setPolicies(policiesRes.data);
      setRoles(rolesRes.data);
    } catch {
      setToast({ type: 'error', message: 'Failed to load policies.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredPolicies = policies.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.resource_name || '').toLowerCase().includes(q) ||
      (p.role_name || '').toLowerCase().includes(q) ||
      (p.access_condition || '').toLowerCase().includes(q)
    );
  });

  const openCreate = () => { setEditingPolicy(null); setModalOpen(true); };
  const openEdit = (policy) => { setEditingPolicy(policy); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingPolicy(null); };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editingPolicy) {
        await api.put(`/policies/${editingPolicy.policy_id}`, formData);
        setToast({ type: 'success', message: 'Policy updated successfully.' });
      } else {
        await api.post('/policies', formData);
        setToast({ type: 'success', message: 'Policy created successfully.' });
      }
      closeModal();
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save policy.';
      setToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policy) => {
    if (!window.confirm(`Delete policy "${policy.resource_name}" for role "${policy.role_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/policies/${policy.policy_id}`);
      setToast({ type: 'success', message: `Policy "${policy.resource_name}" deleted.` });
      fetchData();
    } catch {
      setToast({ type: 'error', message: 'Failed to delete policy.' });
    }
  };

  // Stats: count per role
  const roleStats = roles.map(r => ({
    ...r,
    count: policies.filter(p => p.role_id === r.role_id).length
  }));

  return (
    <Layout title="Access Policy Editor">
      <div className="flex flex-col gap-6">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-null-surface border border-null-border rounded p-4">
            <div className="text-2xl font-mono font-bold text-null-info">{policies.length}</div>
            <div className="text-xs font-sans text-null-muted mt-1 uppercase tracking-wider">Total Policies</div>
          </div>
          {roleStats.map(r => (
            <div key={r.role_id} className="bg-null-surface border border-null-border rounded p-4">
              <div className="text-2xl font-mono font-bold text-null-signal">{r.count}</div>
              <div className="text-xs font-sans text-null-muted mt-1 uppercase tracking-wider">{r.role_name} Rules</div>
            </div>
          ))}
        </div>

        <Card
          title="Hardware Verification Registry"
          subtitle="Define which roles can access which resources under what conditions"
          headerAction={
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="text-null-muted hover:text-null-text transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Button variant="primary" onClick={openCreate} icon={Plus} className="py-1.5 px-3 text-xs">
                New Policy
              </Button>
            </div>
          }
        >
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-null-muted" />
            <input
              type="text"
              placeholder="Search policies by role, resource, or condition..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-null-bg border border-null-border rounded pl-8 pr-3 py-2 text-sm font-sans text-null-text placeholder:text-null-muted/50 focus:outline-none focus:border-null-signal focus:ring-2 focus:ring-null-signal/10 transition"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 font-mono text-xs text-null-muted animate-pulse">
              LOADING POLICY DATABASE...
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="w-10 h-10 text-null-muted mx-auto mb-3" />
              <p className="font-sans text-sm text-null-muted">No policies found.</p>
              {!searchQuery && (
                <Button variant="primary" onClick={openCreate} icon={Plus} className="mt-4">
                  Create First Policy
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
                    <th className="py-3 px-4 font-sans font-semibold w-12">ID</th>
                    <th className="py-3 px-4 font-sans font-semibold">Role</th>
                    <th className="py-3 px-4 font-sans font-semibold">Resource Name</th>
                    <th className="py-3 px-4 font-sans font-semibold">Access Condition</th>
                    <th className="py-3 px-4 font-sans font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
                  {filteredPolicies.map(policy => (
                    <tr key={policy.policy_id} className="hover:bg-null-surface/30 transition-colors">

                      <td className="py-3.5 px-4 font-mono text-xs text-null-muted">#{policy.policy_id}</td>

                      <td className="py-3.5 px-4">
                        <Badge status={policy.role_name} />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-null-info flex-shrink-0" />
                          <span className="font-sans font-semibold text-null-text">{policy.resource_name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(policy.access_condition || '').split(/\s+AND\s+|\s+OR\s+/).map((cond, i) => (
                            <span key={i} className="px-2 py-0.5 bg-null-surface border border-null-border rounded-full text-[10px] font-mono text-null-muted uppercase tracking-wider">
                              {cond.trim()}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(policy)}
                            className="p-1.5 text-null-muted hover:text-null-info hover:bg-null-info/5 rounded transition-colors"
                            title="Edit policy"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(policy)}
                            className="p-1.5 text-null-muted hover:text-null-deny hover:bg-null-deny-dim/10 rounded transition-colors"
                            title="Delete policy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Zero Trust info callout */}
        <div className="p-4 bg-null-signal-dim/10 border border-null-signal/20 rounded flex items-start gap-3">
          <Info className="w-4 h-4 text-null-signal flex-shrink-0 mt-0.5" />
          <div className="text-xs font-sans text-null-muted">
            <strong className="text-null-signal">Zero Trust Policy Engine:</strong> Policies are evaluated on every access request as step 5 of the 6-step verification pipeline. A missing or non-matching policy results in an immediate <span className="font-mono text-null-deny">ACCESS_DENIED</span> event and audit log entry, regardless of all other checks passing.
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <PolicyModal
          policy={editingPolicy}
          roles={roles}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </Layout>
  );
};

export default AdminPolicies;
