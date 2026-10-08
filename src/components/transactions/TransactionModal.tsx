'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toMinorUnits, fromMinorUnits } from '@/lib/math/money';
import type { Account, Category, Transaction } from '@/types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  accounts: Account[];
  categories: Category[];
  transactionToEdit?: Transaction | null;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSaved,
  accounts,
  categories,
  transactionToEdit,
}: TransactionModalProps) {
  const [type, setType] = React.useState<'expense' | 'income' | 'transfer'>('expense');
  const [amountStr, setAmountStr] = React.useState('');
  const [accountId, setAccountId] = React.useState('');
  const [toAccountId, setToAccountId] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [transactionDate, setTransactionDate] = React.useState('');
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Initialize form state
  React.useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmountStr(String(fromMinorUnits(transactionToEdit.amountMinor)));
      setAccountId(transactionToEdit.accountId);
      setToAccountId(transactionToEdit.toAccountId || '');
      setCategoryId(transactionToEdit.categoryId || '');
      setDescription(transactionToEdit.description || '');
      setTransactionDate(transactionToEdit.transactionDate);
      setIsRecurring(transactionToEdit.isRecurring);
    } else {
      setType('expense');
      setAmountStr('');
      setAccountId(accounts[0]?.accountId || '');
      setToAccountId('');
      setCategoryId(categories.find((c) => c.type === 'expense')?.categoryId || '');
      setDescription('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
    }
    setError(null);
  }, [transactionToEdit, accounts, categories, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountMinor = toMinorUnits(amountStr);
    if (amountMinor <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!accountId) {
      setError('Please select an account.');
      return;
    }
    if (type === 'transfer' && !toAccountId) {
      setError('Please select a destination account for transfer.');
      return;
    }
    if (type === 'transfer' && accountId === toAccountId) {
      setError('Source and destination accounts cannot be the same.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type,
        amountMinor,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        categoryId: type !== 'transfer' ? categoryId : undefined,
        description,
        transactionDate,
        isRecurring,
        currency: 'PHP',
      };

      const url = transactionToEdit
        ? `/api/transactions/${transactionToEdit.transactionId}`
        : '/api/transactions';
      const method = transactionToEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save transaction.');
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={transactionToEdit ? 'Edit Transaction' : 'Record Transaction'}
      description="Track your money accurately using minor currency units."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Transaction Type Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['expense', 'income', 'transfer'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2 text-xs font-semibold rounded-lg capitalize border transition-all ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                      : t === 'income'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                      : 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <Input
            label="Amount (₱)"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Converted to integer minor units (centavos) to ensure financial accuracy.
          </p>
        </div>

        {/* Account Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label={type === 'transfer' ? 'From Account' : 'Account'}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            {accounts.map((acc) => (
              <option key={acc.accountId} value={acc.accountId}>
                {acc.name} ({acc.type})
              </option>
            ))}
          </Select>

          {type === 'transfer' ? (
            <Select
              label="To Account"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              required
            >
              <option value="">Select destination</option>
              {accounts.map((acc) => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </Select>
          ) : (
            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select Category</option>
              {filteredCategories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        {/* Transaction Date */}
        <Input
          label="Date"
          type="date"
          required
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
        />

        {/* Description / Notes */}
        <Input
          label="Description / Notes"
          type="text"
          maxLength={255}
          placeholder="e.g. Lunch at SM, Electric bill, Salary"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Recurring Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="isRecurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="isRecurring" className="text-sm text-slate-700 cursor-pointer">
            This is a recurring transaction
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            {transactionToEdit ? 'Save Changes' : 'Record Transaction'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
