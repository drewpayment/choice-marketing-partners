import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Optimize for better hydration handling
  experimental: {
    // This helps with hydration issues
    optimizePackageImports: ['@next-auth/react']
  },
  // Add headers to improve browser extension compatibility
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
