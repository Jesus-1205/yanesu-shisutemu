interface ChartSkeletonProps {
  height?: number;
}

export default function ChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="flex h-full items-end gap-2 px-4 pb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-slate-200"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 w-10 rounded bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
