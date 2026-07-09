import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { renderPaystubPdf } from '@/lib/pdf/PaystubPdf'
import { logger } from '@/lib/utils/logger'

// @react-pdf/renderer requires the Node.js runtime (not Edge). Kept well under
// the 30s API cap since generation is a single synchronous render.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string; vendorId: string; issueDate: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const employeeId = parseInt(resolvedParams.employeeId)
    const vendorId = parseInt(resolvedParams.vendorId)
    const issueDate = resolvedParams.issueDate

    if (isNaN(employeeId) || isNaN(vendorId)) {
      return NextResponse.json({ error: 'Invalid employee or vendor ID' }, { status: 400 })
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(issueDate)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    // Authorization is enforced inside getPaystubDetail via userContext:
    // employees only see their own statements, managers their reports, admins all.
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
      return NextResponse.json({ error: 'Paystub not found or access denied' }, { status: 404 })
    }

    // Reuse the same detail payload the on-screen statement renders so the PDF
    // always matches what the user sees.
    const buffer = await renderPaystubPdf(paystubDetail)

    const safeName = paystubDetail.employee.name
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
    const filename = `paystub_${safeName || 'employee'}_${issueDate}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error('Paystub PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
