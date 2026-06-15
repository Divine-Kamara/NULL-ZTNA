import React from 'react';

const Card = ({
  title,
  subtitle,
  children,
  className = '',
  headerAction
}) => {
  return (
    <div className={`bg-null-surface border border-null-border rounded p-6 shadow-sm ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-null-border">
          <div>
            {title && (
              <h3 className="font-sans text-lg font-semibold text-null-text tracking-wide">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="font-mono text-xs text-null-muted uppercase tracking-wider mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export default Card;
