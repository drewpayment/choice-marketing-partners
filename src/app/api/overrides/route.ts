import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ManagerEmployeeRepository } from '@/lib/repositories/ManagerEmployeeRepository'

const managerEmployeeRepository = new ManagerEmployeeRepository()

/**
 * GET /api/overrides - Get list of managers with employee counts
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const managers = await managerEmployeeRepository.getManagers()
    const stats = await managerEmployeeRepository.getAssignmentStats()

    return NextResponse.json({
      managers,
      stats
    })
  } catch (error) {
    console.error('Error fetching managers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch managers' },
      { status: 500 }
    )
  }
}
