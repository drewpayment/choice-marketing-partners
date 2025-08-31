import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getAccessibleAgents } from '@/lib/auth/payroll-access'
import { getEmployeeContext } from '@/lib/auth/payroll-access'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user context
    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const agents = await getAccessibleAgents(userContext)
    
    return NextResponse.json(agents)
  } catch (error) {
    console.error('Error fetching accessible agents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
