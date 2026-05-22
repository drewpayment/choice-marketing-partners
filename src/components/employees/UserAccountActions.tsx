'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Key, UserPlus, Mail } from 'lucide-react'
import { PasswordResetDialog } from './PasswordResetDialog'
import { CreateUserDialog } from './CreateUserDialog'

interface UserAccountActionsProps {
  employee: {
    id: string
    name: string
    email: string
    hasUser: boolean
  }
  /** True when the linked user account exists but has not verified its email. */
  emailUnverified?: boolean
}

export function UserAccountActions({ employee, emailUnverified = false }: UserAccountActionsProps) {
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [resending, setResending] = useState(false)

  const handleResendVerification = async () => {
    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend verification email')
      }
      toast.success(data.message || 'Verification email sent')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to resend verification email'
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Account Actions</CardTitle>
          <CardDescription>
            {!employee.hasUser
              ? 'This employee does not have a user account yet'
              : emailUnverified
                ? 'This account has not verified its email address yet'
                : 'Manage user account for this employee'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employee.hasUser ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setShowPasswordReset(true)}
                variant="default"
                className="w-full sm:w-auto"
              >
                <Key className="mr-2 h-4 w-4" />
                Reset Password
              </Button>
              {emailUnverified && (
                <Button
                  onClick={handleResendVerification}
                  variant="outline"
                  disabled={resending}
                  className="w-full sm:w-auto"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {resending ? 'Sending...' : 'Resend verification email'}
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={() => setShowCreateUser(true)}
              variant="default"
              className="w-full sm:w-auto"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create User Account
            </Button>
          )}
        </CardContent>
      </Card>

      <PasswordResetDialog
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        employeeId={employee.id}
        employeeName={employee.name}
        mode="auto"
      />

      <CreateUserDialog
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        employeeId={employee.id}
        employeeName={employee.name}
        employeeEmail={employee.email}
      />
    </>
  )
}
