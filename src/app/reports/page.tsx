'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  PieChart,
  Calendar,
} from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { PeriodSelector } from '@/components/layout/period-selector';
import { formatCurrency } from '@/lib/math/money';

export default function ReportsPage() {
  const { status } = useSession();
  const currentDate = new Date();
  const [viewMode, setViewMode] = React.useState<'monthly' | 'yearly'>('monthly');
  const [year, setYear] = React.useState(currentDate.getFullYear());
  const [month, setMonth] = React.useState(currentDate.getMonth() + 1);

  const [reportData, setReportData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchReport = React.useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    setError(null);

    try {
      const url =
        viewMode === 'monthly'
          ? `/api/reports/monthly?year=${year}&month=${month}`
          : `/api/reports/yearly?year=${year}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to load report');
      }

      setReportData(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading report');
    } finally {
      setLoading(false);
    }
  }, [viewMode, year, month, status]);

  React.useEffect(() => {
    if (status === 'authenticated') {
      fetchReport();
    }
  }, [status, fetchReport]);

  const currency = reportData?.currency || 'PHP';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header and Period Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Financial Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            In-depth analysis of income, expenses, category distribution, and savings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'yearly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly
            </button>
          </div>

          {viewMode === 'monthly' ? (
            <PeriodSelector
              year={year}
              month={month}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
          ) : (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-emerald-500"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Generating financial report...
        </div>
      ) : error ? (
        <Card className="text-center p-8 text-rose-600">{error}</Card>
      ) : (
        <div className="space-y-8">
          {/* Totals Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Total Income</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {formatCurrency(reportData.totalIncomeMinor, currency)}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>Total Expenses</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {formatCurrency(reportData.totalExpenseMinor, currency)}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                <PiggyBank className="w-4 h-4 text-blue-600" />
                <span>Net Savings</span>
              </div>
              <div
                className={`text-2xl font-bold mt-2 ${
                  reportData.netSavingsMinor >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {formatCurrency(reportData.netSavingsMinor, currency)}
              </div>
            </Card>
          </div>

          {/* Yearly View Month-by-Month Trend or Monthly Breakdown */}
          {viewMode === 'yearly' && reportData.monthlyBreakdown && (
            <Card className="space-y-4">
              <CardTitle>Month-by-Month Financial Performance ({year})</CardTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4 text-right">Income</th>
                      <th className="py-3 px-4 text-right">Expenses</th>
                      <th className="py-3 px-4 text-right">Net Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.monthlyBreakdown.map((row: any) => (
                      <tr key={row.month} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-800">{row.label}</td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600">
                          {formatCurrency(row.incomeMinor, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          {formatCurrency(row.expenseMinor, currency)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold ${
                            row.savingsMinor >= 0 ? 'text-blue-600' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(row.savingsMinor, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Category Spending Breakdown */}
          <Card className="space-y-5">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-600" />
              <CardTitle>Spending by Category</CardTitle>
            </div>

            {((viewMode === 'monthly'
              ? reportData.categorySpendBreakdown
              : reportData.categoryBreakdown) || []).length > 0 ? (
              <div className="space-y-3">
                {((viewMode === 'monthly'
                  ? reportData.categorySpendBreakdown
                  : reportData.categoryBreakdown) || []).map((cat: any) => (
                  <div key={cat.categoryId} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-800">{cat.categoryName}</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(cat.spentMinor, currency)} ({cat.percentage}%)
                      </span>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(cat.percentage, 100)}%`,
                          backgroundColor: cat.color || '#10b981',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-sm text-slate-400">
                No spending data recorded for this period.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
