import { NextRequest, NextResponse } from 'next/server'
import { dailyPayRepository, computeJustCrossedCutoff } from '@/lib/repositories/DailyPayRepository'
import { logger } from '@/lib/utils/logger'

/**
 * Vercel cron handler — runs hourly per vercel.json. Reads runtime config and
 * auto-rejects any pending punches whose pay week has crossed the configured cutoff.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}. Vercel attaches this header to cron invocations
 * when CRON_SECRET is set. Manual invocations must include the same bearer to succeed.
 */
export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) {
    logger.error('CRON_SECRET is not configured — refusing to run cron')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await dailyPayRepository.getSettings()
    if (!settings.isAutoCutoffEnabled) {
      return NextResponse.json({ ran: false, reason: 'auto_cutoff_disabled' })
    }

    const crossed = computeJustCrossedCutoff(
      new Date(),
      settings.cutoffDayOfWeek,
      settings.cutoffTimeLocal,
      settings.cutoffTimezone,
    )
    if (!crossed) {
      return NextResponse.json({ ran: false, reason: 'cutoff_not_crossed' })
    }

    const updated = await dailyPayRepository.autoRejectStalePunches(crossed.cutoffWorkDate)
    return NextResponse.json({
      ran: true,
      cutoffWorkDate: crossed.cutoffWorkDate,
      autoRejectedCount: updated,
    })
  } catch (error) {
    logger.error('Daily pay cutoff cron failed:', error)
    return NextResponse.json({ error: 'Cron run failed' }, { status: 500 })
  }
}
