import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/database/client'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/users/resolve-uids?uids=1,2,3
 * Returns a map of uid -> user name. Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const raw = new URL(request.url).searchParams.get('uids') ?? ''
    const uids = raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))

    if (uids.length === 0) {
      return NextResponse.json({})
    }

    const rows = await db
      .selectFrom('users')
      .select(['users.uid', 'users.name'])
      .where('users.uid', 'in', uids)
      .execute()

    const map: Record<number, string> = {}
    for (const row of rows) {
      map[row.uid] = row.name
    }

    return NextResponse.json(map)
  } catch (error) {
    logger.error('Error resolving user uids:', error)
    return NextResponse.json({ error: 'Failed to resolve uids' }, { status: 500 })
  }
}
