import { todayInCaracas } from "@/lib/utils";
import { formatDateVE } from "@/lib/utils";
import type { Invoice } from "../types";

interface InvoiceMetaBarProps {
  invoice: Invoice;
}

export default function InvoiceMetaBar({ invoice }: InvoiceMetaBarProps) {
  return (
    <div className="mb-6 space-y-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
        <span className="font-medium text-slate-800">
          {invoice.tipo_documento === "FACTURA" ? "Factura" : "Nota de Entrega"}
        </span>
        <span className="text-slate-300">•</span>
        <span>{formatDateVE(invoice.fecha_factura)}</span>
        <span className="text-slate-300">•</span>
        <span>{invoice.supplier?.nombre || "—"}</span>
        {invoice.aplica_iva && (
          <>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">IVA 16%</span>
          </>
        )}
      </div>
      {invoice.fecha_limite_pago && (() => {
        const hoy = todayInCaracas();
        const limite = new Date(invoice.fecha_limite_pago + "T00:00:00");
        const diffMs = limite.getTime() - hoy.getTime();
        const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const esPagada = invoice.estado_pago === "PAGADA";
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Límite de pago:</span>
            <span className="font-medium">{limite.toLocaleDateString("es-VE")}</span>
            {!esPagada && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                diffDias < 0
                  ? "bg-red-100 text-red-700"
                  : diffDias <= 3
                    ? "bg-orange-100 text-orange-700"
                    : "bg-emerald-100 text-emerald-700"
              }`}>
                {diffDias < 0
                  ? `Vencida hace ${Math.abs(diffDias)} día${Math.abs(diffDias) !== 1 ? "s" : ""}`
                  : diffDias === 0
                    ? "Vence hoy"
                    : `${diffDias} día${diffDias !== 1 ? "s" : ""} restante${diffDias !== 1 ? "s" : ""}`
                }
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
