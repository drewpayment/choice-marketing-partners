export default function PayrollDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-24 h-8 bg-muted rounded animate-pulse"></div>
            <div>
              <div className="w-48 h-6 bg-muted rounded animate-pulse mb-2"></div>
              <div className="w-64 h-4 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-28 h-8 bg-muted rounded animate-pulse"></div>
            <div className="w-24 h-8 bg-muted rounded animate-pulse"></div>
          </div>
        </div>

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-6">
              <div className="w-24 h-4 bg-muted rounded animate-pulse mb-3"></div>
              <div className="w-20 h-8 bg-muted rounded animate-pulse mb-2"></div>
              <div className="w-16 h-3 bg-muted rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Info cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-6">
              <div className="w-32 h-5 bg-muted rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <div className="w-16 h-4 bg-muted rounded animate-pulse"></div>
                    <div className="w-24 h-4 bg-muted rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-card border rounded-lg p-6">
          <div className="w-32 h-5 bg-muted rounded animate-pulse mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="w-16 h-4 bg-muted rounded animate-pulse"></div>
                <div className="w-32 h-4 bg-muted rounded animate-pulse"></div>
                <div className="w-24 h-4 bg-muted rounded animate-pulse"></div>
                <div className="w-20 h-4 bg-muted rounded animate-pulse"></div>
                <div className="w-16 h-4 bg-muted rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
