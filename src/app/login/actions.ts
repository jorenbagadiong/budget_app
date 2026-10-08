'use server';

import { signIn } from '@/lib/auth';

export async function loginWithDevAccount(account: 'userA' | 'userB') {
  await signIn('dev-login', {
    account,
    redirectTo: '/dashboard',
  });
}

export async function loginWithGoogle() {
  await signIn('google', {
    redirectTo: '/dashboard',
  });
}
