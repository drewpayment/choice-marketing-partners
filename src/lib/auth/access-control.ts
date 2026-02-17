import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { logger } from '@/lib/utils/logger'

/**
 * Route access levels and their requirements
 */
export const ROUTE_ACCESS = {
  // Public routes (no auth required)
  PUBLIC: [],
  
  // Any authenticated user
  AUTHENTICATED: [
    '/dashboard',
    '/account',
    '/api/account'
  ],
  
  // Employee level or higher
  EMPLOYEE: [
    '/payroll',
    '/documents',
    '/api/payroll',
    '/api/documents'
  ],
  
  // Manager level or higher
  MANAGER: [
    '/manager',
    '/overrides',
    '/invoices',
    '/api/invoices',
    '/api/overrides'
  ],

  // Admin only
  ADMIN: [
    '/admin',
    '/agents',
    '/settings',
    '/api/admin',
    '/api/agents',
    '/api/settings'
  ],

  // Subscriber only
  SUBSCRIBER: [
    '/subscriber',
    '/api/subscriber'
  ]
} as const

/**
 * Check if user has access to a specific route
 */
export function hasRouteAccess(
  pathname: string,
  isAdmin: boolean = false,
  isManager: boolean = false,
  isAuthenticated: boolean = false,
  isSubscriber: boolean = false
): boolean {
  // Check admin routes
  if (ROUTE_ACCESS.ADMIN.some(route => pathname.startsWith(route))) {
    return isAdmin
  }

  // Check manager routes
  if (ROUTE_ACCESS.MANAGER.some(route => pathname.startsWith(route))) {
    return isAdmin || isManager
  }

  // Check subscriber routes
  if (ROUTE_ACCESS.SUBSCRIBER.some(route => pathname.startsWith(route))) {
    return isSubscriber
  }

  // Check employee routes
  if (ROUTE_ACCESS.EMPLOYEE.some(route => pathname.startsWith(route))) {
    return isAuthenticated
  }

  // Check authenticated routes
  if (ROUTE_ACCESS.AUTHENTICATED.some(route => pathname.startsWith(route))) {
    return isAuthenticated
  }

  // Public routes - always allowed
  return true
}

/**
 * Get appropriate redirect URL based on user permissions
 */
export function getAccessDeniedRedirect(
  pathname: string,
  _isAdmin: boolean = false,
  _isManager: boolean = false,
  isAuthenticated: boolean = false
): string {
  // If not authenticated at all, redirect to login
  if (!isAuthenticated) {
    return `/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`
  }
  
  // If authenticated but insufficient permissions, redirect to forbidden
  // Note: isAdmin and isManager could be used for more granular redirects in the future
  return '/forbidden'
}

/**
 * Middleware helper to validate route access
 */
export async function validateRouteAccess(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip validation for Next.js internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next()
  }
  
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    const isAuthenticated = !!token
    const isAdmin = token?.isAdmin === true
    const isManager = token?.isManager === true
    const isSubscriber = token?.isSubscriber === true

    // Check if user has access to this route
    const hasAccess = hasRouteAccess(pathname, isAdmin, isManager, isAuthenticated, isSubscriber)
    
    if (!hasAccess) {
      const redirectUrl = getAccessDeniedRedirect(pathname, isAdmin, isManager, isAuthenticated)
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
    
    return NextResponse.next()
    
  } catch (error) {
    logger.error('Access validation error:', error)
    // On error, redirect to login for safety
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, request.url)
    )
  }
}

/**
 * Server-side access validation for pages
 */
export function validatePageAccess(
  requiredLevel: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'AUTHENTICATED',
  userRole: { isAdmin?: boolean; isManager?: boolean; isAuthenticated?: boolean }
): boolean {
  const { isAdmin = false, isManager = false, isAuthenticated = false } = userRole
  
  switch (requiredLevel) {
    case 'ADMIN':
      return isAdmin
    case 'MANAGER':
      return isAdmin || isManager
    case 'EMPLOYEE':
      return isAuthenticated
    case 'AUTHENTICATED':
      return isAuthenticated
    default:
      return false
  }
}

/**
 * Employee access validation - check if user can access specific employee data
 */
export function hasEmployeeAccess(
  targetEmployeeId: number,
  currentUser: {
    employeeId?: number | null
    isAdmin?: boolean
    isManager?: boolean
    managedEmployeeIds?: number[]
  }
): boolean {
  const { employeeId, isAdmin, isManager, managedEmployeeIds = [] } = currentUser
  
  // Admins can access any employee
  if (isAdmin) return true
  
  // Users can access their own data
  if (employeeId === targetEmployeeId) return true
  
  // Managers can access their managed employees
  if (isManager && managedEmployeeIds.includes(targetEmployeeId)) return true
  
  return false
}

/**
 * Payroll access validation - check if user can access specific payroll data
 */
export function hasPayrollAccess(
  targetEmployeeId: number,
  issueDate: string,
  currentUser: {
    employeeId?: number | null
    isAdmin?: boolean
    isManager?: boolean
    managedEmployeeIds?: number[]
  }
): boolean {
  // First check basic employee access
  if (!hasEmployeeAccess(targetEmployeeId, currentUser)) {
    return false
  }
  
  // Additional payroll-specific validations could go here
  // For example, date-based restrictions, payroll release times, etc.
  
  return true
}
