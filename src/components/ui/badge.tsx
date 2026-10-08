import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'healthy' | 'warning' | 'danger' | 'neutral' | 'info';
}

export function Badge({
  className = '',
  variant = 'neutral',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200/60',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
