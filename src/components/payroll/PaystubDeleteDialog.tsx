'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface DeletionPreview {
  canDelete: boolean
  isPaid: boolean
  reason?: string
  agent?: { id: number; name: string }
  vendor?: { id: number; name: string }
  issueDate?: string
  summary?: {
    paystubCount: number
    invoiceCount: number
    overrideCount: number
    expenseCount: number
    paystubTotal: number
    invoiceTotal: number
    overrideTotal: number
    expenseTotal: number
  }
}

interface PaystubDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: DeletionPreview | null
  isLoadingPreview: boolean
  onConfirmDelete: (reason: string) => Promise<void>
}

export function PaystubDeleteDialog({
  open,
  onOpenChange,
  preview,
  isLoadingPreview,
  onConfirmDelete,
}: PaystubDeleteDialogProps) {
  const [reason, setReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [step, setStep] = useState<'preview' | 'confirm'>('preview')

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('')
      setStep('preview')
      setIsDeleting(false)
    }
    onOpenChange(newOpen)
  }

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setIsDeleting(true)
    try {
      await onConfirmDelete(reason.trim())
      handleOpenChange(false)
    } catch {
      setIsDeleting(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {step === 'preview' ? 'Delete Pay Statement' : 'Confirm Deletion'}
          </AlertDialogTitle>
        </AlertDialogHeader>

        {isLoadingPreview ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading preview...</span>
          </div>
        ) : preview && !preview.canDelete ? (
          <>
            <AlertDialogDescription>
              {preview.reason || 'This pay statement cannot be deleted.'}
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : preview && step === 'preview' ? (
          <>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to delete the pay statement for{' '}
                  <strong>{preview.agent?.name}</strong> from{' '}
                  <strong>{preview.vendor?.name}</strong> on{' '}
                  <strong>{preview.issueDate}</strong>.
                </p>
                <div className="rounded-md border p-4 space-y-2 text-sm">
                  <p className="font-medium">The following records will be permanently deleted:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between">
                      <span>Invoices:</span>
                      <Badge variant="secondary">{preview.summary?.invoiceCount ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{formatCurrency(preview.summary?.invoiceTotal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overrides:</span>
                      <Badge variant="secondary">{preview.summary?.overrideCount ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{formatCurrency(preview.summary?.overrideTotal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expenses:</span>
                      <Badge variant="secondary">{preview.summary?.expenseCount ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{formatCurrency(preview.summary?.expenseTotal ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  setStep('confirm')
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : preview && step === 'confirm' ? (
          <>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Please provide a reason for deleting this pay statement. This will be recorded in the audit log.</p>
                <Textarea
                  placeholder="Reason for deletion (required)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleConfirm()
                }}
                disabled={!reason.trim() || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Pay Statement'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  )
}
