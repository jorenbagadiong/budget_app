import * as React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, id, children, ...props }, ref) => {
    const selectId = id || React.useId();

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-50 ${
            error ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400' : 'border-slate-300'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
