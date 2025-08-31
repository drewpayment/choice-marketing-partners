import { NextResponse } from 'next/server'
import { healthCheck } from '@/lib/database/client'

export async function GET() {
  try {
    const health = await healthCheck()
    
    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    })
  }
}
