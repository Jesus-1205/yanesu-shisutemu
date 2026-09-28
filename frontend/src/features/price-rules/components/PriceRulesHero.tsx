import { Sparkles } from "lucide-react";
import Badge from "@/ui-components/Badge";

interface PriceRulesHeroProps {
  activeRulesCount: number;
}

export function PriceRulesHero({ activeRulesCount }: PriceRulesHeroProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-text-main">
            Precios dinámicos por divisa
          </h4>
          <p className="mt-0.5 text-xs text-slate-600">
            Estas reglas se activan automáticamente en el Punto de Venta al cobrar con métodos de pago en divisas seleccionados.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="info">
          {activeRulesCount} {activeRulesCount === 1 ? "regla activa" : "reglas activas"}
        </Badge>
      </div>
    </div>
  );
}
