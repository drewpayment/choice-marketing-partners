import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { FeatureFlagRepository } from '@/lib/repositories/FeatureFlagRepository'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const flagId = parseInt(id)
  if (isNaN(flagId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await request.json()
  const { context_type, context_value, is_enabled } = body

  if (!['user', 'role', 'subscriber'].includes(context_type) || !context_value) {
    return NextResponse.json({ error: 'Invalid override data' }, { status: 400 })
  }

  const repo = new FeatureFlagRepository()
  await repo.upsertOverride(flagId, { context_type, context_value, is_enabled: !!is_enabled })
  const flag = await repo.getFlag(flagId)
  return NextResponse.json(flag)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const flagId = parseInt(id)
  const body = await request.json()
  const { override_id } = body

  if (isNaN(flagId) || !override_id) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const repo = new FeatureFlagRepository()
  await repo.deleteOverride(override_id)
  return new NextResponse(null, { status: 204 })
}
