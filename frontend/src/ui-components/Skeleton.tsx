import type { CSSProperties, ReactNode } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <span
      className={`block bg-slate-200 rounded animate-pulse ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  lastWidth?: string;
  className?: string;
}

export function SkeletonText({
  lines = 3,
  lastWidth = "60%",
  className = "",
}: SkeletonTextProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 rounded ${i === lines - 1 ? "" : "w-full"}`}
          style={i === lines - 1 ? { width: lastWidth } : undefined}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
  children?: ReactNode;
}

export function SkeletonCard({ className = "", children }: SkeletonCardProps) {
  return (
    <div className={`rounded-xl border border-slate-200 p-5 space-y-4 ${className}`} aria-hidden="true">
      {children ?? (
        <>
          <Skeleton className="h-4 w-2/5" />
          <SkeletonText lines={2} />
          <Skeleton className="h-9 w-full rounded-lg" />
        </>
      )}
    </div>
  );
}
