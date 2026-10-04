import { CheckCircle, XCircle } from "lucide-react";

interface ApiKeyStatusBadgeProps {
  configured: boolean;
}

export function ApiKeyStatusBadge({ configured }: ApiKeyStatusBadgeProps) {
  if (configured) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle className="size-3.5" />
        Configurada
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <XCircle className="size-3.5" />
      No configurada
    </span>
  );
}
