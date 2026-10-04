import { formatCurrency } from "@/lib/utils";
import type { Sale } from "../types";

export interface SaleFiscalSummaryProps {
  sale: Sale;
}

export default function SaleFiscalSummary({ sale }: SaleFiscalSummaryProps) {
  return (
    <div className="mt-6 ml-auto max-w-sm space-y-2 rounded-xl border border-slate-200 bg-surface p-5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Monto exento USD</span>
        <span>{formatCurrency(sale.monto_exento_usd)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Base imponible USD</span>
        <span>{formatCurrency(sale.base_imponible_usd)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">IVA USD</span>
        <span>{formatCurrency(sale.monto_iva_usd)}</span>
      </div>
      <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
        <span>Total USD</span>
        <span className="text-info">{formatCurrency(sale.total_usd)}</span>
      </div>
      <div className="flex justify-between text-base font-bold">
        <span>Total VES</span>
        <span className="text-success">{formatCurrency(sale.total_ves, "Bs ")}</span>
      </div>
    </div>
  );
}
