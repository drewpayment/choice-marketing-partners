'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIsClient } from '@/hooks/useIsClient'
import posthog from 'posthog-js'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotPasswordLink, setForgotPasswordLink] = useState(<></>)
  const router = useRouter()
  const isClient = useIsClient()

  useEffect(() => {
    const unsubscribe = posthog.onFeatureFlags((flags, flagVariants, errors) => {
      
      if (posthog.isFeatureEnabled('show-forgot-password') ||
        (errors?.errorsLoading && process.env.NEXT_PUBLIC_ENV === 'development')) {
        setForgotPasswordLink(<div className="text-sm">
          <a
            href="/auth/forgot-password"
            className="font-medium text-primary hover:text-primary/80"
          >
            Forgot your password?
          </a>
        </div>)
      } else {
        setForgotPasswordLink(<></>)
      }
      
    })

    return () => {
      unsubscribe()
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        // Get the session to check user role and redirect appropriately
        const session = await getSession()
        if (session?.user.isAdmin) {
          router.push('/admin')
        } else if (session?.user.isManager) {
          router.push('/manager')
        } else {
          router.push('/dashboard')
        }
      }
    } catch {
      setError('An error occurred during sign in')
    }

    setLoading(false)
  }

  // Show loading state until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <div className="max-w-md w-full space-y-8">
            <div>
              <div className="h-8 bg-muted rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto mt-2"></div>
            </div>
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Choice Marketing Partners Portal
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px" suppressHydrationWarning={true}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-foreground rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                suppressHydrationWarning={true}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-foreground rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                suppressHydrationWarning={true}
              />
            </div>
          </div>

          {forgotPasswordLink}

          {error && (
            <div className="text-destructive text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
