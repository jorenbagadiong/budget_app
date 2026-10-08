import * as React from 'react';

export interface ProgressBarProps {
  percentage: number;
  label?: string;
  className?: string;
  showText?: boolean;
}

export function ProgressBar({
  percentage,
  label = 'Budget utilization',
  className = '',
  showText = true,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(percentage, 0), 100);

  // Status threshold: < 80% Healthy, 80-100% Warning, > 100% Danger/Over budget
  let statusColor = 'bg-emerald-500';
  let statusText = 'Healthy';
  if (percentage >= 100) {
    statusColor = 'bg-rose-500';
    statusText = 'Over budget';
  } else if (percentage >= 80) {
    statusColor = 'bg-amber-500';
    statusText = 'Near limit';
  }

  return (
    <div className={`w-full ${className}`}>
      {showText && (
        <div className="flex justify-between items-center text-xs mb-1.5 font-medium text-slate-600">
          <span>{label}</span>
          <span className="flex items-center gap-1.5">
            <span>{percentage.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-400">({statusText})</span>
          </span>
        </div>
      )}
      <div
        className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${percentage.toFixed(1)}% (${statusText})`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${statusColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
