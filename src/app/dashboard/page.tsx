'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { PeriodSelector } from '@/components/layout/period-selector';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { formatCurrency } from '@/lib/math/money';
import type { DashboardSummary, Account, Category } from '@/types';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const currentDate = new Date();
  const [year, setYear] = React.useState(currentDate.getFullYear());
  const [month, setMonth] = React.useState(currentDate.getMonth() + 1);

  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [isTxModalOpen, setIsTxModalOpen] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    setError(null);
    try {
      const [dashRes, accRes, catRes] = await Promise.all([
        fetch(`/api/dashboard?year=${year}&month=${month}`),
        fetch('/api/accounts'),
        fetch('/api/categories'),
      ]);

      const [dashData, accData, catData] = await Promise.all([
        dashRes.json(),
        accRes.json(),
        catRes.json(),
      ]);

      if (!dashRes.ok || !dashData.success) throw new Error(dashData.error?.message || 'Failed to load dashboard');
      if (!accRes.ok || !accData.success) throw new Error(accData.error?.message || 'Failed to load accounts');
      if (!catRes.ok || !catData.success) throw new Error(catData.error?.message || 'Failed to load categories');

      setSummary(dashData.data);
      setAccounts(accData.data);
      setCategories(catData.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  }, [year, month, status]);

  React.useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  if (status === 'loading' || (loading && !summary)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-10 bg-slate-200/70 rounded-lg w-64 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200/70 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-semibold text-rose-900">Failed to load dashboard</h3>
          <p className="text-sm text-rose-700">{error}</p>
          <Button variant="outline" onClick={() => fetchData()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const currency = summary?.currency || 'PHP';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with Title, Month Navigation, and Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, {session?.user?.name || 'Investor'}. Here is your financial snapshot.
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

          <Button onClick={() => setIsTxModalOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Transaction</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monthly Income
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary?.totalIncomeMinor || 0, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            <span>Earned during this period</span>
          </div>
        </Card>

        {/* Expenses Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary?.totalExpenseMinor || 0, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
            <span>{summary?.transactionCount || 0} transactions recorded</span>
          </div>
        </Card>

        {/* Net Savings Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Savings
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold mt-2 ${
              (summary?.netSavingsMinor || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {formatCurrency(summary?.netSavingsMinor || 0, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {(summary?.netSavingsMinor || 0) >= 0 ? 'Positive savings balance' : 'Expenses exceed income'}
          </div>
        </Card>

        {/* Budget Remaining Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Budget Remaining
            </span>
            <Badge
              variant={
                (summary?.budgetUtilizationPercent || 0) > 100
                  ? 'danger'
                  : (summary?.budgetUtilizationPercent || 0) >= 80
                  ? 'warning'
                  : 'healthy'
              }
            >
              {(summary?.budgetUtilizationPercent || 0).toFixed(0)}% Used
            </Badge>
          </div>
          <div
            className={`text-2xl font-bold mt-2 ${
              (summary?.remainingBudgetMinor || 0) < 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {formatCurrency(summary?.remainingBudgetMinor || 0, currency)}
          </div>
          <div className="mt-3">
            <ProgressBar
              percentage={summary?.budgetUtilizationPercent || 0}
              showText={false}
            />
          </div>
        </Card>
      </div>

      {/* Main Grid: Category Budget Breakdown and Spending Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Budget Progress (2 Cols) */}
        <Card className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Budget vs Actual Spending</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring expense limits by category
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Total Budget: {formatCurrency(summary?.totalBudgetMinor || 0, currency)}
            </span>
          </div>

          {summary?.categorySpendBreakdown && summary.categorySpendBreakdown.length > 0 ? (
            <div className="space-y-4">
              {summary.categorySpendBreakdown.map((cat) => (
                <div key={cat.categoryId} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        {cat.categoryName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(cat.spentMinor, currency)}
                      </span>
                      {cat.budgetMinor > 0 && (
                        <span className="text-xs text-slate-400">
                          / {formatCurrency(cat.budgetMinor, currency)}
                        </span>
                      )}
                      {cat.isOverBudget && (
                        <Badge variant="danger">Over Limit</Badge>
                      )}
                    </div>
                  </div>

                  {cat.budgetMinor > 0 ? (
                    <ProgressBar
                      percentage={cat.utilizationPercent}
                      label="Utilization"
                    />
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      No budget limit set for this category
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p>No expense transactions recorded for this month.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setIsTxModalOpen(true)}
              >
                Record First Expense
              </Button>
            </div>
          )}
        </Card>

        {/* 6-Month Spending Trends (1 Col) */}
        <Card className="space-y-5">
          <CardTitle>6-Month Financial Trend</CardTitle>
          <div className="space-y-3.5">
            {summary?.spendingTrends?.map((trend) => (
              <div key={trend.label} className="p-3 rounded-lg border border-slate-100 bg-slate-50/30">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                  <span>{trend.label}</span>
                  <span
                    className={
                      trend.savingsMinor >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }
                  >
                    Savings: {formatCurrency(trend.savingsMinor, currency)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Income:</span>
                    <span className="font-medium text-slate-800">
                      {formatCurrency(trend.incomeMinor, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses:</span>
                    <span className="font-medium text-slate-800">
                      {formatCurrency(trend.expenseMinor, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Transactions List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest activities in {new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/transactions')}>
            View All Transactions →
          </Button>
        </div>

        {summary?.recentTransactions && summary.recentTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {summary.recentTransactions.map((tx) => (
              <div
                key={tx.transactionId}
                className="py-3 flex items-center justify-between gap-4 text-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      tx.type === 'income'
                        ? 'bg-emerald-50 text-emerald-700'
                        : tx.type === 'expense'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '⇄'}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {tx.description || tx.categoryName || 'Transaction'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {tx.transactionDate} • {tx.accountName}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-semibold ${
                      tx.type === 'income'
                        ? 'text-emerald-600'
                        : tx.type === 'expense'
                        ? 'text-slate-900'
                        : 'text-blue-600'
                    }`}
                  >
                    {tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : ''}
                    {formatCurrency(tx.amountMinor, currency)}
                  </div>
                  <div className="text-[11px] text-slate-400">{tx.categoryName}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No transactions found for this month.
          </div>
        )}
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSaved={fetchData}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}
