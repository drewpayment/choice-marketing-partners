import type { UserContext } from '@/lib/auth/types'

// Mock the database client with chainable methods
const mockChain = {
  selectFrom: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  distinct: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue([]),
  executeTakeFirst: jest.fn().mockResolvedValue(null),
  insertInto: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  deleteFrom: jest.fn().mockReturnThis(),
  updateTable: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  transaction: jest.fn().mockReturnValue({
    execute: jest.fn().mockImplementation((fn) =>
      fn({
        selectFrom: jest.fn().mockReturnValue({
          selectAll: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirst: jest.fn().mockResolvedValue(null),
            }),
          }),
        }),
        deleteFrom: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                execute: jest.fn().mockResolvedValue([{ numAffectedRows: 1n }]),
              }),
            }),
            execute: jest.fn().mockResolvedValue([{ numAffectedRows: 1n }]),
          }),
        }),
      })
    ),
  }),
  fn: jest.fn().mockReturnValue('DATE_EXPR'),
}

// Make fn also have a count method
;(mockChain.fn as any).count = jest.fn().mockReturnValue({ as: jest.fn() })

jest.mock('@/lib/database/client', () => ({
  db: mockChain,
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

jest.mock('../InvoiceAuditRepository', () => ({
  invoiceAuditRepository: {
    createAuditRecord: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../InvoiceAuditRepository', () => ({
  invoiceAuditRepository: {
    createAuditRecord: jest.fn().mockResolvedValue(undefined),
  },
}))

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const managerCtx: UserContext = {
  employeeId: 2,
  isAdmin: false,
  isManager: true,
  managedEmployeeIds: [10, 11],
}
const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

describe('InvoiceRepository RBAC', () => {
  // Test both repository files
  describe.each([
    ['InvoiceRepository (main)', () => require('../InvoiceRepository')],
    ['InvoiceRepository.simple', () => require('../InvoiceRepository.simple')],
  ])('%s', (_name, getModule) => {
    let repo: any

    beforeEach(() => {
      jest.clearAllMocks()
      const mod = getModule()
      repo = new mod.InvoiceRepository()
    })

    describe('getInvoicePageResources', () => {
      it('throws for employee role', async () => {
        await expect(repo.getInvoicePageResources(employeeCtx)).rejects.toThrow(
          'Insufficient permissions'
        )
      })

      it('does not throw for manager', async () => {
        await expect(repo.getInvoicePageResources(managerCtx)).resolves.toBeDefined()
      })

      it('does not throw for admin', async () => {
        await expect(repo.getInvoicePageResources(adminCtx)).resolves.toBeDefined()
      })
    })

    describe('getInvoiceDetail', () => {
      it('throws for employee role', async () => {
        await expect(
          repo.getInvoiceDetail(10, 1, '01-01-2024', employeeCtx)
        ).rejects.toThrow('Insufficient permissions')
      })

      it('throws for manager accessing non-managed agent', async () => {
        await expect(
          repo.getInvoiceDetail(99, 1, '01-01-2024', managerCtx)
        ).rejects.toThrow('Access denied: agent not in your direct reports')
      })

      it('does not throw for manager accessing managed agent', async () => {
        // Agent 10 is in managerCtx.managedEmployeeIds
        await expect(
          repo.getInvoiceDetail(10, 1, '01-01-2024', managerCtx)
        ).resolves.toBeDefined()
      })

      it('does not throw for admin', async () => {
        await expect(
          repo.getInvoiceDetail(99, 1, '01-01-2024', adminCtx)
        ).resolves.toBeDefined()
      })
    })

    describe('saveInvoiceData', () => {
      it('throws for employee role', async () => {
        const request = { agentId: 10, vendorId: 1, vendor: '1', issueDate: '01-01-2024', weekending: '01-06-2024', sales: [], overrides: [], expenses: [] }
        await expect(repo.saveInvoiceData(request, employeeCtx)).rejects.toThrow(
          'Insufficient permissions'
        )
      })

      it('throws for manager saving for non-managed agent', async () => {
        const request = { agentId: 99, vendorId: 1, vendor: '1', issueDate: '01-01-2024', weekending: '01-06-2024', sales: [], overrides: [], expenses: [] }
        await expect(repo.saveInvoiceData(request, managerCtx)).rejects.toThrow(
          'Access denied: agent not in your direct reports'
        )
      })
    })
  })

  // Test delete methods on main InvoiceRepository only (simple repo doesn't have them)
  describe('InvoiceRepository (main) deletes', () => {
    let repo: any

    beforeEach(() => {
      jest.clearAllMocks()
      const mod = require('../InvoiceRepository')
      repo = new mod.InvoiceRepository()
    })

    describe('deleteInvoice', () => {
      it('throws for manager', async () => {
        await expect(repo.deleteInvoice(1, managerCtx)).rejects.toThrow(
          'Admin access required'
        )
      })

      it('throws for employee', async () => {
        await expect(repo.deleteInvoice(1, employeeCtx)).rejects.toThrow(
          'Admin access required'
        )
      })
    })

    describe('deleteInvoices', () => {
      it('throws for manager', async () => {
        await expect(repo.deleteInvoices([1, 2], managerCtx)).rejects.toThrow(
          'Admin access required'
        )
      })

      it('throws for employee', async () => {
        await expect(repo.deleteInvoices([1, 2], employeeCtx)).rejects.toThrow(
          'Admin access required'
        )
      })
    })


  })

  // Test getInvoiceById and getInvoicesByAgent on simple repo only (main repo doesn't have them)
  describe('InvoiceRepository.simple specific methods', () => {
    let repo: any

    beforeEach(() => {
      jest.clearAllMocks()
      const mod = require('../InvoiceRepository.simple')
      repo = new mod.InvoiceRepository()
    })

    describe('getInvoiceById', () => {
      it('throws for employee', async () => {
        await expect(repo.getInvoiceById(1, employeeCtx)).rejects.toThrow(
          'Insufficient permissions'
        )
      })

      it('throws for manager accessing non-managed agent invoice', async () => {
        // Mock getInvoiceById to return an invoice with agentid not in managed list
        mockChain.executeTakeFirst.mockResolvedValueOnce({ invoice_id: 1, agentid: 99 })
        await expect(repo.getInvoiceById(1, managerCtx)).rejects.toThrow(
          'Access denied: agent not in your direct reports'
        )
      })
    })

    describe('getInvoicesByAgent', () => {
      it('throws for employee', async () => {
        await expect(repo.getInvoicesByAgent(10, undefined, employeeCtx)).rejects.toThrow(
          'Insufficient permissions'
        )
      })

      it('throws for manager accessing non-managed agent', async () => {
        await expect(repo.getInvoicesByAgent(99, undefined, managerCtx)).rejects.toThrow(
          'Access denied: agent not in your direct reports'
        )
      })
    })
  })
})
