'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import {
  Plus,
  Copy,
  Trash2,
  Edit2,
  PiggyBank,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { PeriodSelector } from '@/components/layout/period-selector';
import { BudgetModal } from '@/components/budgets/BudgetModal';
import { BudgetCopyModal } from '@/components/budgets/BudgetCopyModal';
import { formatCurrency, calculateUtilization, subtractMinor } from '@/lib/math/money';
import type { Budget, Category, Transaction } from '@/types';

export default function BudgetsPage() {
  const { status } = useSession();
  const currentDate = new Date();
  const [year, setYear] = React.useState(currentDate.getFullYear());
  const [month, setMonth] = React.useState(currentDate.getMonth() + 1);

  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modals
  const [isBudgetModalOpen, setIsBudgetModalOpen] = React.useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<Budget | null>(null);

  const fetchData = React.useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    setError(null);

    try {
      const monthStr = String(month).padStart(2, '0');
      const startPrefix = `${year}-${monthStr}`;

      const [budRes, catRes, txRes] = await Promise.all([
        fetch(`/api/budgets?year=${year}&month=${month}`),
        fetch('/api/categories'),
        fetch(`/api/transactions?startDate=${startPrefix}-01&endDate=${startPrefix}-31`),
      ]);

      const [budData, catData, txData] = await Promise.all([
        budRes.json(),
        catRes.json(),
        txRes.json(),
      ]);

      if (!budRes.ok || !budData.success) throw new Error(budData.error?.message || 'Failed to load budgets');
      if (!catRes.ok || !catData.success) throw new Error(catData.error?.message || 'Failed to load categories');
      if (!txRes.ok || !txData.success) throw new Error(txData.error?.message || 'Failed to load transactions');

      setBudgets(budData.data);
      setCategories(catData.data);
      setTransactions(txData.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching budgets');
    } finally {
      setLoading(false);
    }
  }, [year, month, status]);

  React.useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('Delete this budget limit?')) return;
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Failed to delete budget');
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Calculate actual spending per category for this month
  const categorySpendMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === 'expense' && tx.categoryId) {
      const current = categorySpendMap.get(tx.categoryId) || 0;
      categorySpendMap.set(tx.categoryId, current + tx.amountMinor);
    }
  }

  const categoryMap = new Map(categories.map((c) => [c.categoryId, c]));

  // Aggregated total budget vs total spending
  let totalBudgetMinor = 0;
  let totalSpentMinor = 0;

  for (const b of budgets) {
    totalBudgetMinor += b.amountMinor;
  }
  for (const amt of categorySpendMap.values()) {
    totalSpentMinor += amt;
  }

  const totalRemainingMinor = subtractMinor(totalBudgetMinor, totalSpentMinor);
  const totalUtilization = calculateUtilization(totalSpentMinor, totalBudgetMinor);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Budget Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Compare planned allocations against actual spending.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PeriodSelector
            year={year}
            month={month}
            onChange={(y, m) => {
              setYear(y);
              setMonth(m);
            }}
          />

          <Button
            variant="outline"
            onClick={() => setIsCopyModalOpen(true)}
            className="gap-2 shrink-0"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy Previous</span>
          </Button>

          <Button
            onClick={() => {
              setEditingBudget(null);
              setIsBudgetModalOpen(true);
            }}
            className="gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Set Budget</span>
          </Button>
        </div>
      </div>

      {/* Overview Stat Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Budget
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(totalBudgetMinor, 'PHP')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Allocated limit across all categories</span>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Actual Spending
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(totalSpentMinor, 'PHP')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {totalUtilization.toFixed(1)}% of total budget utilized
          </span>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Remaining Budget
          </span>
          <div
            className={`text-2xl font-bold mt-2 ${
              totalRemainingMinor < 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(totalRemainingMinor, 'PHP')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {totalRemainingMinor < 0 ? 'Overall limit exceeded' : 'Remaining capacity for this month'}
          </span>
        </Card>
      </div>

      {/* Category Budgets Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Category Budget Allocations</CardTitle>
          <span className="text-xs text-slate-500">{budgets.length} categories budgeted</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading budgets...
          </div>
        ) : budgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((b) => {
              const cat = categoryMap.get(b.categoryId);
              const spentMinor = categorySpendMap.get(b.categoryId) || 0;
              const remainingMinor = subtractMinor(b.amountMinor, spentMinor);
              const utilization = calculateUtilization(spentMinor, b.amountMinor);
              const isOver = spentMinor > b.amountMinor;

              return (
                <Card key={b.budgetId} className="flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat?.color || '#6B7280' }}
                        />
                        <h4 className="font-semibold text-slate-900">{cat?.name || 'Category'}</h4>
                      </div>

                      <Badge variant={isOver ? 'danger' : utilization >= 80 ? 'warning' : 'healthy'}>
                        {isOver ? 'Over Budget' : utilization >= 80 ? 'Near Limit' : 'Healthy'}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Budget:</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(b.amountMinor, b.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Spent:</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(spentMinor, b.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Remaining:</span>
                        <span
                          className={`font-semibold ${
                            remainingMinor < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(remainingMinor, b.currency)}
                        </span>
                      </div>
                    </div>

                    <ProgressBar percentage={utilization} label="Spent" />
                  </div>

                  <div className="flex justify-end gap-1 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setEditingBudget(b);
                        setIsBudgetModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit"
                      aria-label="Edit budget"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(b.budgetId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete"
                      aria-label="Delete budget"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-3">
            <PiggyBank className="w-12 h-12 mx-auto text-slate-300" />
            <h4 className="text-base font-semibold text-slate-700">No budget configured for this month</h4>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Set spending limits for your expense categories or copy last month's budget to stay in control.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsCopyModalOpen(true)}>
                Copy Previous Month
              </Button>
              <Button onClick={() => setIsBudgetModalOpen(true)}>Set First Budget</Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => {
          setIsBudgetModalOpen(false);
          setEditingBudget(null);
        }}
        onSaved={fetchData}
        categories={categories}
        year={year}
        month={month}
        budgetToEdit={editingBudget}
      />

      <BudgetCopyModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        onCopied={fetchData}
        targetYear={year}
        targetMonth={month}
      />
    </div>
  );
}
