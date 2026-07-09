'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

const THEMES = ['light', 'dark', 'system'] as const
type Theme = (typeof THEMES)[number]

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const current: Theme = (THEMES.includes(theme as Theme) ? theme : 'system') as Theme
  const Icon = ICONS[current]
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={mounted ? `Theme: ${LABELS[current]}. Switch to ${LABELS[next]}` : 'Toggle theme'}
      title={mounted ? `Theme: ${LABELS[current]}` : 'Toggle theme'}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {mounted ? <Icon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  )
}
