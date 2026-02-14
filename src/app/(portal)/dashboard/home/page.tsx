import { requireAuth } from '@/lib/auth/utils'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, FolderOpen, FileText, Shield, CheckCircle, XCircle } from 'lucide-react'

export default async function PortalDashboard() {
  const session = await requireAuth()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {session.user.name}!
          </h1>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-lg font-medium text-foreground">{session.user.email}</p>
              </div>
              {(session.user.isAdmin || session.user.isManager) && (
                <div>
                  <p className="text-sm text-muted-foreground">Employee ID</p>
                  <p className="text-lg font-medium text-foreground">{session.user.employeeId || 'N/A'}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="text-lg font-medium text-foreground">
                  {session.user.isAdmin ? 'Administrator' :
                   session.user.isManager ? 'Manager' : 'Employee'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  {session.user.isActive ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/payroll">
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">View Payroll</h3>
                      <p className="text-sm text-muted-foreground mt-1">Access your paystubs and payroll history</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/documents">
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Documents</h3>
                      <p className="text-sm text-muted-foreground mt-1">Upload and manage your documents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {(session.user.isManager || session.user.isAdmin) && (
              <Link href="/invoices">
                <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-2.5">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">Manage Invoices</h3>
                        <p className="text-sm text-muted-foreground mt-1">Edit and manage pay statements</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {session.user.isAdmin && (
              <Link href="/admin">
                <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-2.5">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">Admin Portal</h3>
                        <p className="text-sm text-muted-foreground mt-1">Access administrative tools and settings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-secondary/30 bg-secondary/5">
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-secondary mb-2">Debug Info (Development)</h3>
              <pre className="text-xs text-muted-foreground overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
