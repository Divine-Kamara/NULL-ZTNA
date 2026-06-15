import React from 'react';

const Badge = ({
  status,
  className = ''
}) => {
  const normStatus = (status || '').toLowerCase();

  let styles = 'bg-null-border text-null-muted'; // fallback

  if (['trusted', 'active', 'granted', 'pass', 'success', 'enabled'].includes(normStatus)) {
    styles = 'bg-null-signal-dim text-null-signal border border-null-signal/10';
  } else if (['pending', 'warn', 'warning'].includes(normStatus)) {
    styles = 'bg-null-warn/10 text-null-warn border border-null-warn/10';
  } else if (['revoked', 'denied', 'fail', 'error', 'terminated', 'disabled'].includes(normStatus)) {
    styles = 'bg-null-deny-dim text-null-deny border border-null-deny/10';
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-medium uppercase tracking-wider ${styles} ${className}`}>
      {status}
    </span>
  );
};

export default Badge;
