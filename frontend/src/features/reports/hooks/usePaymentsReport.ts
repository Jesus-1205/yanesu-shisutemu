import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { PaymentMethodSummaryItem } from "@/types/api";
import { formatPaymentMethodName } from "@/lib/utils";
import type {
  UsePaymentsReportParams,
  UsePaymentsReportReturn,
  PaymentKpis,
  PaymentTableRow,
} from "../types";

export function usePaymentsReport({
  from,
  to,
  currency,
  tableTab,
  page,
  pageSize,
}: UsePaymentsReportParams): UsePaymentsReportReturn {
  const tasaBCV = useExchangeRateStore((s) => s.tasa);
  const conversionRate = currency === "VES" && tasaBCV > 0 ? tasaBCV : 1;
  const currSymbol = currency === "USD" ? "$" : "Bs ";

  const [rawData, setRawData] = useState<PaymentMethodSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getPaymentMethodSummary({
          fecha_desde: from,
          fecha_hasta: to,
        });
        if (!cancelled) {
          setRawData(res || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar reporte de métodos de pago",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [from, to, retryCount]);

  const kpis = useMemo<PaymentKpis>(() => {
    let totalUsd = 0;
    let totalVes = 0;
    let totalTransacciones = 0;
    let totalEquivUsd = 0;

    for (const m of rawData) {
      totalUsd = Math.round((totalUsd + (Number(m.total_usd) || 0)) * 100) / 100;
      totalVes = Math.round((totalVes + (Number(m.total_ves) || 0)) * 100) / 100;
      totalTransacciones += m.cantidad_pagos || 0;
      totalEquivUsd =
        Math.round((totalEquivUsd + (Number(m.total_equivalente_usd) || 0)) * 100) / 100;
    }

    const conPagos = rawData.filter((m) => (m.cantidad_pagos || 0) > 0);
    const lider =
      conPagos.length > 0
        ? conPagos.reduce(
            (best, m) =>
              (Number(m.total_equivalente_usd) || 0) >
              (Number(best.total_equivalente_usd) || 0)
                ? m
                : best,
            conPagos[0],
          )
        : null;

    const totalRecaudado =
      currency === "USD"
        ? totalEquivUsd
        : Math.round(totalEquivUsd * conversionRate * 100) / 100;

    const ventaPromedio =
      totalTransacciones > 0
        ? Math.round((totalRecaudado / totalTransacciones) * 100) / 100
        : 0;

    return {
      totalUsd,
      totalVes,
      totalTransacciones,
      totalEquivUsd,
      totalRecaudado,
      lider,
      ventaPromedio,
    };
  }, [rawData, currency, conversionRate]);

  const tableData = useMemo<PaymentTableRow[]>(() => {
    const sorted = [...rawData].sort(
      (a, b) => (Number(b.total_equivalente_usd) || 0) - (Number(a.total_equivalente_usd) || 0),
    );

    let filtered: PaymentMethodSummaryItem[];
    switch (tableTab) {
      case "divisas":
        filtered = sorted.filter((m) => m.moneda_default === "USD");
        break;
      case "bolivares":
        filtered = sorted.filter((m) => m.moneda_default === "VES");
        break;
      default:
        filtered = sorted;
        break;
    }

    return filtered.map((m) => {
      const equiv = Number(m.total_equivalente_usd) || 0;
      const totalEquiv =
        currency === "USD" ? equiv : Math.round(equiv * conversionRate * 100) / 100;
      const participacionFormatted =
        kpis.totalEquivUsd > 0
          ? ((equiv / kpis.totalEquivUsd) * 100).toFixed(1)
          : "0.0";

      return {
        id: m.metodo_pago_id,
        nombre: m.metodo_pago_nombre,
        nombreFormatted: formatPaymentMethodName(m.metodo_pago_nombre),
        monedaDefault: m.moneda_default,
        cantidadPagos: m.cantidad_pagos || 0,
        totalUsd: Number(m.total_usd) || 0,
        totalVes: Number(m.total_ves) || 0,
        totalEquiv,
        participacionPct: Number(participacionFormatted),
        participacionFormatted,
      };
    });
  }, [rawData, tableTab, currency, conversionRate, kpis.totalEquivUsd]);

  const totalRows = tableData.length;
  const totalPages = useMemo(
    () => Math.ceil(totalRows / pageSize) || 1,
    [totalRows, pageSize],
  );

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tableData.slice(start, start + pageSize);
  }, [tableData, page, pageSize]);

  return {
    rawData,
    kpis,
    tableData,
    paginatedData,
    totalPages,
    totalRows,
    conversionRate,
    currSymbol,
    loading,
    error,
    retry,
  };
}
