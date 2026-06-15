import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import FormField from '../components/FormField';
import Toast from '../components/Toast';
import api from '../utils/api';
import { ShieldAlert, ShieldCheck, Key, Shield, Laptop, RefreshCw, LogOut } from 'lucide-react';

const Dashboard = () => {
  const { user, deviceInfo, updateUserInfo, sessionId } = useAuth();
  const location = useLocation();

  // State
  const [rbacError, setRbacError] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [resources, setResources] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentDeviceTrust, setCurrentDeviceTrust] = useState(null); // null = loading
  const [terminatingId, setTerminatingId] = useState(null);

  // 2FA Setup Modal State
  const [show2faModal, setShow2faModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  // Check for RBAC error in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('error') === 'rbac_denied') {
      setRbacError(true);
      setToast({ type: 'error', message: 'Access Denied: Administrator privileges required.' });
    }
  }, [location]);

  // Fetch sessions and resources
  const fetchData = async () => {
    setLoadingSessions(true);
    setLoadingResources(true);
    try {
      const sessRes = await api.get('/sessions');
      setSessions(sessRes.data.slice(0, 5)); // Keep last 5 sessions
    } catch (err) {
      console.error('Failed to fetch sessions:', err.message);
    } finally {
      setLoadingSessions(false);
    }

    try {
      const resRes = await api.get('/resources');
      setResources(resRes.data);
    } catch (err) {
      console.error('Failed to fetch resources:', err.message);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleTerminateSession = async (sessId) => {
    const isSelf = sessId === sessionId;
    if (isSelf) {
      if (!window.confirm('Force terminating your current session will log you out immediately. Proceed?')) return;
    } else {
      if (!window.confirm(`Force terminate session #${sessId}?`)) return;
    }

    setTerminatingId(sessId);
    try {
      await api.delete(`/sessions/${sessId}`);
      setToast({ type: 'success', message: `Session #${sessId} terminated.` });
      // If user terminated their own active session, Axios interceptor or local redirect will log them out.
      // If it's a different session, refresh the list:
      if (!isSelf) {
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to terminate session.';
      setToast({ type: 'error', message: msg });
    } finally {
      setTerminatingId(null);
    }
  };

  // Fetch current device trust status
  useEffect(() => {
    const fetchDeviceTrust = async () => {
      if (!deviceInfo.fingerprint) return;
      try {
        const res = await api.get('/devices');
        const myDevice = res.data.find(d => d.device_fingerprint === deviceInfo.fingerprint);
        setCurrentDeviceTrust(myDevice ? myDevice.trust_status : 'unregistered');
      } catch {
        setCurrentDeviceTrust('unknown');
      }
    };
    fetchDeviceTrust();
  }, [deviceInfo.fingerprint]);

  useEffect(() => {
    fetchData();
  }, []);

  // Initiate 2FA Enrollment
  const handleStart2faSetup = async () => {
    try {
      const response = await api.post('/auth/totp/setup');
      setQrCode(response.data.qrCodeDataUrl);
      setTotpSecret(response.data.secret);
      setShow2faModal(true);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to initiate 2FA setup.' });
    }
  };

  // Confirm 2FA Enrollment
  const handleVerify2fa = async (e) => {
    e.preventDefault();
    if (!totpCode) return;

    setEnrolling(true);
    try {
      await api.post('/auth/totp/enroll', { totp_code: totpCode });
      setToast({ type: 'success', message: 'Two-Factor Authentication activated successfully!' });
      
      // Update local context user state
      if (user) {
        updateUserInfo({ ...user, totp_enabled: true });
      }
      setShow2faModal(false);
      setTotpCode('');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Invalid passcode. Please try again.';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <Layout title="Dashboard">
      <div className="flex flex-col gap-6">
        
        {/* RBAC Violation Notice Banner */}
        {rbacError && (
          <div className="flex items-center gap-3 p-4 bg-null-deny-dim/30 border border-null-deny/30 rounded text-null-deny animate-pulse">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <strong className="font-sans">Access Denied:</strong> Your identity role (<span className="font-mono text-xs">{user?.role_name}</span>) does not have permissions to access the requested Administrative resource.
            </div>
            <button 
              onClick={() => setRbacError(false)} 
              className="ml-auto text-xs font-mono uppercase tracking-wider text-null-muted hover:text-null-text"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Identity & 2FA Status Card */}
          <Card title="Security Profile" subtitle="Active identity credential parameters">
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-null-muted uppercase tracking-wider font-sans">Full Name</span>
                <span className="text-sm font-sans text-null-text font-medium">{user?.full_name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-null-muted uppercase tracking-wider font-sans">Email Address</span>
                <span className="text-sm font-mono text-null-text truncate">{user?.email}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-null-muted uppercase tracking-wider font-sans">Network Role</span>
                <div>
                  <Badge status={user?.role_name} />
                </div>
              </div>

              {/* 2FA Enrollment Section */}
              <div className="mt-4 pt-4 border-t border-null-border">
                {user?.totp_enabled ? (
                  <div className="flex items-center gap-2.5 p-3 bg-null-signal-dim/15 border border-null-signal/20 rounded">
                    <ShieldCheck className="w-5 h-5 text-null-signal" />
                    <div>
                      <div className="text-xs font-semibold text-null-signal uppercase tracking-wider font-sans">2FA Activated</div>
                      <div className="text-[11px] text-null-muted mt-0.5 font-sans">Continuous MFA challenge is active on this session.</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2.5 p-3 bg-null-warn/5 border border-null-warn/20 rounded">
                      <Shield className="w-5 h-5 text-null-warn flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-null-warn uppercase tracking-wider font-sans">2FA Recommended</div>
                        <div className="text-[11px] text-null-muted mt-0.5 font-sans">Enroll in Google Authenticator to satisfy Zero Trust login rules.</div>
                      </div>
                    </div>
                    <Button 
                      variant="primary" 
                      onClick={handleStart2faSetup}
                      icon={Key}
                    >
                      Enable 2FA Protection
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Client Device Context Card */}
          <Card title="Device Verification" subtitle="Validated browser hardware fingerprint">
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center gap-3 p-3 bg-null-surface-raised border border-null-border rounded">
                <Laptop className="w-5 h-5 text-null-info flex-shrink-0" />
                <div className="truncate">
                  <div className="text-xs text-null-muted font-sans">Current Device Name</div>
                  <div className="text-sm font-sans text-null-text font-medium truncate">{deviceInfo.deviceName}</div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-null-muted uppercase tracking-wider font-sans">Hardware Fingerprint</span>
                <span className="text-xs font-mono text-null-info bg-null-bg/80 p-2 rounded border border-null-border select-all break-all">
                  {deviceInfo.fingerprint}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-null-muted uppercase tracking-wider font-sans">Trust Level</span>
                <div>
                  {currentDeviceTrust === null ? (
                    <span className="font-mono text-xs text-null-muted animate-pulse">QUERYING...</span>
                  ) : (
                    <Badge status={currentDeviceTrust} />
                  )}
                </div>
                {currentDeviceTrust === 'pending' && (
                  <p className="text-[10px] font-sans text-null-warn mt-1">Awaiting administrator trust approval.</p>
                )}
                {currentDeviceTrust === 'revoked' && (
                  <p className="text-[10px] font-sans text-null-deny mt-1">This device's trust has been revoked.</p>
                )}
                {currentDeviceTrust === 'unregistered' && (
                  <p className="text-[10px] font-sans text-null-warn mt-1">Device not registered — visit My Devices to register it.</p>
                )}
              </div>

              <div className="text-[11px] text-null-muted mt-2 font-sans">
                Notice: NULL inspects hardware parameters on every packet request. Changing browsers or devices will trigger an automated registration block.
              </div>
            </div>
          </Card>

          {/* Resources & Policies Card */}
          <Card 
            title="Authorized Resources" 
            subtitle="Derived policies for active role"
            headerAction={
              <button onClick={fetchData} className="text-null-muted hover:text-null-text transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            }
          >
            {loadingResources ? (
              <div className="text-center py-8 font-mono text-xs text-null-muted">Resolving RBAC policies...</div>
            ) : resources.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-sans text-sm text-null-muted">No resources mapped to this role.</p>
                <p className="font-mono text-[11px] text-null-muted/60 mt-1 uppercase tracking-wider">Default-deny posture active.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-1">
                {resources.map((res, index) => (
                  <div key={index} className="p-3 bg-null-bg border border-null-border rounded flex items-center justify-between">
                    <div>
                      <div className="text-sm font-sans font-semibold text-null-text">{res.resource_name}</div>
                      <div className="text-[10px] font-mono text-null-muted mt-0.5">RULE: {res.access_condition}</div>
                    </div>
                    <Badge status="Granted" />
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Sessions & Audit Cards */}
        <div className="grid grid-cols-1 gap-6">
          <Card title="Active Sessions" subtitle="Recent authentication token allocations">
            {loadingSessions ? (
              <div className="text-center py-8 font-mono text-xs text-null-muted">Loading tokens...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 font-sans text-sm text-null-muted">No active sessions found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
                      <th className="py-2.5 px-4 font-sans font-semibold">Session ID</th>
                      <th className="py-2.5 px-4 font-sans font-semibold">User Email</th>
                      <th className="py-2.5 px-4 font-sans font-semibold">Login Time</th>
                      <th className="py-2.5 px-4 font-sans font-semibold">Expiry</th>
                      <th className="py-2.5 px-4 font-sans font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-sans font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-null-border font-mono text-xs text-null-text">
                    {sessions.map((sess) => {
                      const isCurrent = sess.session_id === sessionId;
                      return (
                        <tr key={sess.session_id} className="hover:bg-null-surface-raised/40">
                          <td className="py-3 px-4 text-null-info">
                            #{sess.session_id} {isCurrent && <span className="text-[9px] text-null-signal ml-1 bg-null-signal-dim/20 px-1 py-0.5 rounded border border-null-signal/30 font-sans uppercase">current</span>}
                          </td>
                          <td className="py-3 px-4">{sess.user_email || user?.email}</td>
                          <td className="py-3 px-4 text-null-muted">{new Date(sess.login_time).toLocaleString()}</td>
                          <td className="py-3 px-4 text-null-muted">{new Date(sess.expiry_time).toLocaleTimeString()}</td>
                          <td className="py-3 px-4">
                            <Badge status={sess.status} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            {sess.status === 'active' ? (
                              <button
                                onClick={() => handleTerminateSession(sess.session_id)}
                                disabled={terminatingId === sess.session_id}
                                className="text-[10px] font-sans text-null-deny hover:underline disabled:opacity-50"
                              >
                                {isCurrent ? 'Logout' : 'Terminate'}
                              </button>
                            ) : (
                              <span className="text-[10px] font-sans text-null-muted uppercase tracking-wider">Inactive</span>
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

      </div>

      {/* 2FA Setup Modal */}
      {show2faModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-null-bg/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-null-surface-raised border border-null-border rounded-md p-6 shadow-xl relative animate-slide-in">
            <h3 className="font-sans text-lg font-semibold text-null-text mb-1">
              Google Authenticator Setup
            </h3>
            <p className="font-sans text-xs text-null-muted mb-4 uppercase tracking-wider">
              Scan QR code to bind MFA credentials
            </p>

            <div className="flex flex-col items-center gap-4 py-4 border-y border-null-border">
              {/* QR Image */}
              {qrCode ? (
                <div className="p-3 bg-white rounded">
                  <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                </div>
              ) : (
                <div className="w-40 h-40 bg-null-bg flex items-center justify-center rounded border border-null-border text-xs text-null-muted font-mono animate-pulse">
                  GENERATING QR...
                </div>
              )}

              {/* Secret Backup Display */}
              <div className="w-full">
                <span className="text-[10px] text-null-muted font-mono uppercase tracking-wider">Manual Secret Key</span>
                <div className="font-mono text-xs text-null-info bg-null-bg p-2 rounded border border-null-border select-all text-center mt-1 select-all break-all">
                  {totpSecret}
                </div>
              </div>
            </div>

            <form onSubmit={handleVerify2fa} className="mt-4 flex flex-col gap-4">
              <FormField
                label="Verification Passcode"
                id="totpCode"
                placeholder="Enter 6-digit code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
                mono
                maxLength={6}
                disabled={enrolling}
              />

              <div className="flex gap-3 mt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 py-2"
                  disabled={enrolling || !totpCode}
                >
                  {enrolling ? 'Validating...' : 'Enable 2FA'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="py-2"
                  onClick={() => {
                    setShow2faModal(false);
                    setTotpCode('');
                  }}
                  disabled={enrolling}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default Dashboard;
