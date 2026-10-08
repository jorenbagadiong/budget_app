'use client';

import * as React from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  Wallet,
  Globe,
  Trash2,
  Plus,
  ShieldAlert,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { formatCurrency, toMinorUnits } from '@/lib/math/money';
import type { Account, User } from '@/types';

export default function SettingsPage() {
  const { data: session, status } = useSession();

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [userProfile, setUserProfile] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  // New Account Dialog State
  const [isAddAccountOpen, setIsAddAccountOpen] = React.useState(false);
  const [accountName, setAccountName] = React.useState('');
  const [accountType, setAccountType] = React.useState<'cash' | 'bank' | 'ewallet' | 'credit_card'>('bank');
  const [accountBalance, setAccountBalance] = React.useState('0');

  // Purge Data Modal State
  const [isPurgeModalOpen, setIsPurgeModalOpen] = React.useState(false);
  const [purgeConfirmation, setPurgeConfirmation] = React.useState('');
  const [isPurging, setIsPurging] = React.useState(false);
  const [purgeError, setPurgeError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    try {
      const [accRes, userRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/user/settings'),
      ]);
      const [accData, userData] = await Promise.all([accRes.json(), userRes.json()]);

      if (accData.success) setAccounts(accData.data);
      if (userData.success) setUserProfile(userData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [status]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountName,
          type: accountType,
          currency: userProfile?.currency || 'PHP',
          initialBalanceMinor: toMinorUnits(accountBalance),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Failed to add account');

      setIsAddAccountOpen(false);
      setAccountName('');
      setAccountBalance('0');
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating account');
    }
  };

  const handlePurgeData = async () => {
    setPurgeError(null);
    if (purgeConfirmation !== 'DELETE_ALL_MY_DATA') {
      setPurgeError('Please type DELETE_ALL_MY_DATA exactly as shown.');
      return;
    }

    setIsPurging(true);
    try {
      const res = await fetch('/api/user/delete-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: purgeConfirmation }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Purge failed');

      alert('All your data has been permanently deleted from Google Sheets.');
      signOut({ callbackUrl: '/' });
    } catch (err: unknown) {
      setPurgeError(err instanceof Error ? err.message : 'Failed to delete data');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Privacy</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your financial accounts, currency, and data privacy rights.
        </p>
      </div>

      {/* Financial Accounts Section */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <div>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Cash wallets, bank accounts, credit cards, and e-wallets (GCash, Maya)
              </CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsAddAccountOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </Button>
        </div>

        <div className="divide-y divide-slate-100">
          {accounts.map((acc) => (
            <div key={acc.accountId} className="py-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-semibold text-slate-900">{acc.name}</span>
                <span className="text-xs text-slate-400 capitalize block">{acc.type}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-900">
                  {formatCurrency(acc.currentBalanceMinor ?? acc.initialBalanceMinor, acc.currency)}
                </span>
                <span className="text-[11px] text-slate-400 block">Balance</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Currency & Localization Section */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <div>
            <CardTitle>Currency & Regional Settings</CardTitle>
            <CardDescription>
              Configured timezone and primary currency for ledger records
            </CardDescription>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Primary Currency
            </label>
            <div className="px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800">
              Philippine Peso (PHP ₱)
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Timezone
            </label>
            <div className="px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800">
              Asia/Manila (UTC+8)
            </div>
          </div>
        </div>
      </Card>

      {/* Privacy & Right to be Forgotten (GDPR / Data Deletion) */}
      <Card className="border-rose-200 bg-rose-50/20 space-y-4">
        <div className="flex items-center gap-2 text-rose-900">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <div>
            <CardTitle className="text-rose-900">Privacy & Right to Erasure</CardTitle>
            <CardDescription className="text-rose-700/80">
              Permanently delete all your financial data and spreadsheet rows.
            </CardDescription>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          In compliance with privacy-by-design standards, you have the right to request the complete
          and irreversible erasure of all accounts, transaction ledgers, budget plans, and user records
          associated with your Google identifier across all Google Sheets storage tabs.
        </p>

        <Button
          variant="danger"
          size="sm"
          onClick={() => setIsPurgeModalOpen(true)}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Permanently Delete All My Data</span>
        </Button>
      </Card>

      {/* Add Account Modal */}
      <Dialog
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        title="Add Financial Account"
        description="Add a new wallet or account to record balances and transfers."
      >
        <form onSubmit={handleAddAccount} className="space-y-4">
          <Input
            label="Account Name"
            placeholder="e.g. BDO Savings, GCash, Metrobank"
            required
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />

          <Select
            label="Account Type"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as any)}
          >
            <option value="cash">Cash Wallet</option>
            <option value="bank">Bank Account</option>
            <option value="ewallet">E-Wallet (GCash / Maya)</option>
            <option value="credit_card">Credit Card</option>
          </Select>

          <Input
            label="Initial Balance (₱)"
            type="number"
            step="0.01"
            value={accountBalance}
            onChange={(e) => setAccountBalance(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddAccountOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Account</Button>
          </div>
        </form>
      </Dialog>

      {/* Data Purge Confirmation Modal */}
      <Dialog
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        title="Confirm Irreversible Data Deletion"
        description="This action cannot be undone. All your financial transactions, accounts, and budgets will be purged from Google Sheets."
      >
        <div className="space-y-4">
          {purgeError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
              {purgeError}
            </div>
          )}

          <p className="text-sm text-slate-700">
            To confirm data deletion, type <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-rose-600 font-semibold">DELETE_ALL_MY_DATA</code> below:
          </p>

          <Input
            value={purgeConfirmation}
            onChange={(e) => setPurgeConfirmation(e.target.value)}
            placeholder="DELETE_ALL_MY_DATA"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsPurgeModalOpen(false)} disabled={isPurging}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handlePurgeData} isLoading={isPurging}>
              Permanently Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
