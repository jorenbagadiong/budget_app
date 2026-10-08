import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// Robust Content Security Policy
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://lh3.googleusercontent.com https://avatars.githubusercontent.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://script.google.com https://accounts.google.com https://oauth2.googleapis.com;
  frame-src 'self' https://accounts.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://accounts.google.com;
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: [
    '192.168.40.175',
    '192.168.40.175:3000',
    '192.168.40.175.nip.io',
    '192.168.40.175.nip.io:3000',
    'localhost:3000',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        'budget-app-one-livid.vercel.app',
        '*.vercel.app',
        '192.168.40.175:3000',
        '192.168.40.175',
        '192.168.40.175.nip.io:3000',
        '192.168.40.175.nip.io',
        'localhost:3000',
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: isDev ? '' : cspHeader, // Relax in dev mode to allow HMR & fast reload
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ].filter(h => h.value !== ''),
      },
    ];
  },
};

export default nextConfig;
