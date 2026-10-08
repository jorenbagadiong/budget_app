import Link from 'next/link';
import { ShieldCheck, Lock, Database } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>PesoBudget</strong> — Zero-Trust Personal Finance & Budget Management
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Isolated Google `sub` Storage
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              Google Sheets Persistence
            </span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
            <Link href="/settings" className="hover:text-slate-900 transition-colors">
              Data Deletion
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
