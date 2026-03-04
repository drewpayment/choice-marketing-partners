import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/database/client'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  limit: z.coerce.number().min(1).max(50).optional().default(10)
})

/**
 * GET /api/users/search - Search users for feature flag targeting
 * Searches the users table directly (not employees).
 * Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const data = searchSchema.parse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit')
    })

    const users = await db
      .selectFrom('users')
      .select(['users.uid', 'users.name', 'users.email'])
      .where('users.deleted_at', 'is', null)
      .where((eb) =>
        eb.or([
          eb('users.name', 'like', `%${data.q}%`),
          eb('users.email', 'like', `%${data.q}%`),
        ])
      )
      .orderBy('users.name', 'asc')
      .limit(data.limit)
      .execute()

    return NextResponse.json({ users })
  } catch (error) {
    logger.error('Error searching users:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    )
  }
}
