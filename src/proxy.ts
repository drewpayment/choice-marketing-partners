import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isImpersonationAllowedWrite } from '@/lib/auth/impersonation-guard'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export async function middleware(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method)) return NextResponse.next()

  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith('/api/')) return NextResponse.next()
  if (pathname.startsWith('/api/auth/')) return NextResponse.next()
  if (isImpersonationAllowedWrite(pathname)) return NextResponse.next()

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.impersonation) return NextResponse.next()
  if (token.impersonation.expiresAt < Date.now()) return NextResponse.next()

  return NextResponse.json(
    {
      error: 'Impersonation sessions are read-only. Stop impersonating to make changes.',
    },
    { status: 403 }
  )
}

export const config = {
  matcher: '/api/:path*',
}
