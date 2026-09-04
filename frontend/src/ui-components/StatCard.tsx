import { TrendingUp, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  trend?: {
    direction: "up" | "down";
    value: string;
  };
  variant?: "default" | "success" | "danger" | "info";
  className?: string;
}

const variantStyles = {
  default: "bg-surface border-slate-200",
  success: "bg-green-50 border-green-200",
  danger: "bg-red-50 border-red-200",
  info: "bg-blue-50 border-blue-200",
};

const iconStyles = {
  default: "text-brand-blue bg-brand-blue/10",
  success: "text-success bg-green-100",
  danger: "text-danger bg-red-100",
  info: "text-info bg-blue-100",
};

export default function StatCard({
  label,
  value,
  icon,
  trend,
  variant = "default",
  className = "",
}: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${variantStyles[variant]} ${className}`}>
      <div className="mb-2 flex items-start justify-between sm:mb-3">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
        {icon && (
          <span className={`rounded-lg p-2 ${iconStyles[variant]}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-xl font-bold text-text-main sm:text-2xl">{value}</p>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              trend.direction === "up" ? "text-success" : "text-danger"
            }`}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
