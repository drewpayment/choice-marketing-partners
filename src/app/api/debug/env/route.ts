import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow in development or for debugging
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const url = new URL(request.url)
  
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    nextauth_url: process.env.NEXTAUTH_URL,
    current_host: request.headers.get('host'),
    current_url: url.origin,
    current_pathname: url.pathname,
    vercel_url: process.env.VERCEL_URL,
    user_agent: request.headers.get('user-agent'),
    headers: Object.fromEntries(request.headers.entries())
  })
}