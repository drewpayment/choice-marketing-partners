import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Plus, Inbox, QrCode } from 'lucide-react'
import { authOptions } from '@/lib/auth/config'
import { Button } from '@/components/ui/button'
import { JobPostingRepository } from '@/lib/repositories/JobPostingRepository'
import { getSiteUrl } from '@/lib/utils/site-url'
import JobsTable from '@/components/admin/careers/JobsTable'
import QRCodeDialog from '@/components/admin/careers/QRCodeDialog'

export default async function AdminCareersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) redirect('/dashboard')

  const repo = new JobPostingRepository()
  const jobs = await repo.listAll(
    {
      isAdmin: true,
      isManager: !!session.user.isManager,
      employeeId: session.user.employeeId,
    },
    { includeDeleted: false },
  )

  const siteOrigin = getSiteUrl()

  return (
    <div className="mx-auto max-w-6xl py-10 px-4 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Careers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage job postings on the public careers page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QRCodeDialog
            path="/careers"
            siteOrigin={siteOrigin}
            filename="careers-qr"
            title="QR code for the careers page"
            subtitle="Public careers listing"
            trigger={
              <Button variant="outline">
                <QrCode className="size-4" />
                Careers QR
              </Button>
            }
          />
          <Button asChild variant="outline">
            <Link href="/admin/careers/applications">
              <Inbox className="size-4" />
              Applications
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/careers/new">
              <Plus className="size-4" />
              New posting
            </Link>
          </Button>
        </div>
      </header>

      <JobsTable jobs={jobs} siteOrigin={siteOrigin} />
    </div>
  )
}
