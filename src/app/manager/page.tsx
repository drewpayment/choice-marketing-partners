import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function ManagerPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }
  
  if (!session.user.isAdmin && !session.user.isManager) {
    redirect('/forbidden')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {session.user.name}</p>
            </div>
            <div className="text-sm text-gray-500">
              Role: {session.user.isAdmin ? 'Administrator' : 'Manager'}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Team Management</h3>
              <p className="text-blue-700 text-sm mb-4">Manage your team members and their access.</p>
              <a 
                href="/manager/employees" 
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View Team →
              </a>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">Payroll Review</h3>
              <p className="text-green-700 text-sm mb-4">Review and approve payroll submissions.</p>
              <a 
                href="/manager/payroll" 
                className="inline-flex items-center text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Review Payroll →
              </a>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">Reports</h3>
              <p className="text-purple-700 text-sm mb-4">Generate and view performance reports.</p>
              <a 
                href="/manager/reports" 
                className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                View Reports →
              </a>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <a 
                href="/manager/dashboard"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Dashboard Overview
              </a>
              <a 
                href="/invoices"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
              >
                View Invoices
              </a>
              <a 
                href="/documents"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
              >
                Documents
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}