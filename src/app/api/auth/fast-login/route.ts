import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get('account') === 'userB' ? 'userB' : 'userA';

  try {
    await signIn('dev-login', {
      account,
      redirectTo: '/dashboard',
    });
  } catch (error: any) {
    // Next.js redirection throws NEXT_REDIRECT which must be re-thrown
    if (
      error?.digest?.startsWith('NEXT_REDIRECT') ||
      error?.message?.includes('NEXT_REDIRECT')
    ) {
      throw error;
    }
    console.error('Fast login error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error?.message || 'LoginFailed')}`, request.url));
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
