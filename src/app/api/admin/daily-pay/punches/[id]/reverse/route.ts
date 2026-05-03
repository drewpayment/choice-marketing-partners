import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { dailyPayRepository, PaystubAlreadyPaidError } from '@/lib/repositories/DailyPayRepository'
import { logger } from '@/lib/utils/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { id } = await params
    const punchId = parseInt(id, 10)
    if (Number.isNaN(punchId)) {
      return NextResponse.json({ error: 'Invalid punch id' }, { status: 400 })
    }
    const ctx = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager,
    )
    await dailyPayRepository.reversePunch(punchId, ctx)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof PaystubAlreadyPaidError) {
      return NextResponse.json({ error: 'paystub_already_paid' }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : 'Failed to reverse punch'
    logger.error('Error reversing punch:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
