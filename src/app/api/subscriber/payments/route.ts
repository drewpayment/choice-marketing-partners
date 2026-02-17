import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { BillingRepository } from '@/lib/repositories/BillingRepository'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isSubscriber || !session.user.subscriberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const repo = new BillingRepository()

  try {
    const payments = await repo.getPaymentHistory(
      session.user.subscriberId,
      {
        isAdmin: session.user.isAdmin,
        subscriberId: session.user.subscriberId,
      }
    )

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payment history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}
