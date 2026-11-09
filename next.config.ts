import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Force deploy trigger: Fix Vercel webhook
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  outputFileTracingIncludes: {
    '/api/arra-cronos/pine': ['./src/assets/ARRA_Cronos.pine'],
  },
};

export default withNextIntl(nextConfig);
