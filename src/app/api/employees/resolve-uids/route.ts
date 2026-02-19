import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { logger } from '@/lib/utils/logger'

const employeeRepository = new EmployeeRepository()

/**
 * GET /api/employees/resolve-uids?uids=1,2,3
 * Returns a map of uid -> employee name. Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const raw = new URL(request.url).searchParams.get('uids') ?? ''
    const uids = raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))

    if (uids.length === 0) {
      return NextResponse.json({})
    }

    const names = await employeeRepository.getNamesByUserIds(uids)
    return NextResponse.json(names)
  } catch (error) {
    logger.error('Error resolving user uids:', error)
    return NextResponse.json({ error: 'Failed to resolve uids' }, { status: 500 })
  }
}
