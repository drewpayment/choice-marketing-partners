import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/database/client'
import { logger } from '@/lib/utils/logger'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find user by email
          const user = await db
            .selectFrom('users')
            .select(['id', 'email', 'password', 'name'])
            .where('email', '=', credentials.email)
            .executeTakeFirst()

          if (!user) {
            return null
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(credentials.password, user.password)
          
          if (!isValidPassword) {
            return null
          }

          // Get employee data for role information - direct relationship
          const employee = await db
            .selectFrom('employees')
            .select([
              'employees.id as employee_id',
              'employees.name as employee_name', 
              'employees.email as employee_email',
              'employees.is_admin',
              'employees.is_mgr',
              'employees.is_active',
              'employees.sales_id1',
              'employees.sales_id2',
              'employees.sales_id3'
            ])
            .where('employees.id', '=', user.id)
            .executeTakeFirst()

          // Check if user is a subscriber
          const subscriberLink = await db
            .selectFrom('subscriber_user')
            .innerJoin('subscribers', 'subscriber_user.subscriber_id', 'subscribers.id')
            .select(['subscribers.id as subscriber_id'])
            .where('subscriber_user.user_id', '=', user.id)
            .where('subscribers.deleted_at', 'is', null)
            .executeTakeFirst()

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || employee?.employee_name || 'User',
            // Add role information
            isAdmin: employee?.is_admin === 1,
            isManager: employee?.is_mgr === 1,
            isActive: employee?.is_active === 1 || !!subscriberLink,
            isSubscriber: !!subscriberLink,
            employeeId: employee?.employee_id,
            subscriberId: subscriberLink?.subscriber_id ?? null,
            salesIds: [
              employee?.sales_id1,
              employee?.sales_id2,
              employee?.sales_id3
            ].filter(Boolean) as string[]
          }
        } catch (error) {
          logger.error('Authentication error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add custom fields to JWT token
      if (user) {
        token.isAdmin = user.isAdmin
        token.isManager = user.isManager
        token.isActive = user.isActive
        token.isSubscriber = user.isSubscriber
        token.employeeId = user.employeeId
        token.subscriberId = user.subscriberId
        token.salesIds = user.salesIds
      }
      return token
    },
    async session({ session, token }) {
      // Add custom fields to session object
      if (token) {
        session.user = {
          ...session.user,
          id: token.sub!,
          isAdmin: token.isAdmin as boolean,
          isManager: token.isManager as boolean,
          isActive: token.isActive as boolean,
          isSubscriber: token.isSubscriber as boolean,
          employeeId: token.employeeId as number,
          subscriberId: token.subscriberId as number | null,
          salesIds: token.salesIds as string[]
        }
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects properly for Vercel deployments
      const redirectUrl = new URL(url, baseUrl)
      const baseURL = new URL(baseUrl)
      
      // If redirect is to same origin, allow it
      if (redirectUrl.origin === baseURL.origin) {
        return redirectUrl.href
      }
      
      // If redirect is relative, resolve against base URL
      if (url.startsWith('/')) {
        return `${baseURL.origin}${url}`
      }
      
      // Default to base URL for external redirects
      return baseUrl
    }
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Use NEXTAUTH_URL environment variable or default to current host
  ...(process.env.NODE_ENV === 'production' && {
    useSecureCookies: true,
  }),
}

export default NextAuth(authOptions)