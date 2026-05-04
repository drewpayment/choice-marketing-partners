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
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle } from 'lucide-react'

export default function DoublePunchConfirmDialog({
  open,
  onOpenChange,
  employeeName,
  workDate,
  vendorName,
  amount,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  workDate: string
  vendorName: string
  amount: number
  onConfirm: () => void
}) {
  const [acknowledged, setAcknowledged] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[460px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--status-amber-50)]">
              <AlertTriangle className="h-5 w-5 text-[var(--status-amber-600)]" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-base font-bold text-[var(--ink-900)]">
                Approve a second punch on the same day?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1.5 text-sm leading-relaxed text-[var(--ink-600)]">
                <strong>{employeeName}</strong> already has an approved punch on{' '}
                <strong>{workDate}</strong> for <strong>{vendorName}</strong>. This will create a
                second pay record for the same work date.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="rounded-lg bg-[var(--ink-50)] p-3 text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-[var(--ink-500)]">This punch&apos;s amount</span>
            <span className="font-semibold tabular-nums text-[var(--status-amber-600)]">
              ${amount.toFixed(2)}
            </span>
          </div>
        </div>

        <label className="flex items-start gap-2 px-1 py-1 text-xs text-[var(--ink-600)]">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(v === true)}
            className="mt-0.5"
          />
          <span>I&apos;ve verified this is intentional (e.g. split shift, separate worksite).</span>
        </label>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setAcknowledged(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!acknowledged}
            onClick={() => {
              setAcknowledged(false)
              onConfirm()
            }}
            className="bg-[var(--status-green-600)] hover:bg-[#047857]"
          >
            Approve second punch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
