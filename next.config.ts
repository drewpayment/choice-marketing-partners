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

  // PostHog reverse proxy: the browser SDK posts to same-origin /ingest
  // (src/instrumentation-client.ts) and Vercel forwards it to PostHog US.
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ]
  },
  // Required by the PostHog proxy: its API paths use trailing slashes, and
  // Next's default redirect would strip them and break ingestion. This turns
  // the redirect off app-wide, so redirects() below restores it for every
  // path except /ingest.
  skipTrailingSlashRedirect: true,

  // Redirect optimization
  async redirects() {
    return [
      // Next's built-in trailing-slash redirect (/foo/ -> /foo, 308), minus
      // the PostHog proxy and .well-known. See skipTrailingSlashRedirect.
      {
        source: '/:path((?!ingest(?:/|$)|\\.well-known(?:/|$)).+)/',
        destination: '/:path',
        permanent: true,
      },
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
