import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Toast from '../components/Toast';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  User, Key, Monitor, Users, FileCheck, Clock,
  CheckCircle2, XCircle, MinusCircle, Lock, Unlock,
  ChevronRight, RefreshCw, Database
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ------ Step Configuration ------
const STEP_CONFIG = [
  { key: 'User Authentication',      icon: User,        desc: 'Valid email + password credentials' },
  { key: 'Two-Factor Authentication',icon: Key,         desc: 'Google Authenticator TOTP code' },
  { key: 'Device Verification',      icon: Monitor,     desc: 'Hardware fingerprint trusted' },
  { key: 'Role Verification',        icon: Users,       desc: 'RBAC role permits this resource' },
  { key: 'Policy Verification',      icon: FileCheck,   desc: 'Access policy conditions satisfied' },
  { key: 'Session Validation',       icon: Clock,       desc: 'JWT valid and session active' },
];

const STATUS_CONFIG = {
  PASS:    { label: 'PASS',    color: 'text-null-signal',  bg: 'bg-null-signal-dim/30',  border: 'border-null-signal/30',  Icon: CheckCircle2 },
  FAIL:    { label: 'FAIL',    color: 'text-null-deny',   bg: 'bg-null-deny-dim/30',    border: 'border-null-deny/30',    Icon: XCircle      },
  SKIPPED: { label: 'SKIP',   color: 'text-null-muted',  bg: 'bg-null-border/20',      border: 'border-null-border',     Icon: MinusCircle  },
  PENDING: { label: '...',     color: 'text-null-warn',   bg: 'bg-null-warn/10',        border: 'border-null-warn/20',    Icon: Clock        },
};

// ------ Pipeline Step Row ------
const PipelineStep = ({ step, result, stepIndex, visible }) => {
  const cfg = STEP_CONFIG[stepIndex];
  const StepIcon = cfg.icon;
  const status = result ? result.status : (visible ? 'PENDING' : null);
  const statusCfg = status ? STATUS_CONFIG[status] : null;
  const StatusIcon = statusCfg?.Icon;

  return (
    <div
      className={`flex items-start gap-4 py-3 transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
      }`}
      style={{ transitionDelay: `${stepIndex * 80}ms` }}
    >
      {/* Step Number + Connector */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-mono font-bold transition-colors duration-300 ${
            statusCfg
              ? `${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`
              : 'bg-null-border/20 border-null-border text-null-muted'
          }`}
        >
          {stepIndex + 1}
        </div>
        {stepIndex < 5 && (
          <div
            className={`w-px flex-1 min-h-[20px] mt-1 transition-colors duration-500 ${
              result?.status === 'PASS' ? 'bg-null-signal/40' : 'bg-null-border'
            }`}
          />
        )}
      </div>

      {/* Step Content */}
      <div
        className={`flex-1 p-3 rounded border transition-all duration-300 mb-1 ${
          statusCfg ? `${statusCfg.bg} ${statusCfg.border}` : 'bg-null-bg border-null-border'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <StepIcon className={`w-4 h-4 flex-shrink-0 ${statusCfg?.color || 'text-null-muted'}`} />
            <div>
              <div className={`text-sm font-sans font-semibold ${statusCfg?.color || 'text-null-muted'}`}>
                {cfg.key}
              </div>
              <div className="text-[11px] font-sans text-null-muted mt-0.5">{cfg.desc}</div>
            </div>
          </div>
          {StatusIcon && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`font-mono text-[10px] uppercase tracking-widest font-bold ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
              <StatusIcon className={`w-4 h-4 ${statusCfg.color}`} />
            </div>
          )}
        </div>
        {result?.detail && (
          <div className={`mt-2 text-xs font-sans ${statusCfg?.color} bg-null-bg/50 p-2 rounded border ${statusCfg?.border}`}>
            {result.detail}
          </div>
        )}
      </div>
    </div>
  );
};

// ------ Resource Card ------
const ResourceCard = ({ resource, onRequest, loading }) => (
  <div className="group flex flex-col gap-4 p-5 bg-null-surface border border-null-border rounded hover:border-null-signal/30 transition-all duration-200">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-null-info/10 border border-null-info/20 rounded">
        <Database className="w-4 h-4 text-null-info" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-sans font-semibold text-null-text text-sm">{resource.resource_name}</div>
        <div className="font-mono text-[10px] text-null-muted mt-1 uppercase tracking-wider">
          Access Policy Active
        </div>
      </div>
    </div>

    {/* Condition chips */}
    <div className="flex flex-wrap gap-1.5">
      {resource.access_condition.split(/\s+AND\s+|\s+OR\s+/).map((cond, i) => (
        <span key={i} className="px-2 py-0.5 bg-null-bg border border-null-border rounded-full text-[10px] font-mono text-null-muted uppercase tracking-wider">
          {cond.trim()}
        </span>
      ))}
    </div>

    <Button
      variant="primary"
      onClick={() => onRequest(resource.resource_name)}
      disabled={loading}
      icon={Shield}
      className="w-full justify-center text-sm"
    >
      {loading ? 'Verifying...' : 'Request Access'}
    </Button>
  </div>
);

// ------ Main Page ------
const AccessRequest = () => {
  const { user, setAccessGranted, setAccessResult } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [result, setResult] = useState(null); // { allowed, steps, reason, resource_data }
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [toast, setToast] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  // Show info toast if redirected here because enterprise access wasn't yet granted
  useEffect(() => {
    if (location.state?.enterprise_required) {
      setToast({ type: 'info', message: 'Complete ZTNA verification below to enter the Nexus Academy portal.' });
    }
  }, [location.state]);

  const fetchResources = useCallback(async () => {
    setLoadingResources(true);
    try {
      const res = await api.get('/resources');
      setResources(res.data);
    } catch {
      setToast({ type: 'error', message: 'Failed to load available resources.' });
    } finally {
      setLoadingResources(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Animate pipeline steps after result arrives
  useEffect(() => {
    if (!result) return;
    setVisibleSteps(0);
    const steps = result.steps || [];
    steps.forEach((_, i) => {
      setTimeout(() => setVisibleSteps(v => Math.max(v, i + 1)), i * 120 + 100);
    });

    // If access was granted, store in context and redirect after 2s
    if (result.allowed) {
      setAccessGranted(true);
      setAccessResult(result.steps);
      // Log the enterprise access event
      api.post('/enterprise/access-log', { action: 'ENTERPRISE_ACCESS_GRANTED', resource: selectedResource || 'Portal' }).catch(() => {});
      // Redirect after steps finish animating (~2s)
      const delay = steps.length * 120 + 2200;
      setRedirecting(true);
      setTimeout(() => {
        navigate('/enterprise');
      }, delay);
    }
  }, [result]);

  const handleRequest = async (resourceName) => {
    setSelectedResource(resourceName);
    setResult(null);
    setVisibleSteps(0);
    setRequestLoading(true);
    try {
      const res = await api.post('/access-requests', { resource_name: resourceName });
      setResult(res.data);
    } catch (err) {
      const data = err.response?.data;
      setResult(data || { allowed: false, steps: [], reason: 'Server error' });
    } finally {
      setRequestLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedResource(null);
    setVisibleSteps(0);
  };

  return (
    <Layout title="Access Request Panel">
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-null-info/5 border border-null-info/20 rounded">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-null-info" />
            <div>
              <div className="text-sm font-sans font-semibold text-null-text">Zero Trust Access Decision Engine</div>
              <div className="text-xs font-mono text-null-muted mt-0.5">
                Every request runs all 6 verification checks before access is granted.
              </div>
            </div>
          </div>
          <button
            onClick={fetchResources}
            disabled={loadingResources}
            className="text-null-muted hover:text-null-text transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingResources ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Available Resources */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-sans text-base font-semibold text-null-text">Available Resources</h2>
              <p className="font-sans text-xs text-null-muted mt-0.5">
                Resources your role (<span className="font-mono text-null-info">{user?.role_name}</span>) has an access policy for.
              </p>
            </div>

            {loadingResources ? (
              <div className="flex flex-col gap-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-36 bg-null-surface border border-null-border rounded animate-pulse" />
                ))}
              </div>
            ) : resources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-null-border rounded bg-null-surface">
                <ShieldX className="w-10 h-10 text-null-muted mb-3" />
                <p className="font-sans font-semibold text-sm text-null-muted">No resources available</p>
                <p className="font-mono text-[10px] text-null-muted/60 mt-1 uppercase tracking-wider">
                  Default-deny. No policies grant access for your role.
                </p>
                <p className="font-sans text-xs text-null-muted mt-3">
                  Contact an Administrator to assign policies to your role.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {resources.map(r => (
                  <ResourceCard
                    key={r.resource_name}
                    resource={r}
                    onRequest={handleRequest}
                    loading={requestLoading && selectedResource === r.resource_name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Pipeline Ladder */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sans text-base font-semibold text-null-text">Verification Pipeline</h2>
                <p className="font-sans text-xs text-null-muted mt-0.5">
                  Real-time Zero Trust access decision trace.
                </p>
              </div>
              {result && (
                <button
                  onClick={handleReset}
                  className="text-xs font-mono text-null-muted hover:text-null-text uppercase tracking-wider transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Pipeline card */}
            <div className="bg-null-surface border border-null-border rounded p-4">
              {!selectedResource && !result ? (
                /* Idle state */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-null-border/20 border border-null-border flex items-center justify-center mb-4">
                    <Shield className="w-7 h-7 text-null-muted" />
                  </div>
                  <p className="font-sans font-semibold text-sm text-null-muted">Pipeline idle</p>
                  <p className="font-mono text-[10px] text-null-muted/60 mt-1 uppercase tracking-wider">
                    Select a resource and click Request Access
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {/* Resource being requested */}
                  {selectedResource && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-null-border">
                      <ChevronRight className="w-3.5 h-3.5 text-null-muted" />
                      <span className="font-mono text-xs text-null-muted">Verifying access to:</span>
                      <span className="font-sans text-sm font-semibold text-null-info">{selectedResource}</span>
                    </div>
                  )}

                  {/* Steps */}
                  {requestLoading && !result ? (
                    /* Loading animation — show steps advancing */
                    STEP_CONFIG.map((_, i) => (
                      <PipelineStep
                        key={i}
                        stepIndex={i}
                        result={null}
                        visible={true}
                      />
                    ))
                  ) : (
                    STEP_CONFIG.map((cfg, i) => {
                      const stepResult = result?.steps?.[i] || null;
                      return (
                        <PipelineStep
                          key={cfg.key}
                          stepIndex={i}
                          result={stepResult}
                          visible={i < visibleSteps}
                        />
                      );
                    })
                  )}

                  {/* Final result banner */}
                  {result && visibleSteps >= (result.steps?.length || 0) && (
                    <div
                      className={`mt-4 p-4 rounded border flex items-center gap-4 transition-all duration-500 ${
                        result.allowed
                          ? 'bg-null-signal-dim/20 border-null-signal/30'
                          : 'bg-null-deny-dim/20 border-null-deny/30'
                      }`}
                    >
                      {result.allowed ? (
                        <Unlock className="w-8 h-8 text-null-signal flex-shrink-0 animate-pulse" />
                      ) : (
                        <Lock className="w-8 h-8 text-null-deny flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-mono text-sm font-bold uppercase tracking-wider ${
                            result.allowed ? 'text-null-signal' : 'text-null-deny'
                          }`}
                        >
                          {result.allowed ? '✓ ACCESS GRANTED' : '✗ ACCESS DENIED'}
                        </div>
                        {result.allowed && (
                          <div className="mt-2 text-xs font-sans text-null-muted bg-null-bg/50 p-2 rounded border border-null-signal/10">
                            {redirecting
                              ? 'All 6 gates cleared. Routing you into the Nexus Academy portal...'
                              : result.resource_data?.payload}
                          </div>
                        )}
                        {result.allowed && redirecting && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-null-signal animate-bounce" style={{animationDelay:'0ms'}} />
                            <div className="w-1.5 h-1.5 rounded-full bg-null-signal animate-bounce" style={{animationDelay:'150ms'}} />
                            <div className="w-1.5 h-1.5 rounded-full bg-null-signal animate-bounce" style={{animationDelay:'300ms'}} />
                          </div>
                        )}
                        {!result.allowed && result.reason && (
                          <div className="mt-1 text-xs font-sans text-null-deny/80">
                            Reason: {result.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Zero Trust checklist legend */}
            {!result && (
              <div className="p-3 bg-null-bg border border-null-border rounded">
                <div className="text-[10px] font-mono uppercase tracking-wider text-null-muted mb-2">
                  Pipeline checks (all must pass)
                </div>
                <div className="flex flex-col gap-1">
                  {STEP_CONFIG.map((cfg, i) => {
                    const Icon = cfg.icon;
                    return (
                      <div key={cfg.key} className="flex items-center gap-2 text-xs font-sans text-null-muted">
                        <Icon className="w-3 h-3 flex-shrink-0 text-null-muted/60" />
                        <span className="font-mono text-[10px] text-null-muted/60 w-4">{i + 1}.</span>
                        {cfg.key}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </Layout>
  );
};

export default AccessRequest;
