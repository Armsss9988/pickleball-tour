import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ['@golab/contracts', '@golab/domain'],
  async headers() {
    const noStoreHeaders = [
      {
        key: 'Cache-Control',
        value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    ];

    return [
      {
        source: '/',
        headers: noStoreHeaders,
      },
      {
        source: '/login',
        headers: noStoreHeaders,
      },
      {
        source: '/admin',
        headers: noStoreHeaders,
      },
      {
        source: '/admin/:path*',
        headers: noStoreHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
