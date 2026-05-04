/**
 * Seeds test data for the daily-pay end-to-end browser test.
 *
 * Strategy: pick a real recent paystub. Add a daily-pay enrollment for that
 * (employee, vendor) pair. Insert a pending daily_punch_record whose work_date
 * falls inside that paystub's week, so when an admin approves it the resulting
 * daily_pay_record will join cleanly to the paystub via (employee, vendor, wkending).
 *
 * Idempotent: deletes any prior test enrollments/punches/pay_records first.
 *
 * Run with: bun run scripts/seed-daily-pay-test.ts
 */
import { db } from '@/lib/database/client'
import { dateOnlyToDate } from '@/lib/repositories/DailyPayRepository'

const TEST_EMPLOYEE_ID = 7 // Drew Payment
const TEST_VENDOR_ID = 8 // CMP Corp
// Real Saturday-ending paystub (paystub_id=723873). Saturday is the dominant
// week-ending convention in this DB, matching what wkendingFor() computes.
const PAYSTUB_WEEKEND_DATE = '2026-01-17'
const PAYSTUB_ISSUE_DATE = '2026-01-28'
// Wednesday in the week ending Sat 2026-01-17.
const WORK_DATE = '2026-01-14'

// Wipe prior test rows so the script is rerunnable
await db.deleteFrom('daily_pay_records').where('employee_id', '=', TEST_EMPLOYEE_ID).execute()
await db.deleteFrom('daily_punch_records').where('employee_id', '=', TEST_EMPLOYEE_ID).execute()
await db
  .deleteFrom('daily_pay_enrollments')
  .where('employee_id', '=', TEST_EMPLOYEE_ID)
  .where('vendor_id', '=', TEST_VENDOR_ID)
  .execute()

// Mark the matching payroll row UNPAID so the reverse-approval flow can be exercised.
// (The 409 paid-paystub guard is verified separately by the production data.)
const unpayResult = await db
  .updateTable('payroll')
  .set({ is_paid: 0 })
  .where('agent_id', '=', TEST_EMPLOYEE_ID)
  .where('vendor_id', '=', TEST_VENDOR_ID)
  .where(db.fn('DATE', ['pay_date']), '=', PAYSTUB_ISSUE_DATE)
  .executeTakeFirst()
console.log(`✓ Marked payroll row UNPAID (rows updated: ${Number(unpayResult.numUpdatedRows ?? 0)})`)

// 1. Create the enrollment
const enrollResult = await db
  .insertInto('daily_pay_enrollments')
  .values({
    employee_id: TEST_EMPLOYEE_ID,
    vendor_id: TEST_VENDOR_ID,
    daily_rate: '125.00',
    is_active: 1,
    created_by: null,
  })
  .executeTakeFirst()
const enrollmentId = Number(enrollResult.insertId)
console.log(`✓ Created enrollment id=${enrollmentId} ($125/day)`)

// 2. Insert a PENDING punch whose work_date is inside the paystub's week.
const punchedAt = new Date(`${WORK_DATE}T13:42:00.000Z`)
const punchResult = await db
  .insertInto('daily_punch_records')
  .values({
    employee_id: TEST_EMPLOYEE_ID,
    vendor_id: TEST_VENDOR_ID,
    punched_at: punchedAt,
    work_date: dateOnlyToDate(WORK_DATE),
    latitude: '42.331400',
    longitude: '-83.045800',
    accuracy_meters: 8,
    status: 'pending',
    ip_address: '127.0.0.1',
    user_agent: 'seed-script',
  })
  .executeTakeFirst()
const punch1Id = Number(punchResult.insertId)
console.log(`✓ Created pending punch id=${punch1Id} for work_date=${WORK_DATE}`)

// 3. Insert a SECOND pending punch later same day (for the double-day flow)
const punchedAt2 = new Date(`${WORK_DATE}T17:55:00.000Z`)
const punch2Result = await db
  .insertInto('daily_punch_records')
  .values({
    employee_id: TEST_EMPLOYEE_ID,
    vendor_id: TEST_VENDOR_ID,
    punched_at: punchedAt2,
    work_date: dateOnlyToDate(WORK_DATE),
    latitude: '42.350000',
    longitude: '-83.060000',
    accuracy_meters: 12,
    status: 'pending',
    ip_address: '127.0.0.1',
    user_agent: 'seed-script',
  })
  .executeTakeFirst()
const punch2Id = Number(punch2Result.insertId)
console.log(`✓ Created second pending punch id=${punch2Id} (same day, for double-punch test)`)

console.log(`
=== Test setup complete ===
Employee: ${TEST_EMPLOYEE_ID} (Drew Payment)
Vendor:   ${TEST_VENDOR_ID} (CMP Corp)
Paystub URL: /payroll/${TEST_EMPLOYEE_ID}/${TEST_VENDOR_ID}/${PAYSTUB_ISSUE_DATE}
Paystub weekend_date: ${PAYSTUB_WEEKEND_DATE}
Punch work_date: ${WORK_DATE} (computes wkending=${PAYSTUB_WEEKEND_DATE} via Saturday convention)
Punches:  ${punch1Id} (pending), ${punch2Id} (pending, same day)

Approve punch ${punch1Id} via /admin/daily-pay/punches → should create a $125
daily_pay_record with wkending=${PAYSTUB_WEEKEND_DATE}, joining the paystub above.
`)

process.exit(0)
