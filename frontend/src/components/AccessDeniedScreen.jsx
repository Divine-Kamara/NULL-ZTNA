import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AccessDeniedScreen = ({ requiredRole, currentRole }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determine the correct "home" route for the current user
  const getPortalHome = () => {
    if (!user) return '/access-request';
    if (user.role_name === 'Administrator') return '/enterprise/admin';
    if (user.role_name === 'Employee') return '/enterprise/staff';
    return '/enterprise/student';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-null-bg px-6 text-center">
      {/* Red shield icon */}
      <div className="w-20 h-20 rounded-full bg-null-deny-dim border border-null-deny/30 flex items-center justify-center mb-6 animate-pulse">
        <ShieldX className="w-10 h-10 text-null-deny" />
      </div>

      {/* ACCESS DENIED title */}
      <h1 className="font-mono text-3xl font-bold text-null-deny uppercase tracking-widest mb-3">
        ACCESS DENIED
      </h1>

      {/* Horizontal rule */}
      <div className="w-24 h-px bg-null-deny/30 mb-6" />

      {/* Reason block */}
      <div className="max-w-md bg-null-surface border border-null-deny/20 rounded p-6 mb-6 text-left">
        <p className="font-sans text-sm text-null-text mb-3">
          Your role{' '}
          <span className="font-mono text-null-warn bg-null-warn/10 px-1.5 py-0.5 rounded">
            {currentRole || 'Unknown'}
          </span>{' '}
          does not have permission to access this resource.
        </p>
        <p className="font-sans text-xs text-null-muted leading-relaxed">
          This unauthorized access attempt has been recorded in the ZTNA audit log with your identity,
          device fingerprint, and timestamp. The incident will be visible to the System Administrator.
        </p>
      </div>

      {/* Audit-logged notice */}
      <div className="flex items-center gap-2 px-4 py-2 bg-null-deny-dim/30 border border-null-deny/20 rounded mb-8">
        <div className="w-1.5 h-1.5 rounded-full bg-null-deny animate-ping" />
        <span className="font-mono text-xs text-null-deny uppercase tracking-widest">
          Incident logged to audit trail
        </span>
      </div>

      {/* Return button */}
      <button
        onClick={() => navigate(getPortalHome())}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-null-surface border border-null-border rounded font-sans text-sm text-null-text hover:border-null-signal/40 hover:text-null-signal transition-colors duration-150"
      >
        ← Return to My Portal
      </button>
    </div>
  );
};

export default AccessDeniedScreen;
