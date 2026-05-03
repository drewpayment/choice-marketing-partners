import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { dailyPayRepository } from '@/lib/repositories/DailyPayRepository'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const filtersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  vendorId: z.coerce.number().int().positive().optional(),
})

const upsertSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  vendorId: z.coerce.number().int().positive(),
  dailyRate: z.coerce.number().min(0).max(10000),
  isActive: z.boolean().optional().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const filters = filtersSchema.parse({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      vendorId: searchParams.get('vendorId') ?? undefined,
    })
    const ctx = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager,
    )
    const rows = await dailyPayRepository.listEnrollments(filters, ctx)
    return NextResponse.json({ enrollments: rows })
  } catch (error) {
    logger.error('Error listing enrollments:', error)
    return NextResponse.json({ error: 'Failed to list enrollments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const body = (await request.json()) as unknown
    const parsed = upsertSchema.parse(body)
    const ctx = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager,
    )
    const id = await dailyPayRepository.upsertEnrollment(parsed, ctx)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create enrollment'
    logger.error('Error creating enrollment:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
