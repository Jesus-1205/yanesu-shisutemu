import { formatBs, formatUsd } from "@/lib/text";
import type { Invoice } from "../types";

interface InvoiceFiscalSummaryProps {
  invoice: Invoice;
  resumen: { exento: number; base_imponible: number; iva: number; total: number };
  totalPrincipal: number;
  totalSecundario: number;
}

export default function InvoiceFiscalSummary({ invoice, resumen, totalPrincipal, totalSecundario }: InvoiceFiscalSummaryProps) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-surface p-4">
      <h3 className="mb-3 text-xs font-medium tracking-wide text-slate-500 uppercase">Resumen Fiscal y Total</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Exento</span>
          <span className="font-mono font-medium">
            {invoice.moneda_principal === "BS" ? `Bs. ${formatBs(resumen.exento)}` : formatUsd(resumen.exento)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Base imponible</span>
          <span className="font-mono font-medium">
            {invoice.moneda_principal === "BS" ? `Bs. ${formatBs(resumen.base_imponible)}` : formatUsd(resumen.base_imponible)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">IVA (16%)</span>
          <span className="font-mono font-medium">
            {invoice.moneda_principal === "BS" ? `Bs. ${formatBs(resumen.iva)}` : formatUsd(resumen.iva)}
          </span>
        </div>
        <div className="mt-2 border-t border-slate-200 pt-2">
          <div className="flex justify-between">
            <span className="font-bold text-slate-700">Total USD</span>
            <span className="font-mono font-bold">
              {invoice.moneda_principal === "BS" ? formatUsd(totalSecundario) : formatUsd(totalPrincipal)}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="font-bold text-slate-700">Total Bs.</span>
            <span className="font-mono font-bold">
              {invoice.moneda_principal === "BS"
                ? `Bs. ${formatBs(totalPrincipal)}`
                : `Bs. ${formatBs(totalSecundario)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
