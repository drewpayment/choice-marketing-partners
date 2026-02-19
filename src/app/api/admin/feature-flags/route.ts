import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { FeatureFlagRepository } from '@/lib/repositories/FeatureFlagRepository'

function requireSuperAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const denied = requireSuperAdmin(session)
  if (denied) return denied

  const repo = new FeatureFlagRepository()
  const flags = await repo.listFlags()
  return NextResponse.json(flags)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const denied = requireSuperAdmin(session)
  if (denied) return denied

  const body = await request.json()
  const { name, description, is_enabled, rollout_percentage, environment } = body

  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    return NextResponse.json({ error: 'Invalid flag name (use lowercase letters, numbers, hyphens)' }, { status: 400 })
  }

  const repo = new FeatureFlagRepository()
  const id = await repo.createFlag({ name, description, is_enabled, rollout_percentage, environment })
  return NextResponse.json({ id }, { status: 201 })
}
