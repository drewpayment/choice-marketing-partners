import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { JobPostingRepository } from '@/lib/repositories/JobPostingRepository'
import CareersHero from '@/components/careers/CareersHero'
import ValuesGrid from '@/components/careers/ValuesGrid'
import JobListings from '@/components/careers/JobListings'
import StatsBar from '@/components/careers/StatsBar'
import CareersCTA from '@/components/careers/CareersCTA'

// Render on every request so newly published/edited job postings appear
// immediately. Without this the route is statically cached at build time and
// the listing never reflects postings created after deploy.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Careers | Choice Marketing Partners',
  description:
    'Build your career at Choice Marketing Partners. Browse open roles in sales, operations, and more — and join a team that shares the wins.',
}

export default async function CareersPage() {
  const repo = new JobPostingRepository()
  const jobs = await repo.listActive()

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-primary">
            Choice Marketing Partners
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <Link
              href="/about-us"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Blog
            </Link>
            <Link href="/careers" className="text-sm font-semibold text-primary">
              Careers
            </Link>
          </div>
          <Button asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </nav>

      <CareersHero openCount={jobs.length} />
      <ValuesGrid />
      <JobListings jobs={jobs} />
      <StatsBar />
      <CareersCTA />

      <footer className="bg-stone-900 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-stone-400">Choice Marketing Partners</p>
          <div className="flex items-center gap-6">
            <Link href="/about-us" className="text-sm text-stone-500 transition-colors hover:text-stone-300">
              About Us
            </Link>
            <Link href="/blog" className="text-sm text-stone-500 transition-colors hover:text-stone-300">
              Blog
            </Link>
            <Link href="/careers" className="text-sm text-stone-500 transition-colors hover:text-stone-300">
              Careers
            </Link>
            <p className="text-sm text-stone-600">
              &copy; {new Date().getFullYear()} Choice Marketing Partners
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
