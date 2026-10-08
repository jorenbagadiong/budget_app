import Link from 'next/link';
import { ShieldCheck, Lock, EyeOff, Trash2, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Application</span>
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Privacy Policy & Data Security
        </h1>
        <p className="text-sm text-slate-500">
          Last Updated: October 2026 • Privacy by Design Specification
        </p>
      </div>

      <Card className="space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            1. Core Privacy Philosophy
          </h2>
          <p>
            PesoBudget treats financial information as strictly sensitive, confidential data. We adhere
            to privacy-by-design principles: we collect only the minimal data necessary to provide personal
            budgeting services, we never sell or share user data with third-party advertisers or data brokers,
            and we never inspect your personal email or Google Drive contents.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            2. Information We Collect and Why
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Google Account Identifier (<code>sub</code> claim):</strong> An immutable string provided
              by Google OAuth used as your unique user partition key. This guarantees that your data is strictly isolated
              from all other users.
            </li>
            <li>
              <strong>Email and Display Name:</strong> Used solely to identify your session and display your profile greeting.
            </li>
            <li>
              <strong>Financial Ledger Data:</strong> Accounts, categories, transactions, budgets, and recurring rules
              explicitly created by you.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-slate-600" />
            3. OAuth Scopes & Zero Access Policy
          </h2>
          <p>
            We request the absolute minimum Google OAuth scopes required for authentication:
            <code>openid</code>, <code>email</code>, and <code>profile</code>. We <strong>do not</strong> request access
            to Google Drive, Gmail, Calendar, Contacts, or file systems.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" />
            4. Right to Erasure / Data Deletion
          </h2>
          <p>
            Users maintain full ownership over their data. You may permanently purge all your financial accounts,
            transactions, budgets, and user profiles at any time via the{' '}
            <Link href="/settings" className="text-emerald-600 font-semibold underline">
              Settings & Privacy Page
            </Link>
            . Upon confirmation, the application executes a cascade deletion across all Google Sheets storage tabs.
          </p>
        </section>

        <section className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
          <h3 className="font-bold text-sm text-amber-950">Notice Regarding Legal Review</h3>
          <p>
            This document outlines the technical architecture and privacy-by-design guarantees of the application.
            For commercial or enterprise deployments, formal compliance with regional regulations (such as GDPR,
            the Philippine Data Privacy Act of 2012 / RA 10173, or CCPA) requires organizational and legal counsel review.
          </p>
        </section>
      </Card>
    </div>
  );
}
