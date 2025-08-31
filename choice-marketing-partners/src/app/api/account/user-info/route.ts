import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return user information
    const userInfo = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      employeeId: session.user.employeeId,
      isAdmin: session.user.isAdmin,
      isManager: session.user.isManager,
      isActive: session.user.isActive,
      sessionExpiry: session.expires,
      roles: {
        admin: session.user.isAdmin,
        manager: session.user.isManager,
        employee: true // All users are employees
      },
      permissions: {
        canViewPayroll: true,
        canViewDocuments: true,
        canManageTeam: session.user.isManager || session.user.isAdmin,
        canManageUsers: session.user.isAdmin,
        canAccessReports: session.user.isManager || session.user.isAdmin,
        canModifySettings: session.user.isAdmin
      }
    }

    return NextResponse.json(userInfo)
  } catch (error) {
    console.error('Error in user info API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
