import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const pathname = req.nextUrl.pathname
    
    // Redirect to dashboard if accessing auth pages while authenticated
    if (isAuth && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    // Check admin routes
    if (pathname.startsWith('/admin')) {
      if (!token?.isAdmin) {
        return NextResponse.redirect(new URL('/forbidden', req.url))
      }
    }
    
    // Check manager routes  
    if (pathname.startsWith('/manager')) {
      if (!token?.isAdmin && !token?.isManager) {
        return NextResponse.redirect(new URL('/forbidden', req.url))
      }
    }
    
    // Check agent-specific routes
    if (pathname.startsWith('/agents')) {
      if (!token?.isAdmin) {
        return NextResponse.redirect(new URL('/forbidden', req.url))
      }
    }
    
    // Check settings routes
    if (pathname.startsWith('/settings')) {
      if (!token?.isAdmin) {
        return NextResponse.redirect(new URL('/forbidden', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        if (req.nextUrl.pathname.startsWith('/api/auth')) return true
        if (req.nextUrl.pathname.startsWith('/auth')) return true
        if (req.nextUrl.pathname === '/') return true
        if (req.nextUrl.pathname.startsWith('/blog')) return true
        if (req.nextUrl.pathname.startsWith('/about')) return true
        if (req.nextUrl.pathname.startsWith('/comma-club')) return true
        if (req.nextUrl.pathname === '/forbidden') return true
        if (req.nextUrl.pathname === '/not-found') return true
        
        // Require authentication for protected routes
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    // Protected routes that require authentication
    '/dashboard/:path*',
    '/payroll/:path*', 
    '/invoices/:path*',
    '/documents/:path*',
    '/agents/:path*',
    '/overrides/:path*',
    '/admin/:path*',
    '/manager/:path*',
    '/account/:path*',
    // Auth routes
    '/auth/:path*',
    // API routes except public ones
    '/api/((?!auth|health).)*'
  ]
}
