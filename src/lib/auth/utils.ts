import { getServerSession } from 'next-auth'
import { authOptions } from './config'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'

// Get server session with type safety
export async function getSession() {
  return await getServerSession(authOptions)
}

// Require authentication for server components
export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    redirect('/auth/signin')
  }
  return session
}

// Require admin role
export async function requireAdmin() {
  const session = await requireAuth()
  if (!session.user.isAdmin) {
    redirect('/unauthorized')
  }
  return session
}

// Require manager or admin role
export async function requireManagerOrAdmin() {
  const session = await requireAuth()
  if (!session.user.isAdmin && !session.user.isManager) {
    redirect('/unauthorized')
  }
  return session
}

// Require subscriber role
export async function requireSubscriber() {
  const session = await requireAuth()
  if (!session.user.isSubscriber) {
    redirect('/unauthorized')
  }
  return session
}

export function isSubscriber(session: Session | null): boolean {
  return session?.user?.isSubscriber === true
}

// Check if user has access to employee data
export function hasAccessToEmployee(session: Session | null, employeeId: number): boolean {
  if (!session) return false
  
  if (session.user.isAdmin) {
    return true // Admin has access to all employees
  }
  
  if (session.user.isManager) {
    // Manager access logic - would need to implement manager-employee relationships
    // For now, return true for managers
    return true
  }
  
  // Regular users can only access their own data
  return session.user.employeeId === employeeId
}

// Check if user has access to issue date data (Laravel equivalent of checkAccessToIssueDate)
export function hasAccessToIssueDate(session: Session | null, agentId: number, _issueDate?: string): boolean {
  if (!session) return false
  
  if (session.user.isAdmin) {
    return true // Admin has access to all data
  }
  
  if (session.user.isManager) {
    // Manager access would be determined by employee relationships
    // For now, return true for managers
    return true
  }
  
  // Regular users can only access their own paystub data
  return session.user.employeeId === agentId
}

// Role checking utilities
export function isAdmin(session: Session | null): boolean {
  return session?.user?.isAdmin === true
}

export function isManager(session: Session | null): boolean {
  return session?.user?.isManager === true
}

export function isActive(session: Session | null): boolean {
  return session?.user?.isActive === true
}
