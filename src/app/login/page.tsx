'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  PiggyBank,
  CheckCircle,
  EyeOff,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loginWithGoogle, loginWithDevAccount } from './actions';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [loadingGoogle, setLoadingGoogle] = React.useState(false);
  const [loadingUserA, setLoadingUserA] = React.useState(false);
  const [loadingUserB, setLoadingUserB] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (errorParam) {
      if (errorParam === 'OAuthSignin' || errorParam === 'OAuthCallback') {
        setErrorMessage('Google OAuth error: Please verify your Google Client ID and Secret in .env.local.');
      } else if (errorParam === 'CredentialsSignin') {
        setErrorMessage('Unable to complete test login. Please try again.');
      } else {
        setErrorMessage(`Authentication notice: ${errorParam}`);
      }
    }
  }, [errorParam]);

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingGoogle(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (!err?.message?.includes('NEXT_REDIRECT')) {
        setErrorMessage(err?.message || 'Google sign in encountered an issue.');
        setLoadingGoogle(false);
      }
    }
  };

  const handleDevSubmit = async (account: 'userA' | 'userB') => {
    if (account === 'userA') setLoadingUserA(true);
    if (account === 'userB') setLoadingUserB(true);
    setErrorMessage(null);

    try {
      await loginWithDevAccount(account);
    } catch (err: any) {
      if (!err?.message?.includes('NEXT_REDIRECT')) {
        // If server action had an issue, fallback directly to the fast-login route
        window.location.href = `/api/auth/fast-login?account=${account}`;
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-emerald-500/20">
            <PiggyBank className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sign in to PesoBudget
          </h1>
          <p className="text-sm text-slate-500">
            Production-quality personal budget & finance management
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Authentication Card */}
        <Card className="space-y-6 p-8">
          {/* Google OAuth Section */}
          <div className="space-y-3">
            <form onSubmit={handleGoogleSubmit}>
              <Button
                type="submit"
                isLoading={loadingGoogle}
                variant="outline"
                className="w-full py-2.5 font-medium border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-3 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </Button>
            </form>
          </div>

          {/* Development / Multi-Tenant Fast Login */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                1-Click Fast Test Sign-In
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200/60">
                Instant Access
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDevSubmit('userA')}
                disabled={loadingUserA || loadingUserB}
                className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{loadingUserA ? 'Signing in...' : 'Sign in as User A'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDevSubmit('userB')}
                disabled={loadingUserA || loadingUserB}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>{loadingUserB ? 'Signing in...' : 'Sign in as User B'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              Provides two isolated test accounts with distinct Google <code>sub</code> claims to test multi-tenant data isolation locally.
            </p>
          </div>
        </Card>

        {/* Transparent OAuth Scope Disclosures */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-xs text-slate-600 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Why Google OAuth? Scope Disclosures</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span>
                <strong>openid:</strong> Identifies your stable Google ID (<code>sub</code> claim) to isolate your budget data from all other users.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span>
                <strong>email & profile:</strong> Displays your name and avatar. We never store custom passwords.
              </span>
            </div>
            <div className="flex items-start gap-2 text-slate-500">
              <EyeOff className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span>
                <strong>Zero unnecessary permissions:</strong> We never request access to your Gmail, Google Drive, Calendar, or Contacts.
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-center gap-4 text-[11px] text-slate-400">
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
