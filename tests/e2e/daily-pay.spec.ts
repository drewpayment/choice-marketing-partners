import { execSync } from 'child_process'
import { test, expect } from '../fixtures/auth'

/**
 * End-to-end test for the daily-pay punch tracking feature.
 *
 * The test deliberately uses real data + real DB joins because the bugs caught
 * during initial development were all mysql2/timezone interactions that unit
 * tests with mocks could not reproduce.
 *
 * `beforeAll` runs the seed script which:
 *   - Inserts an enrollment for Drew Payment (id=7) at CMP Corp (id=8) at $125/day
 *   - Inserts two pending punches with work_date=2026-01-14
 *   - Marks the matching paystub (/payroll/7/8/2026-01-28, weekend_date=2026-01-17)
 *     as unpaid so the reverse-approval flow can be exercised
 */

const PAYSTUB_URL = '/payroll/7/8/2026-01-28'

test.describe.configure({ mode: 'serial' })

test.beforeAll(() => {
  execSync('bun run scripts/seed-daily-pay-test.ts', { stdio: 'inherit' })
})

test.describe('Daily Pay — admin approval flow', () => {
  test('punch approval shows up on the matching paystub', async ({ adminPage }) => {
    await adminPage.goto('/admin/daily-pay/punches')
    await adminPage.waitForLoadState('networkidle')

    // Filter to Pending and click the first pending punch row
    const pendingPill = adminPage.getByRole('button', { name: /Pending review/i })
    await pendingPill.click()
    await expect(adminPage.getByText(/Drew Payment/).first()).toBeVisible()

    // Click the earliest pending punch (8:42 AM EST entry from the seed)
    await adminPage.getByText(/Drew Payment/).first().click()

    // Inspector should display the daily rate and the wired-up Approve button
    await expect(adminPage.getByText('$125.00').first()).toBeVisible()
    const approveBtn = adminPage.getByRole('button', { name: /Approve · \$125\.00/ })
    await expect(approveBtn).toBeEnabled()

    await approveBtn.click()

    // Toast confirms; navigate to paystub
    await adminPage.goto(PAYSTUB_URL)
    await adminPage.waitForLoadState('networkidle')

    // The new green-bordered KPI card with NEW badge
    await expect(adminPage.getByText('Daily Pay').first()).toBeVisible()
    await expect(adminPage.getByText('1 day(s) approved')).toBeVisible()

    // The Daily Incentives section with the line item
    await expect(adminPage.getByText(/Daily Incentives/).first()).toBeVisible()
    await expect(adminPage.getByText('Daily incentive')).toBeVisible()

    // Subtotal totals match the approved amount
    await expect(adminPage.getByText('Subtotal — Daily Incentives')).toBeVisible()
    const cells = adminPage.locator('td:has-text("$125.00")')
    await expect(cells.first()).toBeVisible()
  })

  test('approving a second punch on the same day requires confirmation', async ({ adminPage }) => {
    await adminPage.goto('/admin/daily-pay/punches')
    await adminPage.waitForLoadState('networkidle')
    await adminPage.getByRole('button', { name: /Pending review/i }).click()

    // Click the remaining pending punch
    const remaining = adminPage.getByText(/Drew Payment/).first()
    await remaining.click()

    const approveBtn = adminPage.getByRole('button', { name: /Approve · \$125\.00/ })
    await approveBtn.click()

    // Same-day-confirmation dialog should open
    await expect(adminPage.getByText(/Approve a second punch on the same day/)).toBeVisible()

    // Approve button is disabled until checkbox is checked
    const dialogApprove = adminPage.getByRole('button', { name: /Approve second punch/ })
    await expect(dialogApprove).toBeDisabled()

    // Check the acknowledgement
    const checkbox = adminPage.getByRole('checkbox')
    await checkbox.check()

    await expect(dialogApprove).toBeEnabled()
    await dialogApprove.click()

    // Verify paystub now shows two daily-pay rows totaling $250
    await adminPage.goto(PAYSTUB_URL)
    await adminPage.waitForLoadState('networkidle')
    await expect(adminPage.getByText('2 day(s) approved')).toBeVisible()
    await expect(adminPage.getByText(/Daily Incentives \(2\)/)).toBeVisible()
  })

  test('reversing an approval removes the daily-pay line from the paystub', async ({ adminPage }) => {
    await adminPage.goto('/admin/daily-pay/punches')
    await adminPage.waitForLoadState('networkidle')
    await adminPage.getByRole('button', { name: /Approved/i }).click()

    // Click the first approved punch
    await adminPage.getByText(/Drew Payment/).first().click()

    const reverseBtn = adminPage.getByRole('button', { name: /Reverse approval/ })
    await reverseBtn.click()

    // Confirmation dialog
    await expect(adminPage.getByText(/Reverse this approved punch/)).toBeVisible()
    const confirmReverse = adminPage.getByRole('button', { name: /Reverse approval$/ })
    await confirmReverse.click()

    // Paystub should drop to 1 day approved (or remove the section entirely if 0)
    await adminPage.goto(PAYSTUB_URL)
    await adminPage.waitForLoadState('networkidle')

    // Either the count drops by one or the section disappears entirely.
    // Use a soft check — neither "(2)" nor "$250.00" should still be visible.
    await expect(adminPage.getByText(/Daily Incentives \(2\)/)).toHaveCount(0)
    await expect(adminPage.getByText('2 day(s) approved')).toHaveCount(0)
  })
})

test.describe('Daily Pay — settings page', () => {
  test('renders cutoff config and cron schedule', async ({ adminPage }) => {
    await adminPage.goto('/admin/daily-pay/settings')
    await expect(adminPage.getByRole('heading', { name: 'Cutoff settings' })).toBeVisible()
    await expect(adminPage.getByText(/Auto-reject policy/)).toBeVisible()
    await expect(adminPage.getByText(/Cron schedule/)).toBeVisible()
    await expect(adminPage.getByText(/\/api\/cron\/daily-pay-cutoff/)).toBeVisible()
  })
})

test.describe('Daily Pay — RBAC', () => {
  test('non-admin employee is blocked from /admin/daily-pay routes', async ({ employeePage }) => {
    const res = await employeePage.goto('/admin/daily-pay/punches')
    // Either redirected away from /admin or shown a 403/forbidden screen
    expect(employeePage.url()).not.toContain('/admin/daily-pay/punches')
  })
})
