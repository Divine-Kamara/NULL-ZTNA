import React from 'react';

const FormField = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  error = '',
  mono = false,
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full text-left ${className}`}>
      {label && (
        <label htmlFor={id} className="font-sans text-sm font-medium text-null-text tracking-wide">
          {label} {required && <span className="text-null-deny">*</span>}
        </label>
      )}
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`bg-null-surface border ${
          error ? 'border-null-deny focus:ring-null-deny/20' : 'border-null-border focus:border-null-signal focus:ring-null-signal/15'
        } rounded px-3 py-2 text-sm text-null-text placeholder-null-muted focus:outline-none focus:ring-4 transition-all ${
          mono ? 'font-mono' : 'font-sans'
        } disabled:opacity-50`}
        {...props}
      />
      {error && (
        <span className="font-sans text-xs text-null-deny mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
};

export default FormField;
