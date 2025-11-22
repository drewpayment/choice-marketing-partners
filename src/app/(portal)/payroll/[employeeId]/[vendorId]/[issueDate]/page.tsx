import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { requireAuth } from '@/lib/auth/server-auth'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import PaystubDetailView from '@/components/payroll/PaystubDetailView'
import { logger } from '@/lib/utils/logger'

interface PayrollDetailPageProps {
  params: Promise<{
    employeeId: string
    vendorId: string
    issueDate: string
  }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: PayrollDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const { employeeId, vendorId, issueDate } = resolvedParams
  
  return {
    title: `Paystub Details - Employee ${employeeId} - ${issueDate}`,
    description: `Detailed paystub information for employee ${employeeId}, vendor ${vendorId}, issue date ${issueDate}`,
  }
}

interface PayrollDetailPageProps {
  params: Promise<{
    employeeId: string
    vendorId: string
    issueDate: string
  }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PayrollDetailPage({ params, searchParams }: PayrollDetailPageProps) {
  const session = await requireAuth('EMPLOYEE')
  
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const employeeId = parseInt(resolvedParams.employeeId)
  const vendorId = parseInt(resolvedParams.vendorId)
  const issueDate = resolvedParams.issueDate

  // Get returnUrl from search params to preserve filters
  const returnUrl = typeof resolvedSearchParams.returnUrl === 'string' 
    ? resolvedSearchParams.returnUrl 
    : undefined

  if (isNaN(employeeId) || isNaN(vendorId)) {
    notFound()
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(issueDate)) {
    notFound()
  }

  try {
    const repository = new PayrollRepository()
    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin || false,
      session.user.isManager || false
    )

    const paystubDetail = await repository.getPaystubDetail(
      employeeId,
      vendorId,
      issueDate,
      userContext
    )

    if (!paystubDetail) {
      notFound()
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <PaystubDetailView 
          paystub={paystubDetail}
          userContext={userContext}
          returnUrl={returnUrl}
        />
      </div>
    )
  } catch (error) {
    logger.error('Error loading payroll detail:', error)
    notFound()
  }
}
