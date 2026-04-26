import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import JobPostingForm from '@/components/admin/careers/JobPostingForm'

export default function NewJobPostingPage() {
  return (
    <div className="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/careers">
          <ChevronLeft className="size-4" />
          All postings
        </Link>
      </Button>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">New job posting</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create a draft first, then flip status to <strong>active</strong> when you&apos;re ready
        to publish.
      </p>
      <div className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-8">
        <JobPostingForm mode="create" />
      </div>
    </div>
  )
}
