import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronLeft, ExternalLink, MapPin, Briefcase, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JobPostingRepository } from '@/lib/repositories/JobPostingRepository'
import {
  formatDepartment,
  formatEmployment,
  formatLocation,
  formatSalary,
  formatWorkSetting,
} from '@/components/careers/jobFormatters'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const repo = new JobPostingRepository()
  const job = await repo.getActiveBySlug(slug)
  if (!job) {
    return { title: 'Role not found | Careers | Choice Marketing Partners' }
  }
  return {
    title: `${job.title} | Careers | Choice Marketing Partners`,
    description:
      job.summary ?? `Apply for ${job.title} at Choice Marketing Partners.`,
  }
}

function externalHostLabel(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return 'external site'
  }
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params
  const repo = new JobPostingRepository()
  const job = await repo.getActiveBySlug(slug)
  if (!job) notFound()

  const salary = formatSalary(job)
  const isExternalApply = !!job.apply_url

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-primary">
            Choice Marketing Partners
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/careers">
              <ChevronLeft className="size-4" />
              All Roles
            </Link>
          </Button>
        </div>
      </nav>

      <header className="bg-gradient-to-br from-cyan-700 via-cyan-800 to-cyan-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Badge className="mb-4 bg-white/15 text-white hover:bg-white/15">
            {formatDepartment(job.department)}
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {job.title}
          </h1>
          {job.summary && (
            <p className="mt-4 max-w-3xl text-base text-cyan-100 sm:text-lg">
              {job.summary}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-cyan-100">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" /> {formatLocation(job)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="size-4" /> {formatEmployment(job.employment_type)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" /> {formatWorkSetting(job.work_setting)}
            </span>
            {salary && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
                {salary}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-10">
            <Section title="About the role" html={job.description} />
            <Section title="What you'll do" html={job.responsibilities} />
            <Section title="What we're looking for" html={job.qualifications} />
            {job.benefits && <Section title="Benefits" html={job.benefits} />}
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Ready to apply?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isExternalApply
                  ? `Applications are handled on ${externalHostLabel(job.apply_url!)}.`
                  : 'Tell us about yourself in a quick form. Resume optional.'}
              </p>
              {isExternalApply ? (
                <Button asChild size="lg" className="mt-5 w-full bg-amber-600 text-white hover:bg-amber-700">
                  <a href={job.apply_url!} target="_blank" rel="noopener noreferrer">
                    Apply on {externalHostLabel(job.apply_url!)}
                    <ExternalLink className="ml-2 size-4" />
                  </a>
                </Button>
              ) : (
                <Button asChild size="lg" className="mt-5 w-full bg-amber-600 text-white hover:bg-amber-700">
                  <Link href={`/careers/${job.slug}/apply`}>
                    Apply Now
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                Questions? Email{' '}
                <a
                  href="mailto:careers@choicemarketingpartners.com"
                  className="text-primary hover:underline"
                >
                  careers@choicemarketingpartners.com
                </a>
              </p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="bg-stone-900 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-stone-400">Choice Marketing Partners</p>
          <div className="flex items-center gap-6">
            <Link href="/careers" className="text-sm text-stone-500 transition-colors hover:text-stone-300">
              All roles
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

function Section({ title, html }: { title: string; html: string }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div
        className="prose prose-stone max-w-none prose-headings:text-foreground prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  )
}
