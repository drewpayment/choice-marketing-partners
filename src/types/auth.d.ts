import { DefaultSession, DefaultUser } from 'next-auth'

export interface ImpersonationSnapshot {
  actAsUserId: string
  targetName: string
  targetEmployeeId: number | null
  isAdmin: boolean
  isManager: boolean
  isSubscriber: boolean
  isActive: boolean
  employeeId?: number
  subscriberId?: number | null
  salesIds: string[]
  expiresAt: number
}

export interface SessionImpersonation {
  actorUserId: string
  actorName: string
  targetUserId: string
  targetName: string
  expiresAt: number
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      isManager: boolean
      isSuperAdmin: boolean
      isActive: boolean
      isSubscriber: boolean
      employeeId?: number
      subscriberId?: number | null
      salesIds: string[]
    } & DefaultSession['user']
    impersonation?: SessionImpersonation
  }

  interface User extends DefaultUser {
    isAdmin: boolean
    isManager: boolean
    isSuperAdmin: boolean
    isActive: boolean
    isSubscriber: boolean
    employeeId?: number
    subscriberId?: number | null
    salesIds: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isAdmin: boolean
    isManager: boolean
    isSuperAdmin: boolean
    isActive: boolean
    isSubscriber: boolean
    employeeId?: number
    subscriberId?: number | null
    salesIds: string[]
    impersonation?: ImpersonationSnapshot
  }
}
