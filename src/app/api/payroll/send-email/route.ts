import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dayjs from 'dayjs'
import { authOptions } from '@/lib/auth/config'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { renderPaystubPdf } from '@/lib/pdf/PaystubPdf'
import { sendPaystubStatementEmail } from '@/lib/services/email'
import { logger } from '@/lib/utils/logger'

// @react-pdf/renderer requires the Node.js runtime (not Edge).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/payroll/send-email
 *
 * Emails a rendered pay-statement PDF to the employee the statement belongs to.
 *
 * Request body (JSON):
 *   { employeeId: number, vendorId: number, issueDate: string (YYYY-MM-DD),
 *     recipientEmail?: string }
 *
 * Authorization (enforced via PayrollRepository.getPaystubDetail, mirroring the
 * PDF route): admins may email any statement; managers any statement for a direct
 * report; a plain employee only their OWN statement. getPaystubDetail returns null
 * when access is not permitted, which surfaces here as a 404.
 *
 * The recipient is ALWAYS the statement employee's email as stored in the
 * `employees` table — the client-supplied `recipientEmail` is advisory only and is
 * never trusted. This guarantees an employee can only ever email their statement to
 * their own on-file address.
 *
 * Responses (JSON { success, message }):
 *   200 sent · 400 bad input · 401 unauthenticated · 404 not found / access denied
 *   422 employee has no email on file · 502 email provider failed
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      )
    }

    let body: { employeeId?: unknown; vendorId?: unknown; issueDate?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400 },
      )
    }

    const employeeId = Number(body.employeeId)
    const vendorId = Number(body.vendorId)
    const issueDate = typeof body.issueDate === 'string' ? body.issueDate : ''

    if (!Number.isInteger(employeeId) || !Number.isInteger(vendorId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid employee or vendor ID' },
        { status: 400 },
      )
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
      return NextResponse.json(
        { success: false, message: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 },
      )
    }

    // Authorization is enforced inside getPaystubDetail via userContext:
    // employees only see their own statements, managers their reports, admins all.
    const repository = new PayrollRepository()
    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin || false,
      session.user.isManager || false,
    )

    const paystubDetail = await repository.getPaystubDetail(
      employeeId,
      vendorId,
      issueDate,
      userContext,
    )

    if (!paystubDetail) {
      return NextResponse.json(
        { success: false, message: 'Pay statement not found or access denied' },
        { status: 404 },
      )
    }

    // Recipient is the employee's on-file address — never the client-supplied one.
    const recipientEmail = paystubDetail.employee.email?.trim()
    if (!recipientEmail) {
      return NextResponse.json(
        {
          success: false,
          message: 'This employee has no email address on file. Add one before sending.',
        },
        { status: 422 },
      )
    }

    // Reuse the same detail payload the on-screen statement / PDF route render.
    const buffer = await renderPaystubPdf(paystubDetail)

    const safeName = paystubDetail.employee.name
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
    const filename = `paystub_${safeName || 'employee'}_${issueDate}.pdf`

    const weekEnding = paystubDetail.weekending || dayjs(issueDate).format('MM-DD-YYYY')

    const result = await sendPaystubStatementEmail({
      to: recipientEmail,
      employeeName: paystubDetail.employee.name,
      vendorName: paystubDetail.vendor.name,
      weekEnding,
      pdf: buffer,
      filename,
    })

    if (!result.success) {
      logger.error('Pay statement email delivery failed:', result.error)
      return NextResponse.json(
        { success: false, message: 'Failed to send the pay statement email.' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Pay statement emailed to ${recipientEmail}.`,
    })
  } catch (error) {
    logger.error('Paystub send-email error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to send the pay statement email.' },
      { status: 500 },
    )
  }
}
