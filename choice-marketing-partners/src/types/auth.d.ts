import { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      isManager: boolean
      isActive: boolean
      employeeId?: number
      salesIds: string[]
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    isAdmin: boolean
    isManager: boolean
    isActive: boolean
    employeeId?: number
    salesIds: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isAdmin: boolean
    isManager: boolean
    isActive: boolean
    employeeId?: number
    salesIds: string[]
  }
}
