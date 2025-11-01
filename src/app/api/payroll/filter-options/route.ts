import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getAccessibleAgents, getAccessibleVendors, getEmployeeContext } from '@/lib/auth/payroll-access'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (!session.user.isAdmin && !session.user.isManager)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    // Get user context
    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const repository = new PayrollRepository()
    
    // Fetch filter options
    const [agents, vendors, issueDates] = await Promise.all([
      getAccessibleAgents(userContext),
      getAccessibleVendors(userContext),
      repository.getAvailableIssueDates(userContext)
    ])

    return NextResponse.json({
      employees: agents.map(agent => ({ id: agent.id, name: agent.name })),
      vendors: vendors.map(vendor => ({ id: vendor.id, name: vendor.name })),
      issueDates: issueDates
    })

  } catch (error) {
    console.error('Filter options API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    )
  }
}
