# Employee User Management Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace alert-based password reset with shadcn UI dialogs, enable post-creation user account creation for employees, and consolidate all user account management to employee detail pages.

**Architecture:** Modify existing PasswordResetDialog to support auto-generate mode, create new CreateUserDialog component for post-creation user association, add new API endpoint for user creation, update employee detail page with User Account Actions card, and remove password reset from employee list view.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, shadcn/ui, Kysely (SQL), bcrypt, Zod validation, NextAuth

---

## Task 1: Remove Password Reset from Employee List

**Goal:** Simplify employee list cards by removing password reset functionality (will be moved to detail page only).

**Files:**
- Modify: `src/components/employees/EmployeeList.tsx:151-178` (remove handler)
- Modify: `src/components/employees/EmployeeList.tsx:292-299` (remove button)

### Step 1: Remove handlePasswordReset function

**Edit:** `src/components/employees/EmployeeList.tsx`

Remove lines 151-178 (the entire `handlePasswordReset` function):

```typescript
// DELETE THIS ENTIRE FUNCTION:
const handlePasswordReset = async (employeeId: string, employeeName: string) => {
  const newPassword = prompt(`Enter new password for ${employeeName}:`)
  if (!newPassword) {
    return
  }

  if (newPassword.length < 8) {
    alert('Password must be at least 8 characters')
    return
  }

  try {
    const response = await fetch(`/api/employees/${employeeId}/password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })

    if (!response.ok) {
      throw new Error('Failed to reset password')
    }

    alert('Password reset successfully!')
  } catch (error) {
    console.error('Error resetting password:', error)
    alert('Failed to reset password. Please try again.')
  }
}
```

### Step 2: Remove key icon button from employee cards

**Edit:** `src/components/employees/EmployeeList.tsx`

Remove lines 292-299 (the password reset button in the card):

```typescript
// DELETE THIS BUTTON:
{employee.hasUser && (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => handlePasswordReset(employee.id, employee.name)}
    title="Reset Password"
  >
    <Key className="h-4 w-4" />
  </Button>
)}
```

### Step 3: Remove unused Key import

**Edit:** `src/components/employees/EmployeeList.tsx`

Find the lucide-react import and remove `Key`:

```typescript
// BEFORE:
import { Edit, Trash2, RotateCcw, Key } from 'lucide-react'

// AFTER:
import { Edit, Trash2, RotateCcw } from 'lucide-react'
```

### Step 4: Verify changes

**Run:** `npm run build`

**Expected:** Build succeeds with no TypeScript errors

### Step 5: Commit

```bash
git add src/components/employees/EmployeeList.tsx
git commit -m "refactor: remove password reset from employee list view

- Remove handlePasswordReset function
- Remove key icon button from employee cards
- Password reset will be available only from detail page"
```

---

## Task 2: Modify PasswordResetDialog for Auto-Generate Mode

**Goal:** Add auto-generate mode to existing PasswordResetDialog component with preview-before-save flow.

**Files:**
- Modify: `src/components/employees/PasswordResetDialog.tsx`

### Step 1: Update props interface

**Edit:** `src/components/employees/PasswordResetDialog.tsx`

Find the props interface and add `mode` prop:

```typescript
// BEFORE:
interface PasswordResetDialogProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string
  employeeName: string
}

// AFTER:
interface PasswordResetDialogProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string
  employeeName: string
  mode?: 'manual' | 'auto' // Default: 'manual' for backward compatibility
}
```

### Step 2: Add state for generated password preview

**Edit:** `src/components/employees/PasswordResetDialog.tsx`

Add new state after existing state declarations:

```typescript
const [generatedPassword, setGeneratedPassword] = useState<string>('')
const [isGenerated, setIsGenerated] = useState(false)
```

### Step 3: Add handleGenerate function

**Edit:** `src/components/employees/PasswordResetDialog.tsx`

Add this function before the `handleSubmit` function:

```typescript
const handleGenerate = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  setGeneratedPassword(password)
  setIsGenerated(true)
}
```

### Step 4: Update handleSubmit for auto mode

**Edit:** `src/components/employees/PasswordResetDialog.tsx`

Modify `handleSubmit` to use generated password in auto mode:

```typescript
const handleSubmit = async () => {
  const passwordToUse = mode === 'auto' ? generatedPassword : password

  if (!passwordToUse || passwordToUse.length < 8) {
    setError('Password must be at least 8 characters')
    return
  }

  if (mode === 'manual' && passwordToUse !== confirmPassword) {
    setError('Passwords do not match')
    return
  }

  setLoading(true)
  setError('')

  try {
    const response = await fetch(`/api/employees/${employeeId}/password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordToUse }),
    })

    if (!response.ok) {
      throw new Error('Failed to reset password')
    }

    setSuccess(true)
    setTimeout(() => {
      onClose()
      // Reset state
      setPassword('')
      setConfirmPassword('')
      setGeneratedPassword('')
      setIsGenerated(false)
      setSuccess(false)
      setError('')
    }, 2000)
  } catch (error) {
    setError('Failed to reset password. Please try again.')
  } finally {
    setLoading(false)
  }
}
```

### Step 5: Update dialog content for auto mode

**Edit:** `src/components/employees/PasswordResetDialog.tsx`

Replace the dialog content section with conditional rendering:

```typescript
<DialogContent className="sm:max-w-md">
  <DialogHeader>
    <DialogTitle>Reset Password</DialogTitle>
    <DialogDescription>
      {mode === 'auto'
        ? `Generate a new password for ${employeeName}.`
        : `Enter a new password for ${employeeName}.`}
    </DialogDescription>
  </DialogHeader>

  {success ? (
    <Alert>
      <Check className="h-4 w-4" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>
        Password has been reset successfully.
      </AlertDescription>
    </Alert>
  ) : (
    <>
      {mode === 'auto' ? (
        // Auto-generate mode UI
        <div className="space-y-4">
          {!isGenerated ? (
            <div className="space-y-2">
              <Alert>
                <AlertDescription>
                  A secure random password will be generated. You'll be able to review it before saving.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleGenerate}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate New Password
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Generated Password</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={generatedPassword}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword)
                    }}
                    title="Copy password"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Saving...' : 'Save Password'}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Manual mode UI (existing)
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="flex gap-2">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                type="button"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  )}
</DialogContent>
```

### Step 6: Add missing imports

**Edit:** `src/components/employees/PasswordResetDialog.tsx`

Update imports at the top:

```typescript
import { Copy, RefreshCw, Check, Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
```

### Step 7: Verify changes

**Run:** `npm run build`

**Expected:** Build succeeds with no TypeScript errors

### Step 8: Commit

```bash
git add src/components/employees/PasswordResetDialog.tsx
git commit -m "feat: add auto-generate mode to PasswordResetDialog

- Add mode prop ('manual' | 'auto')
- Implement generate → preview → save flow for auto mode
- Add copy-to-clipboard for generated passwords
- Maintain backward compatibility with manual mode"
```

---

## Task 3: Create CreateUserDialog Component

**Goal:** Build new dialog component for creating user accounts for existing employees.

**Files:**
- Create: `src/components/employees/CreateUserDialog.tsx`

### Step 1: Create component file with imports

**Create:** `src/components/employees/CreateUserDialog.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Copy, Check, UserPlus, Loader2 } from 'lucide-react'

interface CreateUserDialogProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string
  employeeName: string
  employeeEmail: string
}

export function CreateUserDialog({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeEmail,
}: CreateUserDialogProps) {
  const router = useRouter()
  const [role, setRole] = useState<'admin' | 'author' | 'subscriber'>('subscriber')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/employees/${employeeId}/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create user account')
      }

      const data = await response.json()
      setGeneratedPassword(data.password)
      setSuccess(true)

      // Refresh the page to show updated user account
      setTimeout(() => {
        router.refresh()
        handleClose()
      }, 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create user account')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    // Reset state after closing
    setTimeout(() => {
      setRole('subscriber')
      setError('')
      setSuccess(false)
      setGeneratedPassword('')
      setCopied(false)
    }, 300)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create User Account</DialogTitle>
          <DialogDescription>
            Create a user account for {employeeName} ({employeeEmail})
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                User account created successfully. A welcome email has been sent to {employeeEmail}.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Generated Password</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={generatedPassword}
                  readOnly
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copy password"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Save this password - it won't be shown again.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">User Role</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscriber">Subscriber</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                A secure password will be generated and sent via email.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

### Step 2: Verify component builds

**Run:** `npm run build`

**Expected:** Build succeeds with no TypeScript errors

### Step 3: Commit

```bash
git add src/components/employees/CreateUserDialog.tsx
git commit -m "feat: create CreateUserDialog component

- Dialog for creating user accounts for existing employees
- Role selector with admin/author/subscriber options
- Auto-generates password and sends welcome email
- Shows generated password with copy button
- Auto-refreshes parent page after success"
```

---

## Task 4: Create API Endpoint for User Creation

**Goal:** Build POST endpoint to create user accounts for existing employees.

**Files:**
- Create: `src/app/api/employees/[id]/create-user/route.ts`

### Step 1: Create the API route file

**Create:** `src/app/api/employees/[id]/create-user/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { sendWelcomeEmail } from '@/lib/email'

// Generate secure random password
function generatePassword(length: number = 10): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)

  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length]
  }

  return password
}

const createUserSchema = z.object({
  role: z.enum(['admin', 'author', 'subscriber']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body
    const body = await request.json()
    const { role } = createUserSchema.parse(body)

    const employeeId = params.id

    // Check if employee exists
    const employee = await db
      .selectFrom('employees')
      .select(['id', 'name', 'email'])
      .where('id', '=', employeeId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if user already exists for this employee
    const existingUser = await db
      .selectFrom('employee_user')
      .select('user_id')
      .where('employee_id', '=', employeeId)
      .executeTakeFirst()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User account already exists for this employee' },
        { status: 409 }
      )
    }

    // Generate password
    const password = generatePassword(10)
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user and link to employee in a transaction
    const result = await db.transaction().execute(async (trx) => {
      // Create user
      const user = await trx
        .insertInto('users')
        .values({
          email: employee.email,
          name: employee.name,
          password: hashedPassword,
          role: role,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning(['id', 'email', 'role'])
        .executeTakeFirstOrThrow()

      // Link employee to user
      await trx
        .insertInto('employee_user')
        .values({
          employee_id: employeeId,
          user_id: user.id,
          created_at: new Date(),
        })
        .execute()

      return user
    })

    // Send welcome email
    try {
      await sendWelcomeEmail({
        to: employee.email,
        name: employee.name,
        password: password,
      })
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'User account created successfully',
      password: password, // Return password for UI display (shown once)
      user: {
        id: result.id,
        email: result.email,
        role: result.role,
      },
    })
  } catch (error) {
    console.error('Error creating user:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Step 2: Verify route builds

**Run:** `npm run build`

**Expected:** Build succeeds with no TypeScript errors

### Step 3: Test the endpoint (manual verification after full implementation)

**Note:** This will be tested in Task 5 after integrating with the UI.

### Step 4: Commit

```bash
git add src/app/api/employees/[id]/create-user/route.ts
git commit -m "feat: add API endpoint for creating user accounts

- POST /api/employees/[id]/create-user endpoint
- Validates employee exists and has no existing user
- Auto-generates secure password
- Creates user and employee_user records in transaction
- Sends welcome email with credentials
- Returns generated password for UI display"
```

---

## Task 5: Add User Account Actions Card to Employee Detail Page

**Goal:** Add new card to employee detail page with conditional Create User / Reset Password buttons.

**Files:**
- Modify: `src/app/(portal)/admin/employees/[id]/page.tsx`

### Step 1: Read the current detail page

**Read:** `src/app/(portal)/admin/employees/[id]/page.tsx`

**Action:** Examine the current structure to understand where to add the new card.

### Step 2: Create client component for User Account Actions

**Create:** `src/components/employees/UserAccountActions.tsx`

```typescript
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
```

### Step 3: Commit the client component

```bash
git add src/components/employees/UserAccountActions.tsx
git commit -m "feat: create UserAccountActions component

- Client component for user account management actions
- Conditionally shows Create User or Reset Password button
- Manages dialog state for PasswordResetDialog and CreateUserDialog
- Uses auto mode for password reset"
```

### Step 4: Import and add component to detail page

**Edit:** `src/app/(portal)/admin/employees/[id]/page.tsx`

Add import at the top:

```typescript
import { UserAccountActions } from '@/components/employees/UserAccountActions'
```

Add the component in the appropriate location (before the User Account card, after Employee Overview):

```typescript
{/* User Account Actions */}
<UserAccountActions
  employee={{
    id: employee.id,
    name: employee.name,
    email: employee.email,
    hasUser: !!employee.user,
  }}
/>
```

**Note:** You'll need to examine the exact structure of the page to place this correctly. It should appear before the existing "User Account" card section.

### Step 5: Verify the page builds

**Run:** `npm run build`

**Expected:** Build succeeds with no TypeScript errors

### Step 6: Commit

```bash
git add src/app/(portal)/admin/employees/[id]/page.tsx
git commit -m "feat: add User Account Actions card to employee detail page

- Import and render UserAccountActions component
- Positioned before existing User Account information card
- Provides Create User and Reset Password functionality"
```

---

## Task 6: Final Testing and Verification

**Goal:** Verify all functionality works end-to-end.

### Step 1: Start development server

**Run:** `npm run dev`

**Expected:** Server starts without errors

### Step 2: Test password reset removal from list

**Action:** Navigate to `/admin/employees`

**Verify:**
- Employee cards no longer show key icon for password reset
- Only Edit and Delete/Restore buttons are visible

### Step 3: Test Create User flow

**Action:**
1. Navigate to an employee detail page for an employee without a user account
2. Find the "User Account Actions" card
3. Click "Create User Account" button
4. Select a role from dropdown
5. Click "Create Account"

**Verify:**
- Dialog opens with role selector
- Submit creates user account
- Success message shows with generated password
- Password can be copied to clipboard
- Dialog closes and page refreshes
- User Account card now shows user information
- User Account Actions card now shows "Reset Password" button
- Welcome email is sent (check email logs or inbox)

### Step 4: Test Reset Password flow

**Action:**
1. Navigate to an employee detail page with a user account
2. Find the "User Account Actions" card
3. Click "Reset Password" button
4. Click "Generate New Password"
5. Review generated password
6. Click "Regenerate" to test regeneration
7. Click "Save Password"

**Verify:**
- Dialog opens in auto-generate mode
- Generate button creates random password
- Password is displayed with copy button
- Regenerate button creates new password
- Save button updates password
- Success message appears
- Dialog auto-closes after 2 seconds
- Password can be copied to clipboard

### Step 5: Test error cases

**Test:**
1. Try creating user for employee that already has one
2. Try creating user with invalid role
3. Test network error scenarios

**Verify:**
- Appropriate error messages are displayed
- UI remains stable
- Can retry after error

### Step 6: Visual and accessibility review

**Review:**
- All dialogs use consistent shadcn UI styling
- Buttons have proper loading states
- Focus management works correctly (Escape closes dialogs, Tab navigation)
- Mobile responsive layout works
- Color contrast is sufficient
- ARIA labels are present

### Step 7: Final commit

**If any bugs were found and fixed:**

```bash
git add .
git commit -m "fix: address issues found during testing

- [List any fixes made]"
```

**If everything works:**

```bash
git add .
git commit -m "test: verify all user account management features

- Confirmed password reset removed from employee list
- Verified Create User flow with email sending
- Verified Reset Password flow in auto mode
- All error cases handled properly
- UI/UX matches design specifications"
```

---

## Implementation Complete

**Files Created:**
1. `src/components/employees/CreateUserDialog.tsx` - Dialog for creating user accounts
2. `src/components/employees/UserAccountActions.tsx` - Actions card component
3. `src/app/api/employees/[id]/create-user/route.ts` - API endpoint for user creation
4. `docs/plans/2025-10-26-employee-user-management-improvements.md` - This plan

**Files Modified:**
1. `src/components/employees/EmployeeList.tsx` - Removed password reset button
2. `src/components/employees/PasswordResetDialog.tsx` - Added auto-generate mode
3. `src/app/(portal)/admin/employees/[id]/page.tsx` - Added User Account Actions card

**Key Features:**
- ✅ Password reset removed from employee list cards
- ✅ Password reset dialog with auto-generate mode
- ✅ Create user account for existing employees
- ✅ Welcome email sent with auto-generated password
- ✅ All functionality in employee detail page
- ✅ Consistent shadcn UI components throughout
- ✅ Preview-before-save flow for password reset
- ✅ Router.refresh() for seamless UI updates

**Testing Checklist:**
- [ ] Employee list no longer has password reset button
- [ ] Create User dialog opens and functions correctly
- [ ] User creation sends welcome email
- [ ] Generated password is displayed and copyable
- [ ] Password Reset dialog works in auto mode
- [ ] Generate → Preview → Save flow works
- [ ] Regenerate button creates new passwords
- [ ] Page refreshes after user creation
- [ ] Error handling works for all edge cases
- [ ] UI is responsive and accessible

---

**Next Steps:**
- Deploy to staging environment
- Conduct user acceptance testing
- Monitor email delivery
- Consider adding audit logging for user creation and password resets
