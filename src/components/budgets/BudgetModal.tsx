'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toMinorUnits, fromMinorUnits } from '@/lib/math/money';
import type { Category, Budget } from '@/types';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  year: number;
  month: number;
  budgetToEdit?: Budget | null;
}

export function BudgetModal({
  isOpen,
  onClose,
  onSaved,
  categories,
  year,
  month,
  budgetToEdit,
}: BudgetModalProps) {
  const [categoryId, setCategoryId] = React.useState('');
  const [amountStr, setAmountStr] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (budgetToEdit) {
      setCategoryId(budgetToEdit.categoryId || '');
      setAmountStr(String(fromMinorUnits(budgetToEdit.amountMinor)));
    } else {
      const expenseCats = categories.filter((c) => c.type === 'expense');
      setCategoryId(expenseCats[0]?.categoryId || '');
      setAmountStr('');
    }
    setError(null);
  }, [budgetToEdit, categories, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountMinor = toMinorUnits(amountStr);
    if (amountMinor < 0) {
      setError('Budget cannot be negative.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        period: 'monthly',
        year,
        month,
        categoryId,
        amountMinor,
        currency: 'PHP',
      };

      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save budget.');
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={budgetToEdit ? 'Edit Category Budget' : 'Set Category Budget'}
      description={`Monthly limit for ${new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <Select
          label="Expense Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          {expenseCategories.map((cat) => (
            <option key={cat.categoryId} value={cat.categoryId}>
              {cat.name}
            </option>
          ))}
        </Select>

        <Input
          label="Budget Limit (₱)"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Save Budget
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
