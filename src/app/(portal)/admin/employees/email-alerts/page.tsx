import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { EmailDeliveryRepository } from '@/lib/repositories/EmailDeliveryRepository'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MailX, MailCheck, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Email Alerts | Choice Marketing Partners',
  description: 'Employees with undeliverable email addresses',
}

export default async function EmailAlertsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    redirect('/')
  }

  const [undeliverable, verificationStats] = await Promise.all([
    new EmailDeliveryRepository().listUndeliverable(),
    new EmployeeRepository().getEmailVerificationStats(),
  ])

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/employees">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Employees
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Email Alerts</h1>
            <p className="text-muted-foreground">
              Employees whose most recent email bounced or was marked as spam
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Email Verification Adoption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold">{verificationStats.verified}</div>
                <div className="text-sm text-muted-foreground">Verified accounts</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold">{verificationStats.pending}</div>
                <div className="text-sm text-muted-foreground">
                  Awaiting email verification
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Accounts created while the <code>require-email-verification</code> flag
              is enabled stay pending until the employee verifies their email.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailX className="h-5 w-5" />
              Undeliverable Addresses
              <Badge variant={undeliverable.length > 0 ? 'destructive' : 'secondary'}>
                {undeliverable.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {undeliverable.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <MailCheck className="h-4 w-4" />
                No delivery problems detected. All recorded employee emails are
                reaching their inboxes.
              </div>
            ) : (
              <div className="divide-y">
                {undeliverable.map((row) => (
                  <Link
                    key={`${row.employeeId}-${row.email}`}
                    href={`/admin/employees/${row.employeeId}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <div className="font-medium">{row.employeeName}</div>
                      <div className="text-sm text-muted-foreground">{row.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {row.occurredAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(row.occurredAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                      <Badge variant="destructive" className="text-xs">
                        {row.eventType === 'email.complained'
                          ? 'Marked as spam'
                          : `Bounced${row.bounceType ? ` (${row.bounceType})` : ''}`}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
