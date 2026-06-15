import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { token, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-null-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-null-signal"></div>
        <p className="font-mono text-xs text-null-muted mt-4 uppercase tracking-widest">Verifying session context...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enforce RBAC for Admin routes
  if (adminOnly && user.role_name !== 'Administrator') {
    // Redirect to dashboard with rbac_denied flag
    return <Navigate to="/dashboard?error=rbac_denied" replace />;
  }

  return children;
};

export default ProtectedRoute;
