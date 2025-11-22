import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const employeeRepository = new EmployeeRepository()

const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  limit: z.coerce.number().min(1).max(50).optional().default(10)
})

/**
 * GET /api/employees/search - Search employees for autocomplete
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const data = searchSchema.parse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit')
    })

    const employees = await employeeRepository.searchEmployees(data.q, data.limit)

    return NextResponse.json({ employees })
  } catch (error) {
    logger.error('Error searching employees:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search employees' },
      { status: 500 }
    )
  }
}
