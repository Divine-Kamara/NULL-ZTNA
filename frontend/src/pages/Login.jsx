import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Toast from '../components/Toast';

const Login = () => {
  const { login, verifyTotp, deviceInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect page after login
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // 2FA state
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpDigits, setTotpDigits] = useState(['', '', '', '', '', '']);
  const digitRefs = useRef([]);

  // Check if routed from registration or had session error
  useEffect(() => {
    if (location.state?.registered) {
      setToast({ type: 'success', message: 'Identity registered. Please log in.' });
      if (location.state.email) {
        setEmail(location.state.email);
      }
    }
    // Check for forced logout due to expired/terminated session (from api.js interceptor)
    const params = new URLSearchParams(location.search);
    if (params.get('reason') === 'session_expired') {
      setSessionExpired(true);
    }
  }, [location]);

  // Handle focus for 2FA digit inputs
  const handleDigitChange = (index, value) => {
    if (isNaN(value)) return; // Only allow numbers

    const newDigits = [...totpDigits];
    newDigits[index] = value.substring(value.length - 1); // Only take last character
    setTotpDigits(newDigits);

    // Auto focus next box
    if (value && index < 5) {
      digitRefs.current[index + 1].focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    // Backspace to focus previous box
    if (e.key === 'Backspace' && !totpDigits[index] && index > 0) {
      digitRefs.current[index - 1].focus();
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && !isNaN(pasteData)) {
      const pasteArray = pasteData.split('');
      setTotpDigits(pasteArray);
      digitRefs.current[5].focus();
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const result = await login(email, password);
      
      if (result.requires_totp) {
        setRequiresTotp(true);
        setTempToken(result.temp_token);
        // Focus first digit box next tick
        setTimeout(() => digitRefs.current[0]?.focus(), 100);
      } else {
        setToast({ type: 'success', message: 'Authentication approved. Session active.' });
        setTimeout(() => navigate(from, { replace: true }), 1000);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Authentication failed. Please verify credentials.';
      setToast({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    const totpCode = totpDigits.join('');
    if (totpCode.length < 6) {
      setToast({ type: 'warning', message: 'Please enter all 6 verification digits' });
      return;
    }

    setLoading(true);
    try {
      await verifyTotp(tempToken, totpCode);
      setToast({ type: 'success', message: '2FA verification success. Access granted.' });
      setTimeout(() => navigate(from, { replace: true }), 1000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Invalid 2FA verification code.';
      setToast({ type: 'error', message: errorMsg });
      // Reset inputs on fail
      setTotpDigits(['', '', '', '', '', '']);
      digitRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-null-bg">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="font-mono text-3xl font-bold tracking-widest text-null-text">
            NULL<span className="text-null-signal font-mono text-sm">//ZTNA</span>
          </h1>
          <p className="font-sans text-xs text-null-muted mt-1 uppercase tracking-wider">
            Zero Trust Network Access Portal
          </p>
        </div>

        {/* Session Expired Banner */}
        {sessionExpired && (
          <div className="w-full max-w-md mx-auto mb-4 flex items-start gap-3 p-3 bg-null-warn/10 border border-null-warn/30 rounded">
            <svg className="w-4 h-4 text-null-warn flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <div className="text-xs font-sans font-semibold text-null-warn">Session Terminated</div>
              <div className="text-[11px] font-sans text-null-muted mt-0.5">Your session has expired or was terminated. Please re-authenticate.</div>
            </div>
          </div>
        )}

        {/* Card Frame */}
        <Card 
          title={requiresTotp ? "Two-Factor Verification" : "Sign In"} 
          subtitle={requiresTotp ? "Enter Authenticator Passcode" : "Verify account identity credentials"}
        >
          {!requiresTotp ? (
            /* Step 1: Password Form */
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 mt-2">
              <FormField
                label="Identity Email"
                id="email"
                type="email"
                placeholder="email@company.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />

              <FormField
                label="Identity Password"
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />

              <Button
                type="submit"
                variant="primary"
                className="mt-2 py-2.5"
                disabled={loading}
              >
                {loading ? 'Verifying Identity...' : 'Next Step'}
              </Button>
            </form>
          ) : (
            /* Step 2: TOTP Input Form */
            <form onSubmit={handleTotpSubmit} className="flex flex-col gap-6 mt-2">
              <div>
                <label className="block text-center text-sm font-sans font-medium text-null-text mb-4">
                  Enter the 6-digit code from your authenticator app
                </label>
                <div className="flex justify-between gap-2">
                  {totpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (digitRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      onPaste={handleDigitPaste}
                      disabled={loading}
                      className="w-12 h-14 bg-null-surface border border-null-border rounded text-center text-xl text-null-signal font-mono focus:outline-none focus:border-null-signal focus:ring-4 focus:ring-null-signal/15 transition-all"
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="py-2.5"
                  disabled={loading}
                >
                  {loading ? 'Verifying 2FA...' : 'Verify Passcode'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="py-2"
                  onClick={() => {
                    setRequiresTotp(false);
                    setTotpDigits(['', '', '', '', '', '']);
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Navigation Links */}
          {!requiresTotp && (
            <div className="text-center mt-6 pt-4 border-t border-null-border">
              <p className="font-sans text-xs text-null-muted">
                Need credentials?{' '}
                <Link to="/register" className="text-null-info hover:underline hover:text-null-text font-medium">
                  Enroll identity here
                </Link>
              </p>
            </div>
          )}
        </Card>

        {/* Client side fingerprint display */}
        <div className="mt-6 p-3 bg-null-surface/30 border border-null-border/50 rounded flex flex-col gap-1 text-[11px] font-mono text-null-muted">
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wider">Fingerprint Device Node:</span>
            <span className="text-null-info truncate max-w-[200px] select-all" title={deviceInfo.fingerprint}>
              {deviceInfo.fingerprint || 'CALCULATING...'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wider">Device Agent:</span>
            <span className="text-null-text truncate max-w-[200px]" title={deviceInfo.deviceName}>
              {deviceInfo.deviceName || 'RESOLVING...'}
            </span>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Login;
