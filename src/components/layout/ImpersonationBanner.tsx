'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { logger } from '@/lib/utils/logger'

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0s'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export function ImpersonationBanner() {
  const { data: session, update: updateSession } = useSession()
  const [now, setNow] = useState(() => Date.now())
  const [isStopping, setIsStopping] = useState(false)

  const impersonation = session?.impersonation ?? null

  const stop = useCallback(async () => {
    if (isStopping) return
    setIsStopping(true)
    try {
      await fetch('/api/admin/impersonate/stop', {
        method: 'POST',
        credentials: 'include',
      })
      await updateSession({ stopImpersonation: true })
      window.location.href = '/admin/employees'
    } catch (error) {
      logger.error('Error stopping impersonation:', error)
      setIsStopping(false)
    }
  }, [isStopping, updateSession])

  useEffect(() => {
    if (!impersonation) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [impersonation])

  useEffect(() => {
    if (!impersonation) return
    if (now >= impersonation.expiresAt) {
      void stop()
    }
  }, [impersonation, now, stop])

  if (!impersonation) return null

  const remaining = impersonation.expiresAt - now

  return (
    <div
      role="alert"
      className="bg-red-600 text-white px-4 py-2 text-sm flex items-center justify-between"
    >
      <div>
        <strong>Acting as {impersonation.targetName}</strong>
        <span className="ml-2 opacity-80">
          (read-only · expires in {formatRemaining(remaining)})
        </span>
      </div>
      <button
        type="button"
        onClick={stop}
        disabled={isStopping}
        className="ml-4 rounded bg-white text-red-700 hover:bg-red-50 px-3 py-1 text-xs font-semibold disabled:opacity-50"
      >
        {isStopping ? 'Stopping…' : 'Stop emulating'}
      </button>
    </div>
  )
}
