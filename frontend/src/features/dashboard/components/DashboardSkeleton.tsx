import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";

export default function DashboardSkeleton() {
  return (
    <div
      data-testid="dashboard-skeleton"
      aria-busy="true"
      className="space-y-6"
    >
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-200" />
      </div>

      {/* Shortcuts skeleton */}
      <div
        data-testid="skeleton-shortcuts"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface p-4"
          >
            <div className="size-9 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* KPI Cards skeleton */}
      <div
        data-testid="skeleton-kpis"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-12"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5 lg:col-span-2"
          >
            <div className="mb-2 flex items-start justify-between sm:mb-3">
              <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
              <div className="size-8 animate-pulse rounded-lg bg-slate-200" />
            </div>
            <div className="h-7 w-14 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5 lg:col-span-4">
          <div className="mb-2 flex items-start justify-between sm:mb-3">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="size-8 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="h-7 w-20 animate-pulse rounded bg-slate-200" />
        </div>
      </div>

      {/* Pending Invoices banner skeleton */}
      <div
        data-testid="skeleton-pending-invoices"
        className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 sm:p-5"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-amber-200/70" />
            <div className="h-6 w-24 animate-pulse rounded bg-amber-200/70" />
          </div>
          <div className="size-8 animate-pulse rounded-lg bg-amber-200/70" />
        </div>
      </div>

      {/* Chart card skeletons */}
      <div
        data-testid="skeleton-charts"
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <div className="rounded-xl border border-slate-200 bg-surface p-5 lg:col-span-7">
          <div className="mb-4 h-5 w-56 animate-pulse rounded bg-slate-200" />
          <ChartSkeleton height={280} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface p-5 lg:col-span-5">
          <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200" />
          <ChartSkeleton height={280} />
        </div>
      </div>
    </div>
  );
}
