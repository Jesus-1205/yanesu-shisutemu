import { Eye, DollarSign, Clock, AlertCircle, CheckCircle } from "lucide-react";
import type { Invoice } from "../types";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import { formatBs, formatUsd } from "@/lib/text";
import { formatDateVE, todayInCaracas } from "@/lib/utils";
import { calcularResumenFiscal } from "@/lib/iva";

interface InvoiceCardProps {
  invoice: Invoice;
  onView: () => void;
  onPay?: () => void;
}

function calcTotalUsdConIva(invoice: Invoice): number {
  if (invoice.moneda_principal === "USD") return invoice.total_usd;
  if (!invoice.aplica_iva) return invoice.total_usd;
  if (invoice.detalles.length === 0) return invoice.total_usd;
  const resumen = calcularResumenFiscal(
    invoice.detalles.map((d) => ({
      subtotal_usd: d.cantidad * Number(d.costo_unitario_usd),
      subtotal_bs: d.cantidad * Number(d.costo_unitario_bs),
      tipo_iva: d.tipo_iva ?? "GRAVADO",
    })),
    invoice.moneda_principal,
    invoice.aplica_iva,
  );
  if (invoice.tasa_bs > 0) {
    return Math.round((resumen.total / invoice.tasa_bs) * 100) / 100;
  }
  return invoice.total_usd;
}

function getDaysUntil(dateStr: string): number {
  const hoy = todayInCaracas();
  const fecha = new Date(dateStr + "T00:00:00");
  fecha.setHours(0, 0, 0, 0);
  return Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export default function InvoiceCard({ invoice, onView, onPay }: InvoiceCardProps) {
  const statusConfig = {
    PAGADA: {
      variant: "success" as const,
      label: "Pagada",
      icon: CheckCircle,
      gradient: "from-green-400 via-emerald-300 to-teal-200",
      tint: "bg-green-50/30",
    },
    PARCIALMENTE_PAGADA: {
      variant: "warning" as const,
      label: "Parcial",
      icon: AlertCircle,
      gradient: "from-orange-400 via-amber-300 to-yellow-200",
      tint: "bg-orange-50/30",
    },
    PENDIENTE: {
      variant: "danger" as const,
      label: "Pendiente",
      icon: Clock,
      gradient: "from-red-400 via-red-300 to-red-200",
      tint: "bg-red-50/30",
    },
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
        relative overflow-hidden rounded-xl border border-slate-200 bg-surface p-4
        shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
      `}
    >
      {/* Barra de estado superior */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${status.gradient}`} />

      {/* Tinte de fondo sutil */}
      <div className={`absolute inset-0 ${status.tint} pointer-events-none`} />

      {/* Header: factura + vencimiento + estado */}
      <div className="relative mb-2 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-sm font-semibold text-text-main">
            {invoice.numero_factura}
          </span>
          {hasDeadline && daysRemaining !== null && !isPaid && (
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                daysRemaining < 0
                  ? "bg-red-100 text-red-700"
                  : daysRemaining <= 3
                    ? "bg-orange-100 text-orange-700"
                    : "bg-green-100 text-green-700"
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
          <StatusIcon className="mr-1 size-3" />
          {status.label}
        </Badge>
      </div>

      {/* Proveedor */}
      <p className="relative mb-2 truncate text-sm text-slate-600">
        {invoice.supplier?.nombre || "Sin proveedor"}
      </p>

      {/* Tipo + moneda + fecha */}
      <div className="relative mb-3 flex items-center gap-2">
        <Badge variant="neutral">
          {invoice.tipo_documento === "FACTURA" ? "Factura" : "Nota Entrega"}
        </Badge>
        <Badge variant="neutral">{invoice.moneda_principal}</Badge>
        <span className="ml-auto text-xs text-slate-400">
          {formatDateVE(invoice.fecha_factura)}
        </span>
      </div>

      {/* Montos */}
      <div className="relative mb-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Total</span>
          <span className="font-mono font-medium text-text-main tabular-nums">
            {formatAmount(invoice.total_usd, invoice.total_bs)}
          </span>
        </div>
        {invoice.moneda_principal === "BS" && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total USD </span>
            <span className="font-mono text-slate-600 tabular-nums">
              {formatUsd(calcTotalUsdConIva(invoice))}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Pagado</span>
          <span className="font-mono text-slate-600 tabular-nums">
            {formatAmount(invoice.total_pagado_usd, invoice.total_pagado_bs)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Pendiente</span>
          <span className={`font-mono font-medium tabular-nums ${isPaid ? "text-slate-400" : "text-danger"}`}>
            {formatAmount(invoice.saldo_pendiente_usd, invoice.saldo_pendiente_bs)}
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="relative mb-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
          <div
            className={`h-full rounded-full transition-all ${
              isPaid ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(invoice.porcentaje_pagado || 0, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[10px] text-slate-400">
          {Math.min(Math.round(invoice.porcentaje_pagado || 0), 100)}% pagado
        </p>
      </div>

      {/* Acciones */}
      <div className="relative flex items-center gap-2 border-t border-slate-200/60 pt-3">
        <Button variant="ghost" size="sm" onClick={onView} className="flex-1">
          <Eye className="size-4" />
          Ver detalle
        </Button>
        {!isPaid && onPay && (
          <Button variant="ghost" size="sm" onClick={onPay} className="flex-1">
            <DollarSign className="size-4 text-green-600" />
            Pagar
          </Button>
        )}
      </div>
    </div>
  );
}