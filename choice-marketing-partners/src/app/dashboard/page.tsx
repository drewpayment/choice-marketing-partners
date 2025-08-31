import { requireAuth } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'

export default async function Dashboard() {
  const session = await requireAuth()
  
  // Role-based dashboard redirect
  if (session.user.isAdmin) {
    redirect('/admin/dashboard')
  }
  
  if (session.user.isManager) {
    redirect('/manager/dashboard')
  }

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome, {session.user.name}!
            </h1>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Account</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-lg font-medium">{session.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Employee ID</p>
                  <p className="text-lg font-medium">{session.user.employeeId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Role</p>
                  <p className="text-lg font-medium">
                    {session.user.isAdmin ? 'Administrator' : 
                     session.user.isManager ? 'Manager' : 'Employee'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-medium">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {session.user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a 
                  href="/payroll" 
                  className="block p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">View Payroll</h3>
                  <p className="text-sm text-gray-600">Access your paystubs and payroll history</p>
                </a>
                
                <a 
                  href="/documents" 
                  className="block p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">Documents</h3>
                  <p className="text-sm text-gray-600">Upload and manage your documents</p>
                </a>
                
                <a 
                  href="/account" 
                  className="block p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">Account Settings</h3>
                  <p className="text-sm text-gray-600">Update your profile and preferences</p>
                </a>
              </div>
            </div>

            {/* Debug Info (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Debug Info (Development)</h3>
                <pre className="text-xs text-yellow-700 overflow-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
