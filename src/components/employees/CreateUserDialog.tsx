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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create user account')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Refresh the page if we're closing after success
    if (success) {
      router.refresh()
    }

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

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
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
