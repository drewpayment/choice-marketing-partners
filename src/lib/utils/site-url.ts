/**
 * Resolve the site's canonical absolute URL across local, preview, and prod.
 *
 * Fallback chain (first match wins):
 *   1. NEXT_PUBLIC_SITE_URL                     — explicit canonical (e.g. custom domain)
 *   2. NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL — stable *.vercel.app prod URL
 *   3. NEXT_PUBLIC_VERCEL_URL                   — current deployment (preview)
 *   4. http://localhost:3000                    — dev default
 *
 * The `NEXT_PUBLIC_VERCEL_*` vars are populated by Vercel only when the
 * project has "Automatically expose System Environment Variables" enabled.
 *
 * Always returns a URL with a protocol prefix and no trailing slash.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3000'

  const withProtocol = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
  return withProtocol.replace(/\/$/, '')
}
