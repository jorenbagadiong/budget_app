import type { Metadata } from 'next';
import './globals.css';
import { auth } from '@/lib/auth';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'PesoBudget — Personal Finance & Budget Management',
  description: 'Production-quality budget management built with Next.js, Google OAuth, and Google Sheets persistence.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="h-full">
      <body className="flex flex-col min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <Navbar user={session?.user} />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
