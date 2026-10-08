'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Receipt,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { formatCurrency } from '@/lib/math/money';
import type { Transaction, Account, Category } from '@/types';

export default function TransactionsPage() {
  const { status } = useSession();

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterAccount, setFilterAccount] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('');
  const [filterType, setFilterType] = React.useState('');
  const [filterStartDate, setFilterStartDate] = React.useState('');
  const [filterEndDate, setFilterEndDate] = React.useState('');

  // Modals & Actions
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null);

  const fetchData = React.useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterAccount) params.set('accountId', filterAccount);
      if (filterCategory) params.set('categoryId', filterCategory);
      if (filterType) params.set('type', filterType);
      if (filterStartDate) params.set('startDate', filterStartDate);
      if (filterEndDate) params.set('endDate', filterEndDate);

      const [txRes, accRes, catRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        fetch('/api/accounts'),
        fetch('/api/categories'),
      ]);

      const [txData, accData, catData] = await Promise.all([
        txRes.json(),
        accRes.json(),
        catRes.json(),
      ]);

      if (!txRes.ok || !txData.success) throw new Error(txData.error?.message || 'Failed to load transactions');
      if (!accRes.ok || !accData.success) throw new Error(accData.error?.message || 'Failed to load accounts');
      if (!catRes.ok || !catData.success) throw new Error(catData.error?.message || 'Failed to load categories');

      setTransactions(txData.data);
      setAccounts(accData.data);
      setCategories(catData.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching transactions');
    } finally {
      setLoading(false);
    }
  }, [filterAccount, filterCategory, filterType, filterStartDate, filterEndDate, status]);

  React.useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Failed to delete');
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const accountMap = new Map(accounts.map((a) => [a.accountId, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.categoryId, c.name]));

  // Client-side search by description or category name
  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const desc = (tx.description || '').toLowerCase();
    const catName = (categoryMap.get(tx.categoryId) || '').toLowerCase();
    const accName = (accountMap.get(tx.accountId) || '').toLowerCase();
    return desc.includes(term) || catName.includes(term) || accName.includes(term);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Transaction History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, categorize, and track every peso spent or earned.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingTx(null);
            setIsModalOpen(true);
          }}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record Transaction</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="space-y-4 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search note, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Account Filter */}
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.accountId} value={a.accountId}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.categoryId} value={c.categoryId}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Date Range:</span>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded-md text-xs focus:ring-emerald-500 focus:outline-none"
          />
          <span>to</span>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded-md text-xs focus:ring-emerald-500 focus:outline-none"
          />
          {(filterAccount || filterCategory || filterType || filterStartDate || filterEndDate || searchTerm) && (
            <button
              onClick={() => {
                setFilterAccount('');
                setFilterCategory('');
                setFilterType('');
                setFilterStartDate('');
                setFilterEndDate('');
                setSearchTerm('');
              }}
              className="text-xs text-rose-600 hover:underline font-medium ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden p-0 border border-slate-200">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading transactions...
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.transactionId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {tx.transactionDate}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {tx.description || '—'}
                      {tx.isRecurring && (
                        <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200">
                          Recurring
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {tx.type === 'transfer' ? (
                        <Badge variant="info">Transfer</Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          {categoryMap.get(tx.categoryId) || 'Uncategorized'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {accountMap.get(tx.accountId) || 'Account'}
                      {tx.toAccountId && (
                        <span> → {accountMap.get(tx.toAccountId) || 'Account'}</span>
                      )}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-semibold whitespace-nowrap ${
                        tx.type === 'income'
                          ? 'text-emerald-600'
                          : tx.type === 'expense'
                          ? 'text-slate-900'
                          : 'text-blue-600'
                      }`}
                    >
                      {tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : ''}
                      {formatCurrency(tx.amountMinor, tx.currency || 'PHP')}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => {
                          setEditingTx(tx);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit"
                        aria-label="Edit transaction"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.transactionId)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No transactions match your search or filter</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing filters or recording a new transaction.</p>
          </div>
        )}
      </Card>

      {/* Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        onSaved={fetchData}
        accounts={accounts}
        categories={categories}
        transactionToEdit={editingTx}
      />
    </div>
  );
}
