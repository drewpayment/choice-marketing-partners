import { requireAuth } from '@/lib/auth/server-auth'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { PayrollRepository, type PayrollSummary } from '@/lib/repositories/PayrollRepository'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, FolderOpen, FileText, Shield, CheckCircle, XCircle, ChevronRight, Users } from 'lucide-react'
import PersonalPaySection from '@/components/dashboard/PersonalPaySection'

// Build the statement-detail href, returning the rep to the dashboard afterwards.
const buildStatementHref = (statement: PayrollSummary) =>
  `/payroll/${statement.employeeId}/${statement.vendorId}/${statement.issueDate}?returnUrl=${encodeURIComponent('/dashboard')}`

export default async function PortalDashboard() {
  const session = await requireAuth()
  const isElevated = session.user.isAdmin || session.user.isManager

  // ---------------------------------------------------------------------------
  // Employee (outside sales rep) home: payroll-first.
  // ---------------------------------------------------------------------------
  if (!isElevated) {
    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    // getPayrollSummary already hides unreleased (future-dated) statements for
    // employees — do not bypass that filter. Fetch the newest 7 so the hero can
    // take the latest and the list can show up to 6 more.
    const payrollRepository = new PayrollRepository()
    const { data } = await payrollRepository.getPayrollSummary(
      { page: 1, limit: 7 },
      userContext
    )

    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Welcome, {session.user.name}!
          </h1>
        </div>

        <PersonalPaySection statements={data} buildHref={buildStatementHref} showEmptyState />

        {/* Quick link to Documents */}
        <Link
          href="/documents"
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex min-h-14 items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md active:bg-muted">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground">Documents</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                View and manage your documents
              </p>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>
        </Link>

        {/* Account info, demoted to a compact footer card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <span className="text-muted-foreground">Signed in as </span>
                <span className="font-medium text-foreground">{session.user.email}</span>
              </div>
              {session.user.isActive ? (
                <Badge
                  variant="secondary"
                  className="border-primary/20 bg-primary/10 text-primary"
                >
                  <CheckCircle className="h-3 w-3" />
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3" />
                  Inactive
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Admin / Manager home: own pay first, then the team, then admin tooling.
  // ---------------------------------------------------------------------------
  const elevatedContext = await getEmployeeContext(
    session.user.employeeId,
    session.user.isAdmin,
    session.user.isManager
  )
  const hasReports = (elevatedContext.managedEmployeeIds?.length ?? 0) > 0

  // Their OWN statements only. `scope: 'mine'` narrows the role filter to self —
  // it cannot widen it, and the unreleased-statement cutoff still applies.
  const elevatedPayrollRepository = new PayrollRepository()
  const { data: ownStatements } = await elevatedPayrollRepository.getPayrollSummary(
    { page: 1, limit: 7, scope: 'mine' },
    elevatedContext
  )

  return (
    <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
      <div className="space-y-6 px-4 py-6 sm:px-0">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {session.user.name}!
          </h1>
        </div>

        {/* Own pay + the way into the team view. Constrained to a readable
            column so the hero card doesn't stretch across a 7xl page. */}
        {(ownStatements.length > 0 || hasReports) && (
          <div className="max-w-2xl space-y-6">
            <PersonalPaySection
              statements={ownStatements}
              buildHref={buildStatementHref}
              title="Your pay"
              viewAllHref="/payroll?scope=mine"
            />

            {hasReports && (
              <Link
                href="/payroll?scope=team"
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex min-h-14 items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md active:bg-muted">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground">Your team&apos;s pay</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Statements for the {elevatedContext.managedEmployeeIds?.length} employee
                      {elevatedContext.managedEmployeeIds?.length === 1 ? '' : 's'} you manage
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/payroll">
              <Card className="h-full cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">View Payroll</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Access paystubs and payroll history</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/documents">
              <Card className="h-full cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Documents</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Upload and manage documents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/invoices">
              <Card className="h-full cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Manage Invoices</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Edit and manage pay statements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {session.user.isAdmin && (
              <Link href="/admin">
                <Card className="h-full cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-2.5">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">Admin Portal</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Access administrative tools and settings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>

        {/* Account Info, demoted below pay and quick actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-lg font-medium text-foreground">{session.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employee ID</p>
                <p className="text-lg font-medium text-foreground">{session.user.employeeId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="text-lg font-medium text-foreground">
                  {session.user.isAdmin ? 'Administrator' : 'Manager'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  {session.user.isActive ? (
                    <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
