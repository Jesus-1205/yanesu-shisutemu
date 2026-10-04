import type { FacturaOut as Invoice } from "@/types/api";
import { formatBs } from "@/lib/text";

interface PaymentDrawerSummaryProps {
  invoice: Invoice;
  isBs: boolean;
  prefix: string;
  saldoPendiente: number;
}

export default function PaymentDrawerSummary({
  invoice,
  isBs,
  prefix,
  saldoPendiente,
}: PaymentDrawerSummaryProps) {
  const total = isBs ? invoice.total_bs : invoice.total_usd;
  const pagado = total - saldoPendiente;

  return (
    <div className="space-y-1 rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">Factura #{invoice.numero_factura}</p>
      <p className="text-sm font-medium">{invoice.supplier?.nombre}</p>
      <div className="mt-2 flex justify-between text-xs">
        <span>
          Total: <strong>{prefix} {formatBs(total)}</strong>
        </span>
        <span className="text-green-600">
          Pagado: <strong>{prefix} {formatBs(pagado)}</strong>
        </span>
        <span className="text-red-600">
          Saldo: <strong>{prefix} {formatBs(saldoPendiente)}</strong>
        </span>
      </div>
    </div>
  );
}
