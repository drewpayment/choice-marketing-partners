import { requireAuth } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'

export default async function ManagerDashboard() {
  const session = await requireAuth()
  
  // Ensure user is manager or admin
  if (!session.user.isManager && !session.user.isAdmin) {
    redirect('/dashboard')
  }

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-card shadow rounded-lg p-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Manager Dashboard
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Welcome back, {session.user.name}. Manage your team.
            </p>
            
            {/* Manager Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-card overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">👥</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-muted-foreground truncate">Team Members</dt>
                        <dd className="text-lg font-medium text-foreground">--</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">✅</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-muted-foreground truncate">Approvals Pending</dt>
                        <dd className="text-lg font-medium text-foreground">--</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-secondary rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">📋</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-muted-foreground truncate">Active Jobs</dt>
                        <dd className="text-lg font-medium text-foreground">--</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Manager Actions */}
            <div className="bg-card shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Manager Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a 
                  href="/manager/team" 
                  className="block p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <h3 className="font-medium text-foreground">Team Management</h3>
                  <p className="text-sm text-muted-foreground">View and manage your team members</p>
                </a>
                
                <a 
                  href="/manager/approvals" 
                  className="block p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <h3 className="font-medium text-foreground">Pending Approvals</h3>
                  <p className="text-sm text-muted-foreground">Review and approve team requests</p>
                </a>
                
                <a 
                  href="/manager/jobs" 
                  className="block p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <h3 className="font-medium text-foreground">Job Management</h3>
                  <p className="text-sm text-muted-foreground">Create and manage job assignments</p>
                </a>
                
                <a 
                  href="/manager/payroll" 
                  className="block p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <h3 className="font-medium text-foreground">Payroll Review</h3>
                  <p className="text-sm text-muted-foreground">Review team payroll information</p>
                </a>
                
                <a 
                  href="/admin/invoice-search" 
                  className="block p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <h3 className="font-medium text-foreground">Invoice Investigation</h3>
                  <p className="text-sm text-muted-foreground">Search and investigate invoice audit trails</p>
                </a>
                
                <a 
                  href="/manager/reports" 
                  className="block p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <h3 className="font-medium text-foreground">Team Reports</h3>
                  <p className="text-sm text-muted-foreground">Generate team performance reports</p>
                </a>
                
                <a 
                  href="/manager/schedule" 
                  className="block p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <h3 className="font-medium text-foreground">Scheduling</h3>
                  <p className="text-sm text-muted-foreground">Manage team schedules and assignments</p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
