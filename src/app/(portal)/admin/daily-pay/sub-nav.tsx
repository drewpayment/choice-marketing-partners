'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/daily-pay/punches', label: 'Punches' },
  { href: '/admin/daily-pay/enrollments', label: 'Enrollments' },
  { href: '/admin/daily-pay/settings', label: 'Settings' },
]

export default function DailyPaySubNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname()
  return (
    <div className="mb-6 flex items-center gap-5 border-b border-[var(--ink-200)]">
      {TABS.map((t) => {
        const isActive = pathname === t.href || pathname.startsWith(t.href + '/')
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-1.5 px-1 pb-3 pt-2 text-sm font-semibold border-b-2 transition-colors ${
              isActive
                ? 'border-[var(--teal-600)] text-[var(--teal-700)]'
                : 'border-transparent text-[var(--ink-600)] hover:text-[var(--ink-900)]'
            }`}
          >
            {t.label}
            {t.label === 'Punches' && pendingCount > 0 && (
              <span className="rounded-full bg-[var(--status-amber-50)] px-1.5 py-px text-[10px] font-bold text-[#92400e]">
                {pendingCount}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
