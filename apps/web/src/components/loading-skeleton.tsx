export function SkeletonLine({ width = '100%', height = '16px' }: { width?: string; height?: string }) {
  return (
    <div
      className="bg-slate-800 rounded animate-pulse"
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-slate-700/50 animate-pulse" />
        <div className="w-12 h-5 rounded-full bg-slate-700/50 animate-pulse" />
      </div>
      <SkeletonLine width="40%" height="28px" />
      <SkeletonLine width="60%" height="14px" />
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-800/50">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === 0 ? '30%' : `${Math.floor(70 / (cols - 1))}%`}
          height="14px"
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine
            key={i}
            width={i === 0 ? '30%' : `${Math.floor(70 / (cols - 1))}%`}
            height="12px"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="premium-container space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 animate-pulse" />
          <div className="space-y-2">
            <SkeletonLine width="200px" height="24px" />
            <SkeletonLine width="300px" height="14px" />
          </div>
        </div>
      </div>

      {/* Stat cards skeleton */}
      <SkeletonStatCards count={4} />

      {/* Table skeleton */}
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}
