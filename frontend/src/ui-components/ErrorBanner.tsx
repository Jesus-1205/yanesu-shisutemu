import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { useState, type ReactNode } from "react";

type BannerVariant = "error" | "warning" | "info";

interface ErrorBannerProps {
  variant?: BannerVariant;
  title?: string;
  children: ReactNode;
  onRetry?: () => void;
  dismissible?: boolean;
  className?: string;
}

const variantConfig: Record<BannerVariant, { icon: typeof AlertCircle; bgClass: string; borderClass: string; iconClass: string; titleClass: string }> = {
  error: {
    icon: AlertCircle,
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    iconClass: "text-danger",
    titleClass: "text-danger",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-orange-50",
    borderClass: "border-orange-200",
    iconClass: "text-accent-orange",
    titleClass: "text-accent-orange",
  },
  info: {
    icon: Info,
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
    iconClass: "text-info",
    titleClass: "text-info",
  },
};

export default function ErrorBanner({
  variant = "error",
  title,
  children,
  onRetry,
  dismissible = true,
  className = "",
}: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const { icon: Icon, bgClass, borderClass, iconClass, titleClass } = variantConfig[variant];

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${bgClass} ${borderClass} motion-safe:animate-[fadeIn_200ms_ease] ${className}`}
      role="alert"
    >
      <Icon className={`mt-0.5 size-5 shrink-0 ${iconClass}`} />
      <div className="min-w-0 flex-1">
        {title && <p className={`text-sm font-semibold ${titleClass}`}>{title}</p>}
        <p className="text-sm text-slate-600">{children}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="cursor-pointer text-sm font-medium text-brand-blue transition-colors hover:text-blue-700"
          >
            Reintentar
          </button>
        )}
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="cursor-pointer text-slate-400 transition-colors hover:text-slate-600"
            aria-label="Descartar"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
