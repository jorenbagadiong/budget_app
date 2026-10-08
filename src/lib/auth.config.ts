import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedRoutes = ['/dashboard', '/transactions', '/budgets', '/reports', '/settings'];
      const isProtected = protectedRoutes.some((route) => nextUrl.pathname.startsWith(route));

      if (isProtected) {
        if (isLoggedIn) return true;
        return false; // Automatically redirects to pages.signIn
      }
      return true;
    },
  },
  providers: [],
};
