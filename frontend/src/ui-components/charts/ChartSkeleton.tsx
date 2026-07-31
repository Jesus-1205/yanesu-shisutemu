interface ChartSkeletonProps {
  height?: number;
}

export default function ChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="flex items-end gap-2 h-full px-4 pb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-200 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between px-4 mt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 bg-slate-200 rounded w-10" />
        ))}
      </div>
    </div>
  );
}
