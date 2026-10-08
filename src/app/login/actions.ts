'use server';

import { signIn } from '@/lib/auth';

export async function isGoogleConfigured(): Promise<boolean> {
  const id = process.env.AUTH_GOOGLE_ID || '';
  return id.length > 20 && !id.includes('local-dev') && !id.includes('your-google');
}

export async function loginWithGoogle() {
  const id = process.env.AUTH_GOOGLE_ID || '';
  if (!id || id.includes('local-dev') || id.includes('your-google')) {
    return {
      error: 'GOOGLE_CREDENTIALS_MISSING',
      message: 'Google OAuth Client ID has not been configured in .env.local yet. Please add your real Google Cloud OAuth credentials, or use the 1-Click Fast Test Sign-In below.',
    };
  }

  await signIn('google', {
    redirectTo: '/dashboard',
  });
}

export async function loginWithDevAccount(account: 'userA' | 'userB') {
  await signIn('dev-login', {
    account,
    redirectTo: '/dashboard',
  });
}
