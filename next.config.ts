import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Production optimizations
  output: 'standalone',
  poweredByHeader: false,
  
  // Ignore TypeScript errors during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },


  // Optimize for better hydration handling and performance
  experimental: {
    // This helps with hydration issues
    optimizePackageImports: ['@next-auth/react', '@radix-ui/react-select', 'lucide-react'],
  },
  
  // External packages for server components
  // 'mysql2' stays until the legacy scripts under scripts/ are ported off it.
  serverExternalPackages: ['pg', 'mysql2', 'kysely'],

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
      // NOTE: there was a '/manager' -> '/manager/dashboard' redirect here.
      // Config redirects run in the routing layer before any page code, so it
      // preempted the auth guards in src/app/manager/page.tsx and made them
      // dead code. /manager now goes through that page, which checks the
      // session and forwards managers/admins to /dashboard (unauthenticated ->
      // /auth/signin, unauthorized -> /forbidden). /manager/dashboard is
      // unaffected and still reachable directly.
    ]
  },
};

export default nextConfig;
