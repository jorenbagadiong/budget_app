'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

interface BudgetCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopied: () => void;
  targetYear: number;
  targetMonth: number;
}

export function BudgetCopyModal({
  isOpen,
  onClose,
  onCopied,
  targetYear,
  targetMonth,
}: BudgetCopyModalProps) {
  // Default to previous month
  const prevDate = new Date(targetYear, targetMonth - 2, 1);
  const [fromYear, setFromYear] = React.useState(prevDate.getFullYear());
  const [fromMonth, setFromMonth] = React.useState(prevDate.getMonth() + 1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/budgets/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromYear: Number(fromYear),
          fromMonth: Number(fromMonth),
          toYear: targetYear,
          toMonth: targetMonth,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to copy budgets.');
      }

      onCopied();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Copy Previous Month's Budget"
      description={`Duplicate category budgets into ${months[targetMonth - 1]} ${targetYear}`}
    >
      <form onSubmit={handleCopy} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Source Month"
            value={fromMonth}
            onChange={(e) => setFromMonth(Number(e.target.value))}
          >
            {months.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            label="Source Year"
            value={fromYear}
            onChange={(e) => setFromYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Copy Budgets
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
