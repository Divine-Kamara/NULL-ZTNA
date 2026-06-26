import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import EnterpriseGuard from './components/EnterpriseGuard';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import AccessRequest from './pages/AccessRequest';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminDevices from './pages/AdminDevices';
import AdminPolicies from './pages/AdminPolicies';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminSessions from './pages/AdminSessions';
import EnterprisePortal from './pages/enterprise/EnterprisePortal';
import EnterpriseAdmin from './pages/enterprise/EnterpriseAdmin';
import EnterpriseEmployee from './pages/enterprise/EnterpriseEmployee';
import EnterpriseGuest from './pages/enterprise/EnterpriseGuest';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Regular User Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/devices" 
            element={
              <ProtectedRoute>
                <Devices />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/access-request" 
            element={
              <ProtectedRoute>
                <AccessRequest />
              </ProtectedRoute>
            } 
          />

          {/* Protected Administrator Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute adminOnly>
                <AdminUsers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/devices" 
            element={
              <ProtectedRoute adminOnly>
                <AdminDevices />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/policies" 
            element={
              <ProtectedRoute adminOnly>
                <AdminPolicies />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/audit-logs" 
            element={
              <ProtectedRoute adminOnly>
                <AdminAuditLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/sessions" 
            element={
              <ProtectedRoute adminOnly>
                <AdminSessions />
              </ProtectedRoute>
            } 
          />

          {/* Enterprise Portal Routes — require ZTNA grant */}
          <Route path="/enterprise" element={<EnterpriseGuard><EnterprisePortal /></EnterpriseGuard>} />
          <Route path="/enterprise/admin" element={<EnterpriseGuard role="Administrator"><EnterpriseAdmin /></EnterpriseGuard>} />
          <Route path="/enterprise/admin/users" element={<EnterpriseGuard role="Administrator"><EnterpriseAdmin section="users" /></EnterpriseGuard>} />
          <Route path="/enterprise/admin/transcripts" element={<EnterpriseGuard role="Administrator"><EnterpriseAdmin section="transcripts" /></EnterpriseGuard>} />
          <Route path="/enterprise/admin/audit" element={<EnterpriseGuard role="Administrator"><EnterpriseAdmin section="audit" /></EnterpriseGuard>} />
          <Route path="/enterprise/admin/sessions" element={<EnterpriseGuard role="Administrator"><EnterpriseAdmin section="sessions" /></EnterpriseGuard>} />
          <Route path="/enterprise/staff" element={<EnterpriseGuard role="Employee"><EnterpriseEmployee /></EnterpriseGuard>} />
          <Route path="/enterprise/staff/activity" element={<EnterpriseGuard role="Employee"><EnterpriseEmployee section="activity" /></EnterpriseGuard>} />
          <Route path="/enterprise/student" element={<EnterpriseGuard role="Guest"><EnterpriseGuest /></EnterpriseGuard>} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
