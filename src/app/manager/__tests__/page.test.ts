/**
 * `/manager` is an orphaned stub that now redirects to /dashboard. It is only
 * reachable by bookmark, so the guards that stop it becoming an open redirect
 * for unauthenticated / unauthorized visitors are worth pinning down.
 *
 * The page is a plain async server component (session lookup + redirect, no
 * rendering), so this needs no React test harness.
 */

/** Emulates the real `redirect()`, which throws to halt execution. */
class RedirectError extends Error {
  constructor(public readonly target: string) {
    super(`NEXT_REDIRECT:${target}`)
  }
}

const mockGetServerSession = jest.fn()
const mockRedirect = jest.fn((target: string) => {
  throw new RedirectError(target)
})

jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

jest.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

jest.mock('next/navigation', () => ({
  redirect: (target: string) => mockRedirect(target),
}))

import ManagerPage from '../page'

/** Runs the page and returns the single redirect target it attempted. */
async function redirectTarget(): Promise<string> {
  try {
    await ManagerPage()
  } catch (error) {
    if (error instanceof RedirectError) return error.target
    throw error
  }
  throw new Error('ManagerPage returned without redirecting')
}

describe('/manager redirects to /dashboard behind its auth guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends a manager to /dashboard, where their own pay now lives', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { isAdmin: false, isManager: true },
    })

    expect(await redirectTarget()).toBe('/dashboard')
    expect(mockRedirect).toHaveBeenCalledTimes(1)
  })

  it('sends an admin to /dashboard too', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { isAdmin: true, isManager: false },
    })

    expect(await redirectTarget()).toBe('/dashboard')
  })

  it('sends an unauthenticated visitor to /auth/signin, never to /dashboard', async () => {
    mockGetServerSession.mockResolvedValue(null)

    expect(await redirectTarget()).toBe('/auth/signin')
    // The guard must short-circuit — no second, unauthorized redirect.
    expect(mockRedirect).toHaveBeenCalledTimes(1)
    expect(mockRedirect).not.toHaveBeenCalledWith('/dashboard')
  })

  it('sends a session with no user to /auth/signin', async () => {
    mockGetServerSession.mockResolvedValue({})

    expect(await redirectTarget()).toBe('/auth/signin')
  })

  it('sends a plain employee to /forbidden, never to /dashboard', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { isAdmin: false, isManager: false },
    })

    expect(await redirectTarget()).toBe('/forbidden')
    expect(mockRedirect).toHaveBeenCalledTimes(1)
    expect(mockRedirect).not.toHaveBeenCalledWith('/dashboard')
  })
})
