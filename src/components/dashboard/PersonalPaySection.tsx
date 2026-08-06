import Link from 'next/link'
import { PayrollSummary } from '@/lib/repositories/PayrollRepository'
import LatestStatementCard from '@/components/dashboard/LatestStatementCard'
import RecentStatementsList from '@/components/dashboard/RecentStatementsList'

interface PersonalPaySectionProps {
  /** The viewer's OWN statements, newest first (fetch with `scope: 'mine'`). */
  statements: PayrollSummary[]
  /** Builds the statement-detail href for a given row. */
  buildHref: (statement: PayrollSummary) => string
  /**
   * Heading rendered above the hero. Omitted on the rep home, where the pay
   * block IS the page and needs no label — keeping that layout unchanged.
   */
  title?: string
  /** Where "View all" points. Defaults to the unscoped payroll list. */
  viewAllHref?: string
  /**
   * Render the "No statements yet" card when the viewer has none. Reps only —
   * an elevated user with no statements of their own renders nothing at all,
   * rather than an empty hero on a page that is not about their pay.
   */
  showEmptyState?: boolean
}

/**
 * The viewer's own pay: hero card for the latest statement plus a compact list
 * of the ones before it. Shared by the rep home and the manager/admin home so
 * both render the same thing from the same markup.
 */
export default function PersonalPaySection({
  statements,
  buildHref,
  title,
  viewAllHref = '/payroll',
  showEmptyState = false,
}: PersonalPaySectionProps) {
  const latest = statements[0]
  const recent = statements.slice(1, 7)

  if (!latest) {
    if (!showEmptyState) return null

    return (
      /* Empty state mirrors PayrollList's copy for reps with no statements. */
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="px-4 py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-foreground">No statements yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Your first statement will appear here once payroll is published. Questions? Contact
            your manager.
          </p>
        </div>
      </div>
    )
  }

  const body = (
    <>
      <LatestStatementCard statement={latest} href={buildHref(latest)} isPaid={latest.isPaid} />

      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent statements</h2>
            <Link
              href={viewAllHref}
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <RecentStatementsList statements={recent} buildHref={buildHref} />
        </section>
      )}
    </>
  )

  // Untitled (rep home): emit the blocks as bare siblings so the parent's
  // `space-y-6` rhythm is preserved exactly as before this was extracted.
  if (!title) return body

  return (
    <section aria-labelledby="personal-pay-heading" className="space-y-4">
      <h2 id="personal-pay-heading" className="text-xl font-semibold text-foreground">
        {title}
      </h2>
      {body}
    </section>
  )
}
