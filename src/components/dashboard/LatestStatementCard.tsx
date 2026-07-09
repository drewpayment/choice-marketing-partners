import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { PayrollSummary } from '@/lib/repositories/PayrollRepository'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'
import { formatDate } from '@/lib/utils/date'

interface LatestStatementCardProps {
  statement: PayrollSummary
  href: string
  /**
   * Paid/unpaid state. Optional because no employee-accessible repository
   * method currently exposes `payroll.is_paid` per statement (see report).
   * When undefined, a recency ("New") badge is shown instead.
   */
  isPaid?: boolean
}

/**
 * Hero card for the rep home screen: the most recent statement's net pay,
 * front and center, tapping through to the full statement detail.
 */
export default function LatestStatementCard({ statement, href, isPaid }: LatestStatementCardProps) {
  const issued = new Date(`${statement.issueDate}T00:00:00`)
  const daysAgo = Math.floor((Date.now() - issued.getTime()) / 86_400_000)
  const isNew = daysAgo >= 0 && daysAgo <= 8

  return (
    <Link
      href={href}
      aria-label={`View your latest statement from ${statement.vendorName}, week ending ${formatDate(statement.issueDate)}, net pay ${formatCurrency(statement.netPay)}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md active:bg-muted">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Latest statement
          </span>
          {isPaid === undefined ? (
            isNew ? (
              <Badge className="border-primary/20 bg-primary/10 text-primary">New</Badge>
            ) : null
          ) : isPaid ? (
            <Badge className="border-primary/20 bg-primary/10 text-primary">Paid</Badge>
          ) : (
            <Badge variant="secondary">Pending</Badge>
          )}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p
              className={cn(
                'text-4xl font-bold tabular-nums',
                statement.netPay >= 0 ? 'text-primary' : 'text-destructive'
              )}
            >
              {formatCurrency(statement.netPay)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Net pay</p>
          </div>
          <ChevronRight
            className="h-6 w-6 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-sm">
          <span className="truncate font-medium text-foreground">{statement.vendorName}</span>
          <span className="flex-shrink-0 text-muted-foreground">
            Week ending {formatDate(statement.issueDate)}
          </span>
        </div>
      </div>
    </Link>
  )
}
