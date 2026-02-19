import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { FeatureFlagRepository } from '@/lib/repositories/FeatureFlagRepository'

export async function PATCH(
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
  const repo = new FeatureFlagRepository()
  await repo.updateFlag(flagId, body)
  const flag = await repo.getFlag(flagId)
  return NextResponse.json(flag)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const flagId = parseInt(id)
  if (isNaN(flagId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const repo = new FeatureFlagRepository()
  await repo.deleteFlag(flagId)
  return new NextResponse(null, { status: 204 })
}
