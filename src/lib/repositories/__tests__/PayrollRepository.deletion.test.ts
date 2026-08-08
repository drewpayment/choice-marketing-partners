import type { UserContext } from '@/lib/auth/types'

// Must use `var` (not const/let) so jest.mock hoisting doesn't hit TDZ
// eslint-disable-next-line no-var
var mockChain: any

jest.mock('../VendorFieldRepository', () => ({
  VendorFieldRepository: jest.fn().mockImplementation(() => ({
    getFieldsByVendor: jest.fn().mockResolvedValue([]),
  })),
}))

jest.mock('@/lib/database/client', () => {
  mockChain = {
    selectFrom: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insertInto: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    deleteFrom: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    executeTakeFirstOrThrow: jest.fn().mockResolvedValue({}),
    fn: Object.assign(jest.fn().mockReturnValue('DATE_EXPR'), {
      count: jest.fn().mockReturnValue({ as: jest.fn() }),
      sum: jest.fn().mockReturnValue({ as: jest.fn() }),
    }),
    transaction: jest.fn().mockReturnValue({
      execute: jest
        .fn()
        .mockImplementation((cb: (trx: unknown) => unknown) => cb(mockChain)),
    }),
  }
  return { db: mockChain }
})

jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(false),
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import { PayrollRepository } from '../PayrollRepository'

describe('PayrollRepository - Deletion', () => {
  let repo: PayrollRepository

  const adminCtx: UserContext = {
    employeeId: 1,
    isAdmin: true,
    isManager: false,
  }

  const managerCtx: UserContext = {
    employeeId: 2,
    isAdmin: false,
    isManager: true,
    managedEmployeeIds: [3, 4],
  }

  const employeeCtx: UserContext = {
    employeeId: 3,
    isAdmin: false,
    isManager: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    repo = new PayrollRepository()
  })

  describe('previewPaystubDeletion', () => {
    it('throws for non-admin (manager)', async () => {
      await expect(
        repo.previewPaystubDeletion(1, 1, '2026-01-01', managerCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('throws for non-admin (employee)', async () => {
      await expect(
        repo.previewPaystubDeletion(1, 1, '2026-01-01', employeeCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('returns canDelete: false when payroll is paid', async () => {
      mockChain.executeTakeFirst.mockResolvedValueOnce({ is_paid: 1 })
      const result = await repo.previewPaystubDeletion(1, 5, '2026-01-01', adminCtx)
      expect(result.canDelete).toBe(false)
      expect(result.isPaid).toBe(true)
    })
  })

  describe('deletePaystubWithAudit', () => {
    it('throws for non-admin (manager)', async () => {
      await expect(
        repo.deletePaystubWithAudit(1, 1, '2026-01-01', managerCtx, 2, 'test reason', '127.0.0.1')
      ).rejects.toThrow('Admin access required')
    })

    it('throws for non-admin (employee)', async () => {
      await expect(
        repo.deletePaystubWithAudit(1, 1, '2026-01-01', employeeCtx, 3, 'test reason', '127.0.0.1')
      ).rejects.toThrow('Admin access required')
    })

    describe('Postgres result handling', () => {
      // The transaction body reads two things back from the driver that behave
      // differently on Postgres: the audit row's generated key (RETURNING, since
      // InsertResult.insertId is always undefined) and the per-table delete counts
      // (Kysely's DeleteResult exposes `numDeletedRows`, not `numAffectedRows`).
      const primeTransaction = () => {
        mockChain.executeTakeFirst.mockResolvedValue({ id: 77, is_paid: 0 })
        mockChain.executeTakeFirstOrThrow.mockResolvedValue({ id: 5150 })
        mockChain.execute
          .mockResolvedValueOnce([]) // paystubs snapshot
          .mockResolvedValueOnce([]) // invoices snapshot
          .mockResolvedValueOnce([]) // overrides snapshot
          .mockResolvedValueOnce([]) // expenses snapshot
          .mockResolvedValueOnce([{ amount: '5.00' }, { amount: '6.00' }]) // advances snapshot
          .mockResolvedValueOnce([{ numDeletedRows: 7n }]) // delete invoices
          .mockResolvedValueOnce([{ numDeletedRows: 6n }]) // delete overrides
          .mockResolvedValueOnce([{ numDeletedRows: 5n }]) // delete expenses
          .mockResolvedValueOnce([]) // delete scheduled_expense_applications
          .mockResolvedValueOnce([{ numDeletedRows: 2n }]) // delete advances
          .mockResolvedValueOnce([{ numDeletedRows: 3n }]) // delete paystubs
          .mockResolvedValueOnce([{ numDeletedRows: 1n }]) // delete payroll
      }

      it('takes the audit id from RETURNING, not insertId', async () => {
        primeTransaction()

        const result = await repo.deletePaystubWithAudit(
          1, 5, '2026-01-01', adminCtx, 9, 'bad statement', '127.0.0.1'
        )

        expect(mockChain.returning).toHaveBeenCalledWith('id')
        expect(result.success).toBe(true)
        expect(result.auditId).toBe(5150)
        expect(Number.isNaN(result.auditId as number)).toBe(false)
      })

      it('binds the audit issue_date at LOCAL midnight, not UTC midnight', async () => {
        // node-postgres serialises a JS Date using the process's LOCAL calendar
        // fields, so `new Date('2026-01-09')` (UTC midnight) reaches a `date`
        // column as 2026-01-08 on any host west of UTC — proven end-to-end
        // against choice-postgres-dev under TZ=America/Detroit. This audit row is
        // the only forensic record of an irreversible payroll deletion, so a
        // restore keyed on issue_date has to be able to find it.
        //
        // The assertion below is only load-bearing off UTC (at UTC the two
        // parses coincide); run this file with e.g. TZ=America/Detroit to see it
        // fail against `new Date(issueDate)`.
        primeTransaction()

        await repo.deletePaystubWithAudit(
          1, 5, '2026-01-09', adminCtx, 9, 'bad statement', '127.0.0.1'
        )

        const auditValues = mockChain.values.mock.calls
          .map((call: unknown[]) => call[0] as Record<string, unknown>)
          .find((values: Record<string, unknown>) => values && 'deletion_reason' in values)

        expect(auditValues).toBeDefined()
        const bound = auditValues!.issue_date as Date
        expect(bound).toBeInstanceOf(Date)
        expect(bound.getFullYear()).toBe(2026)
        expect(bound.getMonth()).toBe(0)
        expect(bound.getDate()).toBe(9)
        expect(bound.getHours()).toBe(0)
        expect(bound.getMinutes()).toBe(0)
      })

      it('reports real per-table delete counts from numDeletedRows', async () => {
        primeTransaction()

        const result = await repo.deletePaystubWithAudit(
          1, 5, '2026-01-01', adminCtx, 9, 'bad statement', '127.0.0.1'
        )

        expect(result.deleted).toEqual({
          paystubs: 3,
          invoices: 7,
          overrides: 6,
          expenses: 5,
          advances: 2, // taken from the pre-delete snapshot, not the delete result
          payroll: 1,
        })
      })
    })
  })
})
