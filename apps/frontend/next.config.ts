import type { NextConfig } from "next";

const apiGatewayInternalUrl = process.env.API_GATEWAY_INTERNAL_URL || 'http://localhost:3000';
const isProduction = process.env.NODE_ENV === 'production';
const staticAssetsCacheControl = isProduction
  ? 'public, max-age=31536000, immutable'
  : 'no-store, must-revalidate';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    // Cache de imagens externas por 24 horas (86400 segundos)
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3002',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3002',
        pathname: '/uploads/**',
      },
    ],
  },
  // Headers de cache para assets estáticos
  async headers() {
    return [
      {
        // Assets estáticos em /public (imagens, fontes, ícones)
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|woff|woff2|ttf|otf)',
        headers: [
          {
            key: 'Cache-Control',
            value: staticAssetsCacheControl,
          },
        ],
      },
      {
        // JavaScript e CSS (já têm hash no nome)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: staticAssetsCacheControl,
          },
        ],
      },
    ];
  },
  async rewrites() {
    const backendBaseUrl = normalizeBaseUrl(apiGatewayInternalUrl);

    return [
      {
        source: '/uploads/:path*',
        destination: `${backendBaseUrl}/uploads/:path*`,
      },
      {
        source: '/api/users/heartbeat',
        destination: `${backendBaseUrl}/users/heartbeat`,
      },
      {
        source: '/api/users/online-status',
        destination: `${backendBaseUrl}/users/online-status`,
      },
      {
        source: '/api/:path*',
        destination: `${backendBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
