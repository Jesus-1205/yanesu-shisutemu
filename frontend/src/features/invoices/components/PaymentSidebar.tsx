import { DollarSign } from "lucide-react";
import type { FacturaOut as Invoice, InvoicePaymentSummary } from "@/types/api";
import Badge from "@/ui-components/Badge";
import Button from "@/ui-components/Button";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { formatBs, formatUsd } from "@/lib/text";

interface PaymentSidebarProps {
  invoice: Invoice;
  paymentSummary: InvoicePaymentSummary | null;
  totalFacturaUsd: number;
  totalFacturaBs: number;
  totalPagadoUsd: number;
  totalPagadoBs: number;
  saldoPendienteUsd: number;
  saldoPendienteBs: number;
  isValid: boolean;
  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
}

export default function PaymentSidebar({
  invoice,
  paymentSummary,
  totalFacturaUsd,
  totalFacturaBs,
  totalPagadoUsd,
  totalPagadoBs,
  saldoPendienteUsd,
  saldoPendienteBs,
  isValid,
  submitting,
  submitError,
  onSubmit,
}: PaymentSidebarProps) {
  return (
    <div className="shrink-0 lg:w-80">
      <div className="space-y-4 lg:sticky lg:top-20">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-surface p-4">
          <div>
            <p className="text-xs text-slate-500">Factura</p>
            <p className="text-sm font-bold text-text-main">#{invoice.numero_factura}</p>
            <p className="mt-0.5 text-xs text-slate-500">{invoice.supplier?.nombre}</p>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                invoice.estado_pago === "PAGADA" ? "bg-green-500" : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(paymentSummary?.porcentaje_pagado ?? 0, 100)}%` }}
            />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total</span>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-text-main">{formatUsd(totalFacturaUsd)}</div>
                <div className="font-mono text-xs text-slate-400">Bs. {formatBs(totalFacturaBs)}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-600">Pagado</span>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-green-700">{formatUsd(totalPagadoUsd)}</div>
                <div className="font-mono text-xs text-green-600">Bs. {formatBs(totalPagadoBs)}</div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="font-medium text-red-600">Pendiente</span>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-red-700">{formatUsd(saldoPendienteUsd)}</div>
                <div className="font-mono text-xs text-red-600">Bs. {formatBs(saldoPendienteBs)}</div>
              </div>
            </div>
          </div>

          <Badge
            variant={
              invoice.estado_pago === "PAGADA" ? "success"
              : invoice.estado_pago === "PARCIALMENTE_PAGADA" ? "warning"
              : "danger"
            }
            className="w-full justify-center"
          >
            {invoice.estado_pago === "PAGADA" ? "Pagada"
              : invoice.estado_pago === "PARCIALMENTE_PAGADA" ? "Parcial"
              : "Pendiente"}
          </Badge>
        </div>

        <div className="space-y-2">
          {submitError && <ErrorBanner>{submitError}</ErrorBanner>}
          <Button
            variant="accent"
            className="h-12 w-full text-base"
            disabled={!isValid || submitting}
            onClick={onSubmit}
            loading={submitting}
          >
            <DollarSign className="size-5" />
            Registrar Pago
          </Button>
        </div>
      </div>
    </div>
  );
}
