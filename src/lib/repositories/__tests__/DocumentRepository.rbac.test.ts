import { DocumentRepository } from '../DocumentRepository'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
    updateTable: jest.fn(),
    fn: {
      count: jest.fn().mockReturnValue({
        as: jest.fn().mockReturnValue('count_expr'),
      }),
    },
  },
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn() },
}))

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const managerCtx: UserContext = { employeeId: 2, isAdmin: false, isManager: true, managedEmployeeIds: [10] }
const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

describe('DocumentRepository RBAC', () => {
  let repo: DocumentRepository

  beforeEach(() => {
    repo = new DocumentRepository()
    jest.clearAllMocks()
  })

  describe('createDocument', () => {
    const docData = {
      name: 'test.pdf',
      description: 'A test document',
      fileSize: 1024,
      mimeType: 'application/pdf',
      blobUrl: 'https://blob.example.com/test.pdf',
      blobPathname: 'test.pdf',
      downloadUrl: 'https://blob.example.com/test.pdf',
      uploadedBy: 'admin@test.com',
    }

    it('should throw for non-admin (manager)', async () => {
      await expect(repo.createDocument(docData, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.createDocument(docData, employeeCtx)).rejects.toThrow('Admin access required')
    })

    it('should not throw for admin', async () => {
      // We don't need the DB mock to succeed, just verify no RBAC error
      const { db } = require('@/lib/database/client')
      const mockInsertResult = { insertId: BigInt(1) }
      const mockInsertedRecord = {
        id: 1, name: 'test.pdf', description: 'A test document',
        download_url: 'https://blob.example.com/test.pdf', blob_url: 'https://blob.example.com/test.pdf',
        mime_type: 'application/pdf', uploaded_by: 'admin@test.com',
        created_at: new Date(), updated_at: new Date(), file_size: 1024,
      }
      db.insertInto.mockReturnValue({
        values: jest.fn().mockReturnValue({
          executeTakeFirstOrThrow: jest.fn().mockResolvedValue(mockInsertResult),
        }),
      })
      db.selectFrom.mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirstOrThrow: jest.fn().mockResolvedValue(mockInsertedRecord),
            }),
            executeTakeFirstOrThrow: jest.fn().mockResolvedValue(mockInsertedRecord),
          }),
        }),
      })

      await expect(repo.createDocument(docData, adminCtx)).resolves.toBeDefined()
    })
  })

  describe('updateDocument', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.updateDocument(1, { name: 'new.pdf' }, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.updateDocument(1, { name: 'new.pdf' }, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('deleteDocuments', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.deleteDocuments([1, 2], managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.deleteDocuments([1, 2], employeeCtx)).rejects.toThrow('Admin access required')
    })
  })
})
