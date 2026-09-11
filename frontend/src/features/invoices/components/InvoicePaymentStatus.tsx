import { useNavigate } from "react-router-dom";
import { DollarSign } from "lucide-react";
import type { Invoice } from "../types";
import type { InvoicePaymentSummary } from "@/types/api";
import Badge from "@/ui-components/Badge";
import Button from "@/ui-components/Button";
import { formatBs, formatUsd } from "@/lib/text";

interface InvoicePaymentStatusProps {
  invoice: Invoice;
  paymentSummary: InvoicePaymentSummary;
  invoiceId: string;
}

export default function InvoicePaymentStatus({ invoice, paymentSummary, invoiceId }: InvoicePaymentStatusProps) {
  const navigate = useNavigate();
  const nTasa = Number(invoice.tasa_bs);

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">Estado de Pago</h3>
        {invoice.estado_pago !== "PAGADA" && (
          <Button variant="accent" size="sm" onClick={() => navigate(`/invoices/${invoiceId}/pay`)}>
            <DollarSign className="size-4" />
            Registrar Pago
          </Button>
        )}
      </div>
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>{Math.round(paymentSummary.porcentaje_pagado)}% pagado</span>
          <span>
            {invoice.moneda_principal === "BS"
              ? `Bs. ${formatBs(paymentSummary.saldo_pendiente_bs)}`
              : formatUsd(paymentSummary.saldo_pendiente_usd)} pendiente
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              invoice.estado_pago === "PAGADA" ? "bg-green-500" : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(paymentSummary.porcentaje_pagado, 100)}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-slate-500">Total</p>
          <p className="mt-0.5 font-mono font-bold">
            {invoice.moneda_principal === "BS"
              ? `Bs. ${formatBs(paymentSummary.total_factura_bs)}`
              : formatUsd(paymentSummary.total_factura_usd)}
          </p>
        </div>
        <div className="rounded-lg border border-green-100 bg-green-50 p-3">
          <p className="text-green-600">Pagado</p>
          <p className="mt-0.5 font-mono font-bold text-green-700">
            {invoice.moneda_principal === "BS"
              ? `Bs. ${formatBs(paymentSummary.total_pagado_bs)}`
              : formatUsd(paymentSummary.total_pagado_usd)}
          </p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-3">
          <p className="text-red-600">Saldo</p>
          <p className="mt-0.5 font-mono font-bold text-red-700">
            {invoice.moneda_principal === "BS"
              ? `Bs. ${formatBs(paymentSummary.saldo_pendiente_bs)}`
              : formatUsd(paymentSummary.saldo_pendiente_usd)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-slate-500">Estado</p>
          <Badge
            variant={
              invoice.estado_pago === "PAGADA" ? "success"
              : invoice.estado_pago === "PARCIALMENTE_PAGADA" ? "warning"
              : "danger"
            }
            className="mt-1"
          >
            {invoice.estado_pago === "PAGADA" ? "Pagada"
              : invoice.estado_pago === "PARCIALMENTE_PAGADA" ? "Parcial"
              : "Pendiente"}
          </Badge>
        </div>
      </div>
      {(Math.abs(paymentSummary.diferencia_cambiaria_bs) >= 1 || paymentSummary.total_mora_bs > 0) && (
        <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          {Math.abs(paymentSummary.diferencia_cambiaria_bs) >= 1 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="font-medium text-amber-600">Diferencia cambiaria</p>
              <p className="mt-0.5 font-mono font-bold text-amber-700">Bs. {formatBs(paymentSummary.diferencia_cambiaria_bs)}</p>
              <p className="mt-1 text-[10px] text-amber-500">Por cambio de tasa BCV</p>
            </div>
          )}
          {paymentSummary.total_mora_bs > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="font-medium text-orange-600">Mora</p>
              <p className="mt-0.5 font-mono font-bold text-orange-700">Bs. {formatBs(paymentSummary.total_mora_bs)}</p>
              {nTasa > 0 && (
                <p className="mt-0.5 font-mono text-xs text-orange-500">{formatUsd(paymentSummary.total_mora_bs / nTasa)}</p>
              )}
              <p className="mt-1 text-[10px] text-orange-400">Recargo por pago tardío</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
