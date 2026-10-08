'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface PeriodSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export function PeriodSelector({ year, month, onChange }: PeriodSelectorProps) {
  const handlePrev = () => {
    if (month === 1) {
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  };

  const date = new Date(year, month - 1, 1);
  const formatted = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-xl p-1 shadow-sm">
      <button
        onClick={handlePrev}
        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-slate-800">
        <Calendar className="w-4 h-4 text-emerald-600" />
        <span>{formatted}</span>
      </div>

      <button
        onClick={handleNext}
        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Next month"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
