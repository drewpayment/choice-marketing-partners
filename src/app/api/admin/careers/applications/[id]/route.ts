import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'
import {
  JobApplicationRepository,
  type ApplicationStatus,
} from '@/lib/repositories/JobApplicationRepository'
import { logger } from '@/lib/utils/logger'

const statuses = ['new', 'reviewing', 'contacted', 'rejected', 'hired'] as const

const schema = z.object({
  status: z.enum(statuses).optional(),
  notes: z.union([z.string().max(10000), z.null()]).optional(),
})

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  if (!parsed.data.status && parsed.data.notes === undefined) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const repo = new JobApplicationRepository()
  const ctx = {
    isAdmin: true,
    isManager: !!session.user?.isManager,
    employeeId: session.user?.employeeId,
  }

  try {
    // Read existing so partial updates preserve unchanged values.
    const existing = await repo.getById(numericId, ctx)
    if (!existing) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const nextStatus: ApplicationStatus =
      (parsed.data.status as ApplicationStatus | undefined) ?? existing.status
    const nextNotes =
      parsed.data.notes === undefined ? existing.notes : parsed.data.notes

    await repo.updateStatus(numericId, nextStatus, nextNotes ?? null, ctx)
    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('Failed to update application', error)
    return NextResponse.json({ error: 'Failed to update application.' }, { status: 500 })
  }
}
