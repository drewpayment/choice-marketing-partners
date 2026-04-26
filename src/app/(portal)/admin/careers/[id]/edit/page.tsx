import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { ChevronLeft } from 'lucide-react'
import { authOptions } from '@/lib/auth/config'
import { Button } from '@/components/ui/button'
import { JobPostingRepository } from '@/lib/repositories/JobPostingRepository'
import JobPostingForm from '@/components/admin/careers/JobPostingForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditJobPostingPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) redirect('/dashboard')

  const { id } = await params
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) notFound()

  const repo = new JobPostingRepository()
  const job = await repo.getById(numericId, {
    isAdmin: true,
    isManager: !!session.user.isManager,
    employeeId: session.user.employeeId,
  })
  if (!job) notFound()

  return (
    <div className="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/careers">
          <ChevronLeft className="size-4" />
          All postings
        </Link>
      </Button>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{job.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Slug: <code className="rounded bg-muted px-1.5 py-0.5">{job.slug}</code>
        {job.status === 'active' && (
          <>
            {' • '}
            <Link href={`/careers/${job.slug}`} className="text-primary hover:underline" target="_blank">
              View public page
            </Link>
          </>
        )}
      </p>
      <div className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-8">
        <JobPostingForm mode="edit" initial={job} />
      </div>
    </div>
  )
}
