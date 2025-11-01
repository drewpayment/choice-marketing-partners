import { requireAuth } from '@/lib/auth/server-auth'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { getEmployeeContext, getPayrollAccessSummary } from '@/lib/auth/payroll-access'
import PayrollList from '@/components/payroll/PayrollList'
import PayrollFilters from '@/components/payroll/PayrollFilters'
import { Suspense } from 'react'

interface PageProps {
  searchParams: {
    employeeId?: string
    vendorId?: string
    issueDate?: string
    startDate?: string
    endDate?: string
    status?: 'paid' | 'unpaid' | 'all'
    page?: string
    limit?: string
  }
}

export default async function PayrollPage({ searchParams }: PageProps) {
  // Require employee-level access or higher
  const session = await requireAuth('EMPLOYEE')
  
  // Get user context for role-based data access
  const userContext = await getEmployeeContext(
    session.user.employeeId,
    session.user.isAdmin,
    session.user.isManager
  )
  // Build filters from search params
  const filters = {
    employeeId: searchParams.employeeId ? parseInt(searchParams.employeeId) : undefined,
    vendorId: searchParams.vendorId ? parseInt(searchParams.vendorId) : undefined,
    issueDate: searchParams.issueDate,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
    status: searchParams.status || 'all',
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    limit: searchParams.limit ? parseInt(searchParams.limit) : 20
  }

  // Get payroll data
  const payrollRepository = new PayrollRepository()
  const [payrollResponse, accessSummary] = await Promise.all([
    payrollRepository.getPayrollSummary(filters, userContext),
    getPayrollAccessSummary(userContext)
  ])

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="px-4 py-6 sm:px-0">
        <div className="border-b border-gray-200 pb-5">
          <h1 className="text-3xl font-bold leading-6 text-gray-900">
            Payroll
          </h1>
          <p className="mt-2 max-w-4xl text-sm text-gray-500">
            View and manage payroll information for agents and vendors.
            {!session.user.isAdmin && (
              <span className="block mt-1">
                Access limited to your {session.user.isManager ? 'managed employees and' : ''} data.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Access Summary */}
      <div className="px-4 mb-6 sm:px-0">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Accessible Agents
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {accessSummary.accessibleAgents}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Accessible Vendors
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {accessSummary.accessibleVendors}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Issue Dates
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {accessSummary.accessibleIssueDates}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Paystubs
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {accessSummary.totalPaystubs}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 mb-6 sm:px-0">
        <Suspense fallback={<div className="animate-pulse bg-white rounded-lg h-32"></div>}>
          <PayrollFilters
            initialFilters={filters}
            userContext={{ isAdmin: session.user.isAdmin, isManager: session.user.isManager }}
          />
        </Suspense>
      </div>

      {/* Payroll List */}
      <div className="px-4 sm:px-0">
        <Suspense fallback={<div className="animate-pulse bg-white rounded-lg h-96"></div>}>
          <PayrollList 
            data={payrollResponse.data}
            pagination={payrollResponse.pagination}
            userContext={userContext}
          />
        </Suspense>
      </div>
    </div>
  )
}
