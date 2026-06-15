import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { Smartphone, Monitor, Trash2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Devices = () => {
  const { deviceInfo } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/devices');
      setDevices(response.data);
    } catch (err) {
      console.error('Failed to fetch devices:', err.message);
      setToast({ type: 'error', message: 'Failed to fetch registered devices.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRegisterDevice = async () => {
    if (!deviceInfo.fingerprint) return;

    try {
      await api.post('/devices/register', {
        device_name: deviceInfo.deviceName || 'Web Browser Node',
        device_fingerprint: deviceInfo.fingerprint
      });
      setToast({ type: 'success', message: 'Device registered. Status set to pending approval.' });
      fetchDevices();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Registration failed.';
      setToast({ type: 'error', message: errorMsg });
    }
  };

  const handleRemoveDevice = async (id) => {
    try {
      await api.delete(`/devices/${id}`);
      setToast({ type: 'success', message: 'Device successfully removed.' });
      fetchDevices();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to remove device.';
      setToast({ type: 'error', message: errorMsg });
    }
  };

  const isCurrentDeviceRegistered = devices.some(
    (d) => d.device_fingerprint === deviceInfo.fingerprint
  );

  return (
    <Layout title="Device Management">
      <div className="flex flex-col gap-6">
        
        {/* Banner: Current Device Unregistered */}
        {!loading && !isCurrentDeviceRegistered && deviceInfo.fingerprint && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-null-warn/10 border border-null-warn/20 rounded text-null-warn">
            <div className="flex gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-sans font-semibold">Unregistered Access Node</div>
                <div className="text-xs font-sans mt-0.5 text-null-text/80">
                  This browser profile is not bound to your account identity. Register it to request trust authorization.
                </div>
                <div className="text-[11px] font-mono mt-1 text-null-muted select-all">
                  FINGERPRINT: {deviceInfo.fingerprint}
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              className="bg-null-warn text-null-bg hover:bg-null-warn/90 font-semibold flex-shrink-0"
              onClick={handleRegisterDevice}
            >
              Register Current Device
            </Button>
          </div>
        )}

        {/* Banner: Current Device Registered and Pending */}
        {!loading && isCurrentDeviceRegistered && (
          (() => {
            const currentDev = devices.find(d => d.device_fingerprint === deviceInfo.fingerprint);
            if (currentDev && currentDev.trust_status === 'pending') {
              return (
                <div className="flex items-start gap-3 p-4 bg-null-warn/5 border border-null-warn/25 rounded text-null-warn">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <div className="text-sm font-sans">
                    <strong>Awaiting Trust Verification:</strong> This device is registered but pending Administrator approval. Access to protected console areas will remain restricted.
                  </div>
                </div>
              );
            }
            if (currentDev && currentDev.trust_status === 'revoked') {
              return (
                <div className="flex items-start gap-3 p-4 bg-null-deny-dim/30 border border-null-deny/20 rounded text-null-deny">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <div className="text-sm font-sans">
                    <strong>Trust Revoked:</strong> Access from this device has been explicitly blocked by an Administrator.
                  </div>
                </div>
              );
            }
            return null;
          })()
        )}

        <Card title="Registered Hardware Nodes" subtitle="Identities authorized to authenticate from endpoints">
          {loading ? (
            <div className="text-center py-8 font-mono text-xs text-null-muted">Querying device registry...</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-sans text-sm text-null-muted">No hardware endpoints bound to this identity.</p>
              <p className="font-mono text-[11px] text-null-muted/60 mt-1 uppercase tracking-wider">Zero Trust requires trusted hardware.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {devices.map((device) => {
                const isCurrent = device.device_fingerprint === deviceInfo.fingerprint;
                return (
                  <div 
                    key={device.device_id} 
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 bg-null-surface border rounded transition-colors ${
                      isCurrent 
                        ? 'border-null-signal/45 bg-null-signal-dim/5' 
                        : 'border-null-border hover:border-null-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-null-muted" />
                      <div>
                        <div className="text-sm font-sans font-semibold text-null-text flex items-center gap-2">
                          {device.device_name}
                          {isCurrent && (
                            <span className="font-mono text-[9px] uppercase tracking-wider bg-null-signal-dim text-null-signal px-1.5 py-0.5 rounded-full border border-null-signal/15">
                              Current Node
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-null-muted mt-0.5 select-all">
                          FINGERPRINT: {device.device_fingerprint}
                        </div>
                        <div className="text-[10px] font-mono text-null-muted/70 mt-1">
                          REGISTERED: {new Date(device.registration_date).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 md:mt-0 justify-between md:justify-end">
                      <Badge status={device.trust_status} />
                      <Button
                        variant="destructive"
                        className="py-1 px-2.5 text-xs flex gap-1 items-center"
                        onClick={() => handleRemoveDevice(device.device_id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Unregister
                      </Button>
                    </div>
                  </div>
                );
              })}
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

export default Devices;
