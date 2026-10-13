import { DollarSign, Banknote, Trophy, Receipt, TrendingUp } from "lucide-react";
import { formatCurrency, formatPaymentMethodName } from "@/lib/utils";
import { Skeleton } from "@/ui-components/Skeleton";
import type { PaymentKpis } from "../types";

export interface PaymentsKpiCardsProps {
  kpis: PaymentKpis;
  loading: boolean;
  currency: "USD" | "VES";
  currSymbol: string;
}

export default function PaymentsKpiCards({
  kpis,
  loading,
  currency,
  currSymbol,
}: PaymentsKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Recaudado */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Recaudado</span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            {currency === "USD" ? (
              <DollarSign className="size-4" />
            ) : (
              <Banknote className="size-4" />
            )}
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(kpis.totalRecaudado, currSymbol)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Equivalente total recibido</p>
        </div>
      </div>

      {/* Método Principal */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Método Principal</span>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-500">
            <Trophy className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : kpis.lider ? (
            <>
              <div
                className="truncate text-xl font-bold tracking-tight text-slate-900"
                title={formatPaymentMethodName(kpis.lider.metodo_pago_nombre)}
              >
                {formatPaymentMethodName(kpis.lider.metodo_pago_nombre)}
              </div>
              <p className="mt-1 text-xs text-amber-600 font-medium">
                {kpis.totalEquivUsd > 0
                  ? `${(
                      ((Number(kpis.lider.total_equivalente_usd) || 0) / kpis.totalEquivUsd) *
                      100
                    ).toFixed(1)}% del total recibido`
                  : `${kpis.lider.cantidad_pagos} pagos`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Sin pagos en el período</p>
          )}
        </div>
      </div>

      {/* Total Transacciones */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Ventas</span>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
            <Receipt className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {kpis.totalTransacciones.toLocaleString("es-VE")}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Operaciones completadas</p>
        </div>
      </div>

      {/* Venta Promedio */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Venta Promedio</span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <TrendingUp className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-emerald-600">
              {formatCurrency(kpis.ventaPromedio, currSymbol)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Promedio por transacción</p>
        </div>
      </div>
    </div>
  );
}
