import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobPostingRepository } from '@/lib/repositories/JobPostingRepository'
import JobApplicationForm from '@/components/careers/JobApplicationForm'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const repo = new JobPostingRepository()
  const job = await repo.getActiveBySlug(slug)
  return {
    title: job
      ? `Apply: ${job.title} | Choice Marketing Partners`
      : 'Apply | Choice Marketing Partners',
    robots: { index: false },
  }
}

export default async function ApplyPage({ params }: Props) {
  const { slug } = await params
  const repo = new JobPostingRepository()
  const job = await repo.getActiveBySlug(slug)
  if (!job) notFound()

  // Roles with an external URL skip the internal form entirely.
  if (job.apply_url) {
    redirect(`/careers/${slug}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-primary">
            Choice Marketing Partners
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/careers/${slug}`}>
              <ChevronLeft className="size-4" />
              Back to role
            </Link>
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Apply
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {job.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Fill out the form below — we read every application and reply within a
            few business days.
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <JobApplicationForm jobSlug={job.slug} jobTitle={job.title} />
        </div>
      </main>
    </div>
  )
}
