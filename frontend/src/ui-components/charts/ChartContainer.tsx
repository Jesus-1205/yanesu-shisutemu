import type { ReactNode } from "react";

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  className?: string;
  height?: number;
}

export default function ChartContainer({
  title,
  children,
  className = "",
  height = 300,
}: ChartContainerProps) {
  return (
    <div className={`bg-surface rounded-xl border border-slate-200 p-5 ${className}`}>
      <h2 className="text-lg font-semibold text-text-main mb-4">{title}</h2>
      <div style={{ width: "100%", height }}>
        {children}
      </div>
    </div>
  );
}
