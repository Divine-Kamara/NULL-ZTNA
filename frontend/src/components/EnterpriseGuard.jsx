import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccessDeniedScreen from './AccessDeniedScreen';
import api from '../utils/api';

/**
 * EnterpriseGuard wraps all /enterprise/* routes.
 * 1. No valid JWT → redirect to /login
 * 2. ZTNA gates not passed → redirect to /access-request
 * 3. Role mismatch → full-page AccessDenied screen + audit log
 */
const EnterpriseGuard = ({ children, role }) => {
  const { token, user, loading, accessGranted } = useAuth();
  const location = useLocation();

  // Fire an audit log if a role mismatch is detected
  useEffect(() => {
    if (!loading && token && user && accessGranted && role && user.role_name !== role) {
      api.post('/enterprise/access-log', {
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resource: location.pathname
      }).catch(() => {});
    }
  }, [loading, token, user, accessGranted, role, location.pathname]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-null-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-null-signal" />
        <p className="font-mono text-xs text-null-muted mt-4 uppercase tracking-widest">Verifying zero trust context...</p>
      </div>
    );
  }

  // Gate 1: must be authenticated
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Gate 2: must have passed the ZTNA pipeline
  if (!accessGranted) {
    return <Navigate to="/access-request" state={{ enterprise_required: true }} replace />;
  }

  // Gate 3: role restriction
  if (role && user.role_name !== role) {
    return <AccessDeniedScreen requiredRole={role} currentRole={user.role_name} />;
  }

  return children;
};

export default EnterpriseGuard;
