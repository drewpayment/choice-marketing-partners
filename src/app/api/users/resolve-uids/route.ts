import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/database/client'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/users/resolve-uids?uids=1,2,3
 * Returns a map of users.id -> user name. Admin only.
 * (The `uids` query param name is historical — values are matched against users.id.)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const raw = new URL(request.url).searchParams.get('uids') ?? ''
    const ids = raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))

    if (ids.length === 0) {
      return NextResponse.json({})
    }

    const rows = await db
      .selectFrom('users')
      .select(['users.id', 'users.name'])
      .where('users.id', 'in', ids)
      .execute()

    const map: Record<number, string> = {}
    for (const row of rows) {
      map[row.id] = row.name
    }

    return NextResponse.json(map)
  } catch (error) {
    logger.error('Error resolving user uids:', error)
    return NextResponse.json({ error: 'Failed to resolve uids' }, { status: 500 })
  }
}
