import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const Toast = ({
  message,
  type = 'info',
  onClose,
  duration = 4000
}) => {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  if (!message) return null;

  const types = {
    success: {
      bg: 'bg-null-surface border-null-signal/30',
      icon: CheckCircle,
      iconColor: 'text-null-signal'
    },
    error: {
      bg: 'bg-null-surface border-null-deny/30',
      icon: AlertCircle,
      iconColor: 'text-null-deny'
    },
    warning: {
      bg: 'bg-null-surface border-null-warn/30',
      icon: AlertCircle,
      iconColor: 'text-null-warn'
    },
    info: {
      bg: 'bg-null-surface border-null-info/30',
      icon: Info,
      iconColor: 'text-null-info'
    }
  };

  const currentType = types[type] || types.info;
  const Icon = currentType.icon;

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 max-w-sm p-4 border rounded shadow-md transition-all duration-300 animate-slide-in ${currentType.bg}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${currentType.iconColor}`} />
      <p className="font-sans text-sm text-null-text font-medium flex-grow">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-null-muted hover:text-null-text focus:outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Toast;
