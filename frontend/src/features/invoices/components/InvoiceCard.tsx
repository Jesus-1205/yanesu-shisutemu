import { Eye, DollarSign, Clock, AlertCircle, CheckCircle } from "lucide-react";
import type { Invoice } from "../types";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import { formatBs, formatUsd } from "@/lib/text";

interface InvoiceCardProps {
  invoice: Invoice;
  onView: () => void;
  onPay?: () => void;
}

function getDaysUntil(dateStr: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(dateStr);
  fecha.setHours(0, 0, 0, 0);
  return Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export default function InvoiceCard({ invoice, onView, onPay }: InvoiceCardProps) {
  const statusConfig = {
    PAGADA: { variant: "success" as const, label: "Pagada", icon: CheckCircle },
    PARCIALMENTE_PAGADA: { variant: "warning" as const, label: "Parcial", icon: AlertCircle },
    PENDIENTE: { variant: "danger" as const, label: "Pendiente", icon: Clock },
  };
  const status = statusConfig[invoice.estado_pago] || statusConfig.PENDIENTE;
  const StatusIcon = status.icon;

  const isPaid = invoice.estado_pago === "PAGADA";
  const hasDeadline = !!invoice.fecha_limite_pago;
  const daysRemaining = hasDeadline ? getDaysUntil(invoice.fecha_limite_pago!) : null;

  const formatAmount = (usd: number | undefined, bs: number | undefined) =>
    invoice.moneda_principal === "USD"
      ? formatUsd(Number(usd) || 0)
      : `Bs. ${formatBs(Number(bs) || 0)}`;

  return (
    <div
      className={`
        bg-surface rounded-xl border shadow-sm p-4
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
        border-l-4
        ${invoice.estado_pago === "PENDIENTE" ? "border-l-red-400" : ""}
        ${invoice.estado_pago === "PARCIALMENTE_PAGADA" ? "border-l-orange-400" : ""}
        ${invoice.estado_pago === "PAGADA" ? "border-l-green-400" : ""}
      `}
    >
      {/* Header: factura + vencimiento + estado */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm font-semibold text-text-main truncate">
            {invoice.numero_factura}
          </span>
          {hasDeadline && daysRemaining !== null && !isPaid && (
            <span
              className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${
                daysRemaining < 0
                  ? "bg-red-50 text-danger"
                  : daysRemaining <= 3
                    ? "bg-orange-50 text-accent-orange"
                    : "bg-green-50 text-success"
              }`}
            >
              {daysRemaining < 0
                ? `Vencida ${Math.abs(daysRemaining)}d`
                : daysRemaining === 0
                  ? "Vence hoy"
                  : `${daysRemaining}d`}
            </span>
          )}
        </div>
        <Badge variant={status.variant}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
      </div>

      {/* Proveedor */}
      <p className="text-sm text-slate-600 truncate mb-2">
        {invoice.supplier?.nombre || "Sin proveedor"}
      </p>

      {/* Tipo + moneda + fecha */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="neutral">
          {invoice.tipo_documento === "FACTURA" ? "Factura" : "Nota Entrega"}
        </Badge>
        <Badge variant="neutral">{invoice.moneda_principal}</Badge>
        <span className="text-xs text-slate-400 ml-auto">
          {new Date(invoice.fecha_factura).toLocaleDateString("es-VE")}
        </span>
      </div>

      {/* Montos */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Total</span>
          <span className="font-mono tabular-nums font-medium text-text-main">
            {formatAmount(invoice.total_usd, invoice.total_bs)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Pagado</span>
          <span className="font-mono tabular-nums text-slate-600">
            {formatAmount(invoice.total_pagado_usd, invoice.total_pagado_bs)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Pendiente</span>
          <span className={`font-mono tabular-nums font-medium ${isPaid ? "text-slate-400" : "text-danger"}`}>
            {formatAmount(invoice.saldo_pendiente_usd, invoice.saldo_pendiente_bs)}
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mb-3">
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isPaid ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(invoice.porcentaje_pagado || 0, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1 text-right">
          {Math.min(Math.round(invoice.porcentaje_pagado || 0), 100)}% pagado
        </p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <Button variant="ghost" size="sm" onClick={onView} className="flex-1">
          <Eye className="w-4 h-4" />
          Ver detalle
        </Button>
        {!isPaid && onPay && (
          <Button variant="ghost" size="sm" onClick={onPay} className="flex-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            Pagar
          </Button>
        )}
      </div>
    </div>
  );
}
