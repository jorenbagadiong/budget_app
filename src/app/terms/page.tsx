import Link from 'next/link';
import { FileText, ArrowLeft, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Terms of Service</h1>
        <p className="text-sm text-slate-500">Effective Date: October 2026</p>
      </div>

      <Card className="space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By signing in and utilizing PesoBudget, you agree to these Terms of Service. If you do not
            agree, please refrain from using the application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Description of Service</h2>
          <p>
            PesoBudget is a personal budget planning and ledger tracking software application designed to assist
            individuals in managing expenses and budget allocations. Persisted financial records are stored
            securely in connected Google Sheets spreadsheets.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. User Responsibility & Financial Advice Disclaimer</h2>
          <p>
            PesoBudget is a calculation and tracking tool. It does not provide certified financial, investment,
            legal, or tax advice. Users are solely responsible for ensuring the accuracy of manually entered
            transactions and financial entries.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. User Account Security</h2>
          <p>
            Authentication is managed via Google OAuth. You are responsible for safeguarding access to your
            Google account. We do not store or manage passwords directly.
          </p>
        </section>

        <section className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
          <h3 className="font-bold text-slate-900">Organizational & Legal Advisory</h3>
          <p>
            These terms represent standard software usage guidelines. Deployments in commercial production environments
            should be reviewed by certified legal counsel to align with local consumer protection laws.
          </p>
        </section>
      </Card>
    </div>
  );
}
