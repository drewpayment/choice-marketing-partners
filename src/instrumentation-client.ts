import posthog from 'posthog-js'

// Next.js runs this file in the browser before the app hydrates, so PostHog
// is initialised once, early, with no provider component needed.
//
// No key -> no init. That keeps local dev and Vercel previews out of the
// production project unless NEXT_PUBLIC_POSTHOG_KEY is set for them.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

if (key) {
  posthog.init(key, {
    // Same-origin reverse proxy (see rewrites in next.config.ts), so ad
    // blockers don't drop events sent to *.posthog.com.
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    // Pins PostHog's recommended behaviour as of this date, including
    // pageview + pageleave capture on App Router client-side navigation.
    defaults: '2026-08-30',
    // Feature flags are DB-backed (src/lib/feature-flags.ts) since Feb 2026,
    // so skip PostHog flag evaluation; remote config still loads.
    advanced_disable_feature_flags: true,
    capture_exceptions: true,
    session_recording: {
      // Payroll app: pay amounts, SSNs and bank details are on screen, so
      // replays show layout and clicks but never inputs or text.
      maskAllInputs: true,
      maskTextSelector: '*',
    },
    debug: process.env.NODE_ENV === 'development',
  })
}
