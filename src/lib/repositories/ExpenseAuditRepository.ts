import { db } from '@/lib/database/client'
import dayjs from 'dayjs'

/**
 * Per-row audit trail for expenses, mirroring InvoiceAuditRepository.
 * Closes the audit gap where expense changes were previously untracked.
 */
export class ExpenseAuditRepository {
  /**
   * Create an audit record for an expense change.
   * For CREATE, previousData is empty; for DELETE, currentData is null.
   */
  async createAuditRecord(
    expenseId: number,
    actionType: 'CREATE' | 'UPDATE' | 'DELETE',
    previousData: Partial<{
      type: string
      amount: number | string
      notes: string
      agentid: number
      vendor_id: number
      issue_date: Date | string
      wkending: Date | string
    }> | null,
    currentData: Partial<{
      type: string
      amount: number | string
      notes: string
      agentid: number
      vendor_id: number
      issue_date: Date | string
      wkending: Date | string
    }> | null,
    changedBy: number,
    changeReason?: string,
    ipAddress?: string
  ): Promise<number> {
    const result = await db
      .insertInto('expense_audit')
      .values({
        expense_id: expenseId,
        action_type: actionType,
        changed_by: changedBy,
        changed_at: new Date(),

        previous_type: previousData?.type ?? null,
        previous_amount: previousData?.amount != null ? previousData.amount.toString() : null,
        previous_notes: previousData?.notes ?? null,
        previous_agentid: previousData?.agentid ?? null,
        previous_vendor_id: previousData?.vendor_id ?? null,
        previous_issue_date: previousData?.issue_date ? dayjs(previousData.issue_date).toDate() : null,
        previous_wkending: previousData?.wkending ? dayjs(previousData.wkending).toDate() : null,

        current_type: currentData?.type ?? null,
        current_amount: currentData?.amount != null ? currentData.amount.toString() : null,
        current_notes: currentData?.notes ?? null,
        current_agentid: currentData?.agentid ?? null,
        current_vendor_id: currentData?.vendor_id ?? null,
        current_issue_date: currentData?.issue_date ? dayjs(currentData.issue_date).toDate() : null,
        current_wkending: currentData?.wkending ? dayjs(currentData.wkending).toDate() : null,

        change_reason: changeReason ?? null,
        ip_address: ipAddress ?? null,
      })
      .executeTakeFirst()

    return Number(result.insertId)
  }
}

export const expenseAuditRepository = new ExpenseAuditRepository()
