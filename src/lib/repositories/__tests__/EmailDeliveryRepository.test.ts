import { EmailDeliveryRepository } from '../EmailDeliveryRepository'
import { db } from '@/lib/database/client'

jest.mock('@/lib/database/client', () => ({
  db: {
    insertInto: jest.fn(),
    selectFrom: jest.fn(),
  },
}))

describe('EmailDeliveryRepository', () => {
  let repo: EmailDeliveryRepository

  beforeEach(() => {
    repo = new EmailDeliveryRepository()
    jest.clearAllMocks()
  })

  describe('recordEvent', () => {
    it('normalizes the email, serializes payload, and uses an idempotent insert', async () => {
      const execute = jest.fn().mockResolvedValue(undefined)
      const values = jest.fn().mockReturnValue({ execute })
      const ignore = jest.fn().mockReturnValue({ values })
      ;(db.insertInto as jest.Mock).mockReturnValue({ ignore })

      await repo.recordEvent({
        svixId: 'msg_123',
        email: '  HappyVWDude@Gmail.com ',
        eventType: 'email.bounced',
        bounceType: 'hard',
        payload: { type: 'email.bounced' },
      })

      expect(db.insertInto).toHaveBeenCalledWith('email_delivery_events')
      // INSERT IGNORE makes a repeated svix_id a no-op
      expect(ignore).toHaveBeenCalled()

      const inserted = values.mock.calls[0][0]
      expect(inserted.email).toBe('happyvwdude@gmail.com')
      expect(inserted.svix_id).toBe('msg_123')
      expect(inserted.event_type).toBe('email.bounced')
      expect(inserted.bounce_type).toBe('hard')
      expect(inserted.payload).toBe(JSON.stringify({ type: 'email.bounced' }))
      expect(execute).toHaveBeenCalled()
    })

    it('stores a null payload when none is provided', async () => {
      const execute = jest.fn().mockResolvedValue(undefined)
      const values = jest.fn().mockReturnValue({ execute })
      const ignore = jest.fn().mockReturnValue({ values })
      ;(db.insertInto as jest.Mock).mockReturnValue({ ignore })

      await repo.recordEvent({
        svixId: 'msg_456',
        email: 'a@b.com',
        eventType: 'email.delivered',
      })

      expect(values.mock.calls[0][0].payload).toBeNull()
    })
  })

  describe('getLatestStatusForEmail', () => {
    it('returns null when no delivery events exist for the address', async () => {
      const chain: Record<string, jest.Mock> = {}
      for (const m of ['select', 'where', 'orderBy', 'limit']) {
        chain[m] = jest.fn().mockReturnValue(chain)
      }
      chain.executeTakeFirst = jest.fn().mockResolvedValue(undefined)
      ;(db.selectFrom as jest.Mock).mockReturnValue(chain)

      const result = await repo.getLatestStatusForEmail('nobody@example.com')
      expect(result).toBeNull()
      // email is normalized before querying
      expect(chain.where).toHaveBeenCalledWith('email', '=', 'nobody@example.com')
    })
  })

  describe('getLatestStatusForEmails', () => {
    it('returns an empty map for an empty input list', async () => {
      const result = await repo.getLatestStatusForEmails([])
      expect(result.size).toBe(0)
      expect(db.selectFrom).not.toHaveBeenCalled()
    })
  })
})
