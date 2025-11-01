// Mock dependencies FIRST before any imports
jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(() => ({
      select: jest.fn(() => ({
        where: jest.fn(() => ({
          executeTakeFirst: jest.fn(),
        })),
      })),
    })),
    insertInto: jest.fn(() => ({
      values: jest.fn(() => ({
        execute: jest.fn(),
      })),
    })),
  },
}))

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}))

// Set environment variables before importing route
process.env.RESEND_API_KEY = 'test-api-key'
process.env.NEXTAUTH_SECRET = 'test-secret'

import { POST } from '../route'

describe('POST /api/auth/request-reset', () => {
  it('returns success message for valid email', async () => {
    const request = new Request('http://localhost:3000/api/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('If an account exists')
  })

  it('returns 400 for missing email', async () => {
    const request = new Request('http://localhost:3000/api/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email is required')
  })
})
