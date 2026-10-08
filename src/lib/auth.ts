import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { getStorage } from '@/lib/db';
import { authConfig } from '@/lib/auth.config';

const isDev = process.env.NODE_ENV !== 'production' || process.env.USE_MOCK_STORAGE === 'true';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'select_account',
        },
      },
    }),
    ...(isDev
      ? [
          Credentials({
            id: 'dev-login',
            name: 'Development Fast Login',
            credentials: {
              account: { label: 'Select Test Account', type: 'text' },
            },
            async authorize(credentials) {
              const account = credentials?.account || 'userA';
              if (account === 'userB') {
                return {
                  id: 'google-sub-test-user-b-987654321',
                  email: 'alice.tester@gmail.com',
                  name: 'Alice Tester (User B)',
                };
              }
              return {
                id: 'google-sub-test-user-a-123456789',
                email: 'john.doe@gmail.com',
                name: 'John Doe (User A)',
              };
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email || '';
        token.name = user.name || '';
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.sub) {
        session.user.id = token.sub;
        session.user.email = (token.email as string) || '';
        session.user.name = (token.name as string) || '';

        try {
          const storage = getStorage();
          await storage.getOrCreateUser(token.sub, session.user.email, session.user.name);
        } catch (e) {
          console.error('Failed to sync user to storage:', e);
        }
      }
      return session;
    },
  },
});

export async function requireAuthUser(): Promise<{ userId: string; email: string; name: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED');
  }
  return {
    userId: session.user.id,
    email: session.user.email || '',
    name: session.user.name || '',
  };
}
