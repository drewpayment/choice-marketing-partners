'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Key, UserPlus } from 'lucide-react'
import { PasswordResetDialog } from './PasswordResetDialog'
import { CreateUserDialog } from './CreateUserDialog'

interface UserAccountActionsProps {
  employee: {
    id: string
    name: string
    email: string
    hasUser: boolean
  }
}

export function UserAccountActions({ employee }: UserAccountActionsProps) {
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Account Actions</CardTitle>
          <CardDescription>
            {employee.hasUser
              ? 'Manage user account for this employee'
              : 'This employee does not have a user account yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employee.hasUser ? (
            <Button
              onClick={() => setShowPasswordReset(true)}
              variant="default"
              className="w-full sm:w-auto"
            >
              <Key className="mr-2 h-4 w-4" />
              Reset Password
            </Button>
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
