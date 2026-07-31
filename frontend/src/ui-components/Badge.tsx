import type { ReactNode } from "react";

type BadgeVariant = "success" | "danger" | "info" | "warning" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, string> = {
  success: "bg-green-50 text-success ring-green-500/20",
  danger: "bg-red-50 text-danger ring-red-500/20",
  info: "bg-blue-50 text-info ring-blue-500/20",
  warning: "bg-orange-50 text-accent-orange ring-accent-orange/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/15",
};

export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
