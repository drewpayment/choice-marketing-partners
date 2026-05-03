'use client'

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
import { Undo2, Info } from 'lucide-react'

export default function ReverseConfirmDialog({
  open,
  onOpenChange,
  amount,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[460px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--status-red-50)]">
              <Undo2 className="h-5 w-5 text-[var(--status-red-600)]" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-base font-bold text-[var(--ink-900)]">
                Reverse this approved punch?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1.5 text-sm leading-relaxed text-[var(--ink-600)]">
                The pay record will be marked reversed, the punch will move to{' '}
                <strong>Declined</strong>, and <strong>${amount.toFixed(2)}</strong> will be removed
                from this week&apos;s paystub.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="flex gap-2 rounded-lg bg-[var(--status-blue-50)] p-3 text-xs text-[#1e3a8a]">
          <Info className="h-3.5 w-3.5 flex-shrink-0 text-[var(--status-blue-600)]" />
          <span>
            Reversal is only permitted while the paystub is unpaid. Reversed punches cannot be
            re-approved — the employee must punch again.
          </span>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-[var(--status-red-600)] hover:bg-[#b91c1c]"
          >
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
            Reverse approval
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
