import { formatBs, formatUsd } from "@/lib/text";
import type { Invoice } from "../types";

interface InvoiceFinancialCardsProps {
  invoice: Invoice;
  totalPrincipal: number;
  totalSecundario: number;
}

export default function InvoiceFinancialCards({ invoice, totalPrincipal, totalSecundario }: InvoiceFinancialCardsProps) {
  const nTasa = Number(invoice.tasa_bs);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {invoice.moneda_principal === "BS" ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-surface p-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Total Bs.
              <span className="ml-2 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">PRINCIPAL</span>
            </p>
            <p className="mt-1 font-mono text-lg font-bold">Bs. {formatBs(totalPrincipal)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-surface p-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Total USD
              <span className="ml-2 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">AUTO-CALC</span>
            </p>
            <p className="mt-1 font-mono text-lg font-bold">{formatUsd(totalSecundario)}</p>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-surface p-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Total USD
              <span className="ml-2 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">PRINCIPAL</span>
            </p>
            <p className="mt-1 font-mono text-lg font-bold">{formatUsd(totalPrincipal)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-surface p-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Total Bs.
              <span className="ml-2 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">AUTO-CALC</span>
            </p>
            <p className="mt-1 font-mono text-lg font-bold">Bs. {formatBs(totalSecundario)}</p>
          </div>
        </>
      )}
      {nTasa > 0 && (
        <div className="rounded-xl border border-slate-200 bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Tasa BCV</p>
          <p className="mt-1 font-mono text-lg font-bold">{formatBs(nTasa)}</p>
        </div>
      )}
    </div>
  );
}
