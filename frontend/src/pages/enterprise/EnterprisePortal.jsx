import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck, Clock, Monitor, CheckCircle2, ArrowRight,
  Building2, BookOpen, LayoutDashboard, ScrollText
} from 'lucide-react';
import Layout from '../../components/Layout';

const GateBadge = ({ gate }) => {
  const icons = {
    'User Authentication': '①',
    'Two-Factor Authentication': '②',
    'Device Verification': '③',
    'Role Verification': '④',
    'Policy Verification': '⑤',
    'Session Validation': '⑥',
  };
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 bg-null-signal-dim/20 border border-null-signal/20 rounded">
      <CheckCircle2 className="w-3.5 h-3.5 text-null-signal flex-shrink-0" />
      <span className="font-mono text-[11px] text-null-text">{icons[gate.check] || '✓'} {gate.check}</span>
      <span className="ml-auto font-mono text-[10px] text-null-signal uppercase tracking-widest">PASS</span>
    </div>
  );
};

const SessionCountdown = ({ token }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const getExp = () => {
      if (!token) return null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp ? payload.exp * 1000 : null;
      } catch {
        return null;
      }
    };

    const exp = getExp();
    if (!exp) { setTimeLeft('N/A'); return; }

    const update = () => {
      const diff = exp - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [token]);

  return <span className="font-mono text-null-signal text-sm">{timeLeft}</span>;
};

const EnterprisePortal = () => {
  const { user, token, accessResult, deviceInfo } = useAuth();
  const navigate = useNavigate();

  const getPortalRoute = () => {
    if (user?.role_name === 'Administrator') return '/enterprise/admin';
    if (user?.role_name === 'Employee') return '/enterprise/staff';
    return '/enterprise/student';
  };

  const getRoleBadgeColor = () => {
    if (user?.role_name === 'Administrator') return 'text-null-signal bg-null-signal-dim border-null-signal/20';
    if (user?.role_name === 'Employee') return 'text-null-info bg-null-info/10 border-null-info/20';
    return 'text-null-muted bg-null-border/30 border-null-border';
  };

  const getRoleLabel = () => {
    if (user?.role_name === 'Administrator') return 'IT Administrator';
    if (user?.role_name === 'Employee') return 'Academic Staff';
    return 'Student';
  };

  const getModuleList = () => {
    if (user?.role_name === 'Administrator') return [
      { icon: LayoutDashboard, label: 'System Overview', desc: 'Active sessions, stat counters, KPI metrics' },
      { icon: ScrollText, label: 'Transcript Audit Log', desc: 'Full record of every grade change' },
      { icon: Building2, label: 'Staff & Student Directory', desc: 'All registered accounts and roles' },
    ];
    if (user?.role_name === 'Employee') return [
      { icon: BookOpen, label: 'Transcript Manager', desc: 'View and edit student academic records' },
      { icon: ScrollText, label: 'My Activity Log', desc: 'Your recent portal actions' },
    ];
    return [
      { icon: BookOpen, label: 'My Transcript', desc: 'View your personal academic record and GPA' },
    ];
  };

  const fpId = deviceInfo?.fingerprint
    ? `${deviceInfo.fingerprint.substring(0, 4)}...${deviceInfo.fingerprint.slice(-4)}`
    : 'N/A';

  return (
    <Layout title="Nexus Academy Portal">
      <div className="flex flex-col gap-6">

        {/* Academy header banner */}
        <div className="relative p-6 bg-gradient-to-r from-null-signal-dim/30 to-null-surface border border-null-signal/20 rounded overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 24px,#3DF2C4 24px,#3DF2C4 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#3DF2C4 24px,#3DF2C4 25px)'}} />
          <div className="relative">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-mono text-xl font-bold text-null-text tracking-widest">
                  NEXUS ACADEMY
                  <span className="text-null-muted font-mono text-xs ml-2">// ACADEMIC MANAGEMENT SYSTEM</span>
                </div>
                <div className="font-sans text-xs text-null-muted mt-1">
                  Access secured and brokered by{' '}
                  <span className="font-mono text-null-signal">NULL Zero Trust Network Access</span>
                </div>
              </div>
              {/* Role badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono font-medium ${getRoleBadgeColor()}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {user?.full_name?.toUpperCase()} — {getRoleLabel().toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ZTNA Session Summary */}
          <div className="bg-null-surface border border-null-border rounded p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-null-border">
              <ShieldCheck className="w-4 h-4 text-null-signal" />
              <h3 className="font-sans text-sm font-semibold text-null-text">ZTNA Session Summary</h3>
            </div>

            {/* 6 Gate badges */}
            <div className="flex flex-col gap-1.5">
              {accessResult ? (
                accessResult.map((gate, i) => <GateBadge key={i} gate={gate} />)
              ) : (
                Array.from({length: 6}, (_, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-3 bg-null-signal-dim/20 border border-null-signal/20 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5 text-null-signal flex-shrink-0" />
                    <span className="font-mono text-[11px] text-null-text">Gate {i+1} Verified</span>
                    <span className="ml-auto font-mono text-[10px] text-null-signal uppercase tracking-widest">PASS</span>
                  </div>
                ))
              )}
            </div>

            {/* Session metadata */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-null-border">
              <div className="bg-null-bg border border-null-border rounded p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3 h-3 text-null-muted" />
                  <span className="font-mono text-[10px] text-null-muted uppercase tracking-wider">Session Expires</span>
                </div>
                <SessionCountdown token={token} />
              </div>
              <div className="bg-null-bg border border-null-border rounded p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Monitor className="w-3 h-3 text-null-muted" />
                  <span className="font-mono text-[10px] text-null-muted uppercase tracking-wider">Device FP</span>
                </div>
                <span className="font-mono text-sm text-null-text">FP: {fpId}</span>
              </div>
            </div>
          </div>

          {/* What you can access */}
          <div className="bg-null-surface border border-null-border rounded p-5 flex flex-col gap-4">
            <div className="pb-3 border-b border-null-border">
              <h3 className="font-sans text-sm font-semibold text-null-text">What You Can Access</h3>
              <p className="font-mono text-[10px] text-null-muted mt-0.5 uppercase tracking-wider">
                Modules granted to role:{' '}
                <span className={
                  user?.role_name === 'Administrator' ? 'text-null-signal' :
                  user?.role_name === 'Employee' ? 'text-null-info' : 'text-null-muted'
                }>
                  {user?.role_name}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              {getModuleList().map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-null-bg border border-null-border rounded">
                  <div className="p-1.5 bg-null-signal-dim/20 border border-null-signal/20 rounded mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-null-signal" />
                  </div>
                  <div>
                    <div className="font-sans text-sm font-medium text-null-text">{label}</div>
                    <div className="font-sans text-xs text-null-muted mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              id="enter-portal-btn"
              onClick={() => navigate(getPortalRoute())}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-null-signal text-null-bg rounded font-sans text-sm font-semibold hover:bg-null-signal/90 transition-colors duration-150"
            >
              Enter Portal <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Persistent amber notice bar */}
        <div className="flex items-start gap-3 p-4 bg-null-warn/5 border border-null-warn/20 rounded">
          <div className="w-1.5 h-1.5 rounded-full bg-null-warn mt-1.5 flex-shrink-0 animate-pulse" />
          <p className="font-sans text-xs text-null-warn leading-relaxed">
            All actions within this portal are recorded and monitored under Zero Trust policy.
            Unauthorized access attempts are logged and flagged automatically.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default EnterprisePortal;
