import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Production optimizations
  output: 'standalone',
  poweredByHeader: false,
  
  // Ignore TypeScript and ESLint errors during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimize for better hydration handling and performance
  experimental: {
    // This helps with hydration issues
    optimizePackageImports: ['@next-auth/react', '@radix-ui/react-select', 'lucide-react'],
  },
  
  // External packages for server components
  serverExternalPackages: ['mysql2', 'kysely'],

  // Bundle analyzer and optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          maxSize: 244000, // 244kb chunks for better caching
        },
      };
    }
    return config;
  },

  // Production security and performance headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
      // Cache static assets
      {
        source: '/(_next/static|favicon.ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Redirect optimization
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/signin',
        permanent: true,
      },
      {
        source: '/manager',
        destination: '/manager/dashboard',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
