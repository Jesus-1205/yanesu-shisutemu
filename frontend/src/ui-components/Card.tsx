import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({
  children,
  className = "",
  padding = true,
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-surface shadow-sm ${padding ? "p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
