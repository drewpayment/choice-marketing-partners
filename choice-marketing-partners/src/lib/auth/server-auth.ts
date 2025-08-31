import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { validatePageAccess } from './access-control'

/**
 * Server-side authentication and authorization helper for pages
 */
export async function requireAuth(
  requiredLevel: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'AUTHENTICATED' = 'AUTHENTICATED'
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }
  
  const userRole = {
    isAdmin: session.user.isAdmin,
    isManager: session.user.isManager,
    isAuthenticated: true
  }
  
  const hasAccess = validatePageAccess(requiredLevel, userRole)
  
  if (!hasAccess) {
    redirect('/forbidden')
  }
  
  return session
}

/**
 * Server-side helper to check authentication without redirecting
 */
export async function getAuthSession() {
  return await getServerSession(authOptions)
}

/**
 * Server-side helper to validate employee access
 */
export async function requireEmployeeAccess(targetEmployeeId?: number) {
  const session = await requireAuth('EMPLOYEE')
  
  // Additional validation for specific employee access could be added here
  // For now, we just validate the user has employee-level access
  if (targetEmployeeId) {
    // Future: validate user can access this specific employee's data
  }
  
  return session
}

/**
 * Server-side helper to validate admin access
 */
export async function requireAdminAccess() {
  return await requireAuth('ADMIN')
}

/**
 * Server-side helper to validate manager access
 */
export async function requireManagerAccess() {
  return await requireAuth('MANAGER')
}
