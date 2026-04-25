import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/config'
import { Button } from '@/components/ui/button'
import { JobApplicationRepository } from '@/lib/repositories/JobApplicationRepository'
import ApplicationsTable from '@/components/admin/careers/ApplicationsTable'

export default async function AdminApplicationsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) redirect('/dashboard')

  const repo = new JobApplicationRepository()
  const applications = await repo.listAll({
    isAdmin: true,
    isManager: !!session.user.isManager,
    employeeId: session.user.employeeId,
  })

  return (
    <div className="mx-auto max-w-6xl py-10 px-4 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/careers">
          <ChevronLeft className="size-4" />
          All postings
        </Link>
      </Button>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal applications submitted through the careers site.
        </p>
      </header>

      <ApplicationsTable applications={applications} />
    </div>
  )
}
