import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Allowlist of write endpoints permitted during impersonation. Keep this list
// minimal — every entry is a potential foot-gun.
const IMPERSONATION_ALLOWED_WRITES = [
  '/api/admin/impersonate/stop',
]

export function isImpersonationAllowedWrite(pathname: string): boolean {
  return IMPERSONATION_ALLOWED_WRITES.some(
    (allowed) => pathname === allowed || pathname.startsWith(allowed + '/')
  )
}

/**
 * Helper for API routes that want to short-circuit and log a blocked mutation
 * attempt. Returns null if no rejection, or a 403 NextResponse if blocked.
 * Logging is best-effort — failure to log does not change the outcome.
 */
export async function rejectIfImpersonating(
  request: Request,
  session: Session | null
): Promise<NextResponse | null> {
  if (!session?.impersonation) return null
  if (!MUTATING_METHODS.has(request.method)) return null

  const url = new URL(request.url)
  if (isImpersonationAllowedWrite(url.pathname)) return null

  // Best-effort log — never block the rejection on a logging failure.
  try {
    const { ImpersonationRepository } = await import(
      '@/lib/repositories/ImpersonationRepository'
    )
    const repo = new ImpersonationRepository()
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null
    await repo.logBlockedMutation({
      actorUserId: session.impersonation.actorUserId,
      targetUserId: session.impersonation.targetUserId,
      method: request.method,
      path: url.pathname,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? null,
    })
  } catch {
    // Swallow — logging is best-effort.
  }

  return NextResponse.json(
    {
      error: 'Impersonation sessions are read-only. Stop impersonating to make changes.',
    },
    { status: 403 }
  )
}
