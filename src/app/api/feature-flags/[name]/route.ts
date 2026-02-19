import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { FeatureFlagRepository } from '@/lib/repositories/FeatureFlagRepository'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const session = await getServerSession(authOptions)

  try {
    const repo = new FeatureFlagRepository()
    const enabled = await repo.evaluateFlag(name, {
      userId: session?.user?.id ?? 'anonymous',
      isAdmin: session?.user?.isAdmin ?? false,
      isManager: session?.user?.isManager ?? false,
      isSubscriber: !!(session?.user?.subscriberId),
      subscriberId: session?.user?.subscriberId ?? null,
    })
    return NextResponse.json({ enabled })
  } catch {
    return NextResponse.json({ enabled: false })
  }
}
