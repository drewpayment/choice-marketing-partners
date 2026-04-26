'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/', label: 'Home', match: (path: string) => path === '/' },
  { href: '/about-us', label: 'About', match: (path: string) => path.startsWith('/about-us') },
  { href: '/blog', label: 'Blog', match: (path: string) => path.startsWith('/blog') },
  { href: '/careers', label: 'Careers', match: (path: string) => path.startsWith('/careers') },
] as const

export default function MarketingHeader() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-primary">
          Choice Marketing Partners
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => {
            const active = link.match(pathname)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-foreground',
                  active ? 'text-primary font-semibold' : 'text-muted-foreground',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
        <Button asChild>
          <Link href="/auth/signin">Sign In</Link>
        </Button>
      </div>
    </nav>
  )
}
