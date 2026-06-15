import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { Monitor, ShieldCheck, ShieldX, Trash2, Copy } from 'lucide-react';
import api from '../utils/api';

const AdminDevices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchAllDevices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/devices');
      setDevices(response.data);
    } catch (err) {
      console.error('Failed to fetch devices:', err.message);
      setToast({ type: 'error', message: 'Failed to fetch global devices list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDevices();
  }, []);

  const handleUpdateTrust = async (id, status) => {
    try {
      await api.patch(`/devices/${id}/trust`, { trust_status: status });
      const actionName = status === 'trusted' ? 'trusted' : 'revoked';
      setToast({ type: 'success', message: `Device trust successfully set to ${actionName}.` });
      fetchAllDevices();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update device status.';
      setToast({ type: 'error', message: errorMsg });
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('Delete this device registration? The associated user will be locked out until re-registering.')) {
      return;
    }

    try {
      await api.delete(`/devices/${id}`);
      setToast({ type: 'success', message: 'Device registration deleted.' });
      fetchAllDevices();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to delete device.';
      setToast({ type: 'error', message: errorMsg });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToast({ type: 'success', message: 'Fingerprint copied to clipboard.' });
  };

  return (
    <Layout title="Device Trust Control">
      <div className="flex flex-col gap-6">
        <Card title="Hardware Verification Registry" subtitle="Global administrative control of authorized client nodes">
          {loading ? (
            <div className="text-center py-8 font-mono text-xs text-null-muted">Querying global device database...</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-sans text-sm text-null-muted">No devices are currently registered in the system.</p>
              <p className="font-mono text-[11px] text-null-muted/60 mt-1 uppercase tracking-wider">Awaiting client authorization attempts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-null-border rounded bg-null-bg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
                    <th className="py-3 px-4 font-sans font-semibold">User Identity</th>
                    <th className="py-3 px-4 font-sans font-semibold">Device Label</th>
                    <th className="py-3 px-4 font-sans font-semibold">Hardware Fingerprint</th>
                    <th className="py-3 px-4 font-sans font-semibold">Status</th>
                    <th className="py-3 px-4 font-sans font-semibold">Reg. Date</th>
                    <th className="py-3 px-4 font-sans font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
                  {devices.map((device) => (
                    <tr key={device.device_id} className="hover:bg-null-surface/30 transition-colors">
                      {/* User Identity */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-null-text">{device.user_name || 'System User'}</div>
                        <div className="text-xs font-mono text-null-muted mt-0.5">{device.user_email}</div>
                      </td>
                      
                      {/* Device Label */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-null-muted flex-shrink-0" />
                          <span className="font-medium">{device.device_name}</span>
                        </div>
                      </td>

                      {/* Fingerprint */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-null-info bg-null-bg/85 px-2 py-0.5 rounded border border-null-border select-all truncate max-w-[120px] md:max-w-[180px]" title={device.device_fingerprint}>
                            {device.device_fingerprint}
                          </span>
                          <button
                            onClick={() => copyToClipboard(device.device_fingerprint)}
                            className="text-null-muted hover:text-null-info transition-colors p-1"
                            title="Copy Fingerprint"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <Badge status={device.trust_status} />
                      </td>

                      {/* Registration Date */}
                      <td className="py-3 px-4 font-mono text-xs text-null-muted">
                        {new Date(device.registration_date).toLocaleDateString()}
                      </td>

                      {/* Action Controls */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {device.trust_status !== 'trusted' && (
                            <Button
                              variant="primary"
                              className="py-1 px-2.5 text-xs bg-null-signal text-null-bg hover:bg-null-signal/90 flex items-center gap-1"
                              onClick={() => handleUpdateTrust(device.device_id, 'trusted')}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Trust
                            </Button>
                          )}
                          {device.trust_status !== 'revoked' && (
                            <Button
                              variant="destructive"
                              className="py-1 px-2.5 text-xs border-null-deny text-null-deny hover:bg-null-deny-dim/30 flex items-center gap-1"
                              onClick={() => handleUpdateTrust(device.device_id, 'revoked')}
                            >
                              <ShieldX className="w-3.5 h-3.5" />
                              Revoke
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            className="py-1 px-2 text-null-muted hover:text-null-deny hover:bg-null-deny-dim/10 rounded transition-colors"
                            onClick={() => handleDeleteDevice(device.device_id)}
                            title="Unregister Device"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

export default AdminDevices;
