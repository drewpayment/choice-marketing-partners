import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ImpersonationRepository } from '@/lib/repositories/ImpersonationRepository'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // The actor is the real authenticated user regardless of impersonation
  // state — use session.impersonation.actorUserId if present, otherwise
  // session.user.id is the real user (no impersonation active).
  const actorUserId = session.impersonation?.actorUserId ?? session.user.id

  const repo = new ImpersonationRepository()
  await repo.stopImpersonation(actorUserId, 'manual')

  return NextResponse.json({ ok: true })
}
