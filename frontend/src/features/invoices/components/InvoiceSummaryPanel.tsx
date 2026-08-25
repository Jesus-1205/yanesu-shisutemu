import { formatBs, formatUsd } from "@/lib/text";

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
}

export default function InvoiceSummaryPanel({ esBs, ivaBreakdown, totalUsd, totalBs }: InvoiceSummaryPanelProps) {
  return (
    <div className="flex justify-end">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
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
        <div className="border-t border-slate-200 pt-3 space-y-2">
          {esBs ? (
            <>
              <div className="flex justify-between items-center font-bold text-text-main text-base">
                <span>Total</span>
                <span className="font-mono text-lg">Bs. {formatBs(ivaBreakdown.total)}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-text-main text-base">
                <span>Total USD</span>
                <span className="font-mono text-lg">{formatUsd(totalUsd)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center font-bold text-text-main text-base">
                <span>Total USD</span>
                <span className="font-mono text-lg">{formatUsd(ivaBreakdown.total)}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-text-main text-base">
                <span>Total Bs.</span>
                <span className="font-mono text-lg">Bs. {formatBs(totalBs)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
