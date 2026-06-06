import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ['@golab/contracts', '@golab/domain'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
    const apiPort = process.env.API_PORT || '3001';
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:${apiPort}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
