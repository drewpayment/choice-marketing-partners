import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const employeeRepository = new EmployeeRepository()

const emailCheckSchema = z.object({
  email: z.string().email('Valid email is required'),
  excludeEmployeeId: z.number().optional()
})

/**
 * POST /api/employees/email-available - Check if email is available
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const data = emailCheckSchema.parse(body)

    const available = await employeeRepository.isEmailAvailable(
      data.email,
      data.excludeEmployeeId
    )

    return NextResponse.json({ available })
  } catch (error) {
    logger.error('Error checking email availability:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to check email availability' },
      { status: 500 }
    )
  }
}
