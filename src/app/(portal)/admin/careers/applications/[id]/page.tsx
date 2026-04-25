import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { ChevronLeft, ExternalLink, Mail, Phone } from 'lucide-react'
import { authOptions } from '@/lib/auth/config'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JobApplicationRepository } from '@/lib/repositories/JobApplicationRepository'
import ApplicationDetail from '@/components/admin/careers/ApplicationDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminApplicationDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) redirect('/dashboard')

  const { id } = await params
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) notFound()

  const repo = new JobApplicationRepository()
  const application = await repo.getById(numericId, {
    isAdmin: true,
    isManager: !!session.user.isManager,
    employeeId: session.user.employeeId,
  })
  if (!application) notFound()

  return (
    <div className="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/careers/applications">
          <ChevronLeft className="size-4" />
          All applications
        </Link>
      </Button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {application.applicant_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Applied for{' '}
          <Link
            href={`/admin/careers/${application.job_posting_id}/edit`}
            className="text-primary hover:underline"
          >
            {application.job_title}
          </Link>
        </p>
      </header>

      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="inline-flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <a
              href={`mailto:${application.applicant_email}`}
              className="text-primary hover:underline"
            >
              {application.applicant_email}
            </a>
          </div>
          {application.applicant_phone && (
            <div className="inline-flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <a
                href={`tel:${application.applicant_phone}`}
                className="text-primary hover:underline"
              >
                {application.applicant_phone}
              </a>
            </div>
          )}
        </div>

        {application.resume_url && (
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <a href={application.resume_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                {application.resume_filename ?? 'Download resume'}
              </a>
            </Button>
          </div>
        )}

        {application.cover_letter && (
          <div className="mt-6">
            <Badge variant="secondary" className="mb-2">
              Cover letter
            </Badge>
            <div className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm text-foreground">
              {application.cover_letter}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Triage</h2>
        <ApplicationDetail application={application} />
      </div>
    </div>
  )
}
