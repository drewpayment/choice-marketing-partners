/**
 * @jest-environment node
 */

// Mock dependencies FIRST before any imports
jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(() => ({
      select: jest.fn(() => ({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            executeTakeFirst: jest.fn(),
          })),
          executeTakeFirst: jest.fn(),
        })),
      })),
    })),
    updateTable: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          execute: jest.fn(),
        })),
      })),
    })),
  },
}))

// Set environment variables
process.env.NEXTAUTH_SECRET = 'test-secret'

import { POST } from '../route'
import { generatePasswordResetToken } from '@/lib/auth/password-reset'

describe('POST /api/auth/reset-password', () => {
  it('returns 400 for missing token', async () => {
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password: 'newpassword123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Token is required')
  })

  it('returns 400 for short password', async () => {
    const token = generatePasswordResetToken('test@example.com', '123')
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password: 'short' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('at least 8 characters')
  })

  it('returns 400 for invalid token', async () => {
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid', password: 'newpassword123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid or expired')
  })
})
