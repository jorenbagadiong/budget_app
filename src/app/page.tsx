import Link from 'next/link';
import {
  PiggyBank,
  ShieldCheck,
  Lock,
  Layers,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { auth } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero-Trust Architecture • Strict Google `sub` Claim Isolation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto leading-tight">
            Control your money with <span className="text-emerald-600">complete precision</span> and privacy.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Production-quality personal budget management powered by Next.js, Google OAuth,
            Google Apps Script, and Google Sheets persistence. All computations use integer minor units.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In with Google</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <Link
              href="/privacy"
              className="w-full sm:w-auto px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center"
            >
              Privacy & Security Architecture
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Designed for Security, Privacy, and Precision
            </h2>
            <p className="text-sm text-slate-500">
              Every feature is built following zero-trust principles and robust financial engineering.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">Integer Minor Units</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Zero binary floating-point rounding errors. Money is computed in exact integer centavos (₱100.50 = 10050 minor units).
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">Immutable User Isolation</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your data is strictly bound to your permanent Google <code>sub</code> claim. Server-side verification guarantees no user can ever access another’s ledger.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">Google Sheets Backend</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Persistent storage via a secured Google Apps Script API layer with CSV formula injection defense and concurrency locking.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
