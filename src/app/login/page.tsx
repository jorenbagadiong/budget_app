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
  UserCheck,
  Sparkles,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loginWithGoogle, loginWithDevAccount, isGoogleConfigured } from './actions';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [loadingGoogle, setLoadingGoogle] = React.useState(false);
  const [loadingUserA, setLoadingUserA] = React.useState(false);
  const [loadingUserB, setLoadingUserB] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [googleReady, setGoogleReady] = React.useState<boolean | null>(null);
  const [showGoogleGuide, setShowGoogleGuide] = React.useState(false);
  const [isIpAddress, setIsIpAddress] = React.useState(false);
  const [currentHostname, setCurrentHostname] = React.useState('');

  React.useEffect(() => {
    isGoogleConfigured().then((ready) => {
      setGoogleReady(ready);
    });
    if (typeof window !== 'undefined') {
      setCurrentHostname(window.location.hostname);
      setIsIpAddress(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname));
    }
  }, []);

  React.useEffect(() => {
    if (errorParam) {
      if (errorParam === 'OAuthSignin' || errorParam === 'OAuthCallback') {
        setErrorMessage('Google OAuth error: Please verify your Google Client ID, Client Secret, and redirect URI in Google Cloud Console.');
        setShowGoogleGuide(true);
      } else if (errorParam === 'CredentialsSignin') {
        setErrorMessage('Unable to complete test login. Please try again.');
      } else {
        setErrorMessage(`Authentication notice: ${errorParam}`);
      }
    }
  }, [errorParam]);

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isIpAddress) {
      setErrorMessage(
        `Google OAuth restricts raw IP addresses (${currentHostname}). Google requires a domain name like "http://${currentHostname}.nip.io:3000" or "http://localhost:3000". Please use the 1-Click Fast Test Sign-In below or switch to nip.io.`
      );
      setShowGoogleGuide(true);
      return;
    }

    setLoadingGoogle(true);
    try {
      const result = await loginWithGoogle();
      if (result && result.error === 'GOOGLE_CREDENTIALS_MISSING') {
        setErrorMessage(result.message);
        setShowGoogleGuide(true);
        setLoadingGoogle(false);
      }
    } catch (err: any) {
      if (!err?.message?.includes('NEXT_REDIRECT')) {
        setErrorMessage(err?.message || 'Google sign in encountered an issue.');
        setShowGoogleGuide(true);
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
        {/* LAN / Mobile Notice */}
        {isIpAddress && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Mobile / LAN Access Detected ({currentHostname})</span>
            </div>
            <p className="leading-relaxed">
              Google OAuth blocks raw IP addresses. To test immediately on this device, click the <strong>&quot;Sign in as User A&quot;</strong> button below (works 100% instantly).
            </p>
            <p className="text-[11px] text-blue-700">
              To use real Google Sign-In on this device, visit:{' '}
              <a
                href={`http://${currentHostname}.nip.io:3000/login`}
                className="font-mono underline font-bold"
              >
                http://{currentHostname}.nip.io:3000
              </a>
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-950">Google Authorization Notice</div>
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Google Cloud Setup Instructions Accordion/Box */}
        {showGoogleGuide && (
          <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Fixing Google &quot;Access blocked: Authorization Error&quot;</span>
            </div>
            <p className="text-blue-800 leading-relaxed">
              Google blocks authentication if real OAuth credentials are not registered in Google Cloud Console. To fix this:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-blue-900">
              <li>
                Open{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  Google Cloud Console &gt; Credentials
                </a>
              </li>
              <li>Create or edit an <strong>OAuth 2.0 Client ID</strong> (Web Application).</li>
              <li>
                Under <strong>Authorized redirect URIs</strong>, add exact URL:
                <div className="font-mono bg-blue-100/80 px-2 py-0.5 rounded mt-0.5 text-blue-950 select-all">
                  http://localhost:3000/api/auth/callback/google
                </div>
              </li>
              <li>Under <strong>OAuth consent screen &gt; Test users</strong>, add your personal Gmail address.</li>
              <li>
                Save your Client ID &amp; Secret into <code className="font-mono">.env.local</code>.
              </li>
            </ol>
            <p className="text-blue-800 pt-1 font-medium">
              👉 Or use the <strong>1-Click Fast Test Sign-In</strong> below to test the full application immediately!
            </p>
          </div>
        )}

        {/* Authentication Card */}
        <Card className="space-y-6 p-8">
          {/* 1-Click Fast Test Sign-In Section (Placed on top for zero friction) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                1-Click Fast Test Sign-In
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200/60">
                Works Offline / Instantly
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href="/api/auth/fast-login?account=userA"
                className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors text-center cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sign in as User A</span>
              </a>

              <a
                href="/api/auth/fast-login?account=userB"
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors text-center cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Sign in as User B</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              Provides two isolated test accounts with distinct Google <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">sub</code> claims to test multi-tenant data isolation.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold">Or use Google OAuth</span>
            </div>
          </div>

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

            {googleReady === false && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg text-center leading-relaxed">
                Notice: Real Google credentials are not set in <code className="font-mono">.env.local</code> yet. Clicking this requires Google Cloud configuration.
              </p>
            )}
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
