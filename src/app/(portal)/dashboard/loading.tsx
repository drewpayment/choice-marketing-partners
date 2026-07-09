export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Greeting */}
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />

      {/* Hero statement card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-5 w-12 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-3 h-10 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Recent statements list */}
      <div>
        <div className="mb-3 h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex min-h-14 items-center gap-3 px-4 py-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-36 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
