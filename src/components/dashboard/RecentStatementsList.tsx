import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { PayrollSummary } from '@/lib/repositories/PayrollRepository'
import { cn, formatCurrency } from '@/lib/utils'
import { formatDate } from '@/lib/utils/date'

interface RecentStatementsListProps {
  statements: PayrollSummary[]
  /** Builds the statement-detail href for a given row. */
  buildHref: (statement: PayrollSummary) => string
}

/**
 * Compact tap-through list of a rep's recent statements shown beneath the
 * hero card on the home screen.
 */
export default function RecentStatementsList({ statements, buildHref }: RecentStatementsListProps) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {statements.map((statement) => (
        <Link
          key={`${statement.employeeId}-${statement.vendorId}-${statement.issueDate}`}
          href={buildHref(statement)}
          aria-label={`View statement from ${statement.vendorName}, week ending ${formatDate(statement.issueDate)}, net pay ${formatCurrency(statement.netPay)}`}
          className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{statement.vendorName}</p>
            <p className="text-xs text-muted-foreground">
              Week ending {formatDate(statement.issueDate)}
            </p>
          </div>
          <span
            className={cn(
              'flex-shrink-0 text-sm font-semibold tabular-nums',
              statement.netPay >= 0 ? 'text-foreground' : 'text-destructive'
            )}
          >
            {formatCurrency(statement.netPay)}
          </span>
          <ChevronRight
            className="h-4 w-4 flex-shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  )
}
