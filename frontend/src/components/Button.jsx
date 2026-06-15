import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-150 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-null-signal/40 disabled:opacity-50 disabled:pointer-events-none font-sans';

  const variants = {
    primary: 'bg-null-signal text-null-bg hover:bg-null-signal/90 border border-null-signal/10',
    destructive: 'bg-transparent text-null-deny border border-null-deny hover:bg-null-deny-dim hover:text-null-deny',
    secondary: 'bg-transparent text-null-muted border border-null-border hover:border-null-muted hover:text-null-text',
    ghost: 'bg-transparent text-null-muted hover:text-null-text'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

export default Button;
