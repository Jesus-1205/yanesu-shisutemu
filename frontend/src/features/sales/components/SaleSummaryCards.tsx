import type { Sale } from "../types";
import { formatCurrency, formatPaymentMethodName, formatRate } from "@/lib/utils";

interface SaleSummaryCardsProps {
  sale: Sale;
}

export default function SaleSummaryCards({ sale }: SaleSummaryCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
      <div className="rounded-xl border border-slate-200 bg-surface p-4">
        <p className="mb-1 text-xs text-slate-500">Usuario</p>
        <p className="text-lg font-semibold">{sale.usuario_nombre || `Usuario #${sale.usuario_id}`}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-surface p-4">
        <p className="mb-1 text-xs text-slate-500">Tasa BCV</p>
        <p className="text-lg font-semibold">{formatRate(sale.tasa_bcv_aplicada)}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-surface p-4">
        <p className="mb-1 text-xs text-slate-500">Total USD</p>
        <p className="text-lg font-semibold text-info">{formatCurrency(sale.total_usd)}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-surface p-4">
        <p className="mb-1 text-xs text-slate-500">Total VES</p>
        <p className="text-lg font-semibold text-success">{formatCurrency(sale.total_ves, "Bs ")}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-surface p-4">
        <p className="mb-1 text-xs text-slate-500">Método de Pago</p>
        <p className="text-lg font-semibold">
          {sale.metodo_pago ? sale.metodo_pago.split(", ").map(formatPaymentMethodName).join(", ") : "-"}
        </p>
      </div>
    </div>
  );
}
