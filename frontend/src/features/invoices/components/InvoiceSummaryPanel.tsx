import { formatBs, formatUsd } from "@/lib/text";
import { toCents } from "@/lib/money";

interface InvoiceSummaryPanelProps {
  esBs: boolean;
  ivaBreakdown: {
    exento: number;
    base_imponible: number;
    iva: number;
    total: number;
  };
  totalUsd: number;
  totalBs: number;
  tasa: number;
}

export default function InvoiceSummaryPanel({ esBs, ivaBreakdown, totalUsd, totalBs, tasa }: InvoiceSummaryPanelProps) {
  return (
    <div className="flex justify-end">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Resumen Fiscal y Total
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Exento</span>
            {esBs ? (
              <span className="font-mono text-xs sm:text-sm">Bs. {formatBs(ivaBreakdown.exento)}</span>
            ) : (
              <span className="font-mono text-xs sm:text-sm">{formatUsd(ivaBreakdown.exento)}</span>
            )}
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Base imponible</span>
            {esBs ? (
              <span className="font-mono text-xs sm:text-sm">Bs. {formatBs(ivaBreakdown.base_imponible)}</span>
            ) : (
              <span className="font-mono text-xs sm:text-sm">{formatUsd(ivaBreakdown.base_imponible)}</span>
            )}
          </div>
          <div className="flex justify-between text-slate-600">
            <span>IVA (16%)</span>
            {esBs ? (
              <span className="font-mono text-xs sm:text-sm">Bs. {formatBs(ivaBreakdown.iva)}</span>
            ) : (
              <span className="font-mono text-xs sm:text-sm">{formatUsd(ivaBreakdown.iva)}</span>
            )}
          </div>
        </div>
        <div className="space-y-2 border-t border-slate-200 pt-3">
          {esBs ? (
            <>
              <div className="flex items-center justify-between text-base font-bold text-text-main">
                <span>Total</span>
                <span className="font-mono text-lg">Bs. {formatBs(ivaBreakdown.total)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-text-main">
                <span>Total USD</span>
                <span className="font-mono text-lg">{formatUsd(tasa > 0 ? toCents(ivaBreakdown.total / tasa) : totalUsd)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-base font-bold text-text-main">
                <span>Total USD</span>
                <span className="font-mono text-lg">{formatUsd(ivaBreakdown.total)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-text-main">
                <span>Total Bs.</span>
                <span className="font-mono text-lg">Bs. {formatBs(tasa > 0 ? toCents(ivaBreakdown.total * tasa) : totalBs)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
