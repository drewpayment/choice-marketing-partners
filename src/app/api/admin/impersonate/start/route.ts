import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ImpersonationRepository } from '@/lib/repositories/ImpersonationRepository'
import { buildImpersonationSnapshot } from '@/lib/auth/impersonation-snapshot'

const IMPERSONATION_TTL_MS = 30 * 60 * 1000

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (session.impersonation) {
    return NextResponse.json(
      { error: 'Already impersonating. Stop the current session first.' },
      { status: 409 }
    )
  }

  const flagOn = await isFeatureEnabled('admin-emulate-user', {
    userId: session.user.id,
    isAdmin: session.user.isAdmin,
    isManager: session.user.isManager,
    isSubscriber: session.user.isSubscriber,
    subscriberId: session.user.subscriberId,
  })
  if (!flagOn) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const targetUserId = body?.targetUserId
  if (typeof targetUserId !== 'string' || targetUserId.length === 0) {
    return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
  }

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: 'Cannot impersonate yourself' }, { status: 400 })
  }

  const expiresAt = Date.now() + IMPERSONATION_TTL_MS
  const built = await buildImpersonationSnapshot(targetUserId, expiresAt)
  if (!built) {
    return NextResponse.json({ error: 'Target user not found or inactive' }, { status: 404 })
  }

  if (built.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Cannot impersonate another SuperAdmin' },
      { status: 403 }
    )
  }

  const repo = new ImpersonationRepository()
  const existing = await repo.getActiveImpersonation(session.user.id)
  if (existing) {
    // A timed-out session is auto-cleared from the JWT on refresh, but nothing
    // writes the expiry back to the DB — so the audit row leaks as "open" and
    // would block every future session. If the open row is past its TTL, close
    // it as expired and proceed; only a genuinely live session returns 409.
    const expired =
      !existing.expires_at || existing.expires_at.getTime() < Date.now()
    if (expired) {
      await repo.stopImpersonation(session.user.id, 'expired')
    } else {
      return NextResponse.json(
        { error: 'An impersonation session is already open' },
        { status: 409 }
      )
    }
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  const userAgent = request.headers.get('user-agent') ?? null

  await repo.startImpersonation({
    actorUserId: session.user.id,
    targetUserId: built.targetUserId,
    actorEmployeeId: session.user.employeeId ?? null,
    targetEmployeeId: built.targetEmployeeId,
    expiresAt: new Date(expiresAt),
    ipAddress: ip,
    userAgent,
  })

  return NextResponse.json({
    snapshot: built.snapshot,
    expiresAt,
  })
}
