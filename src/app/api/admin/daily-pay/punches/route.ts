import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { dailyPayRepository } from '@/lib/repositories/DailyPayRepository'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const filtersSchema = z.object({
  status: z.enum(['pending', 'approved', 'declined', 'auto_rejected', 'all']).optional().default('pending'),
  vendorId: z.coerce.number().int().positive().optional(),
  employeeId: z.coerce.number().int().positive().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const filters = filtersSchema.parse({
      status: searchParams.get('status') ?? undefined,
      vendorId: searchParams.get('vendorId') ?? undefined,
      employeeId: searchParams.get('employeeId') ?? undefined,
      fromDate: searchParams.get('fromDate') ?? undefined,
      toDate: searchParams.get('toDate') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    const ctx = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager,
    )
    const result = await dailyPayRepository.getPunches(filters, ctx)
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error fetching punches:', error)
    return NextResponse.json({ error: 'Failed to fetch punches' }, { status: 500 })
  }
}
