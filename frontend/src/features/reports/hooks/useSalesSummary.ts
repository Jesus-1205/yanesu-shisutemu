import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/services/api";
import type { SalesSummaryItem } from "@/types/api";
import { formatPeriod } from "@/lib/utils";
import type {
  UseSalesSummaryParams,
  UseSalesSummaryReturn,
  SalesChartRow,
  SalesKpis,
} from "../types";

export function useSalesSummary({
  grouping,
  from,
  to,
  currency,
  page,
  pageSize,
}: UseSalesSummaryParams): UseSalesSummaryReturn {
  const [rawData, setRawData] = useState<SalesSummaryItem[]>([]);
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
        const res = await api.getSalesSummary({
          rango: grouping,
          fecha_desde: from,
          fecha_hasta: to,
        });
        if (!cancelled) {
          setRawData(res || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar resumen de ventas");
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
  }, [grouping, from, to, retryCount]);

  const totals = useMemo<SalesKpis>(() => {
    let totalVentas = 0;
    let totalIngresosUSD = 0;
    let totalIngresosVES = 0;
    let totalCostosUSD = 0;

    rawData.forEach((item) => {
      totalVentas += Number(item.total_ventas || 0);
      totalIngresosUSD += Number(item.total_usd || 0);
      totalIngresosVES += Number(item.total_ves || 0);
      totalCostosUSD += Number(item.costo_usd || 0);
    });

    const isUsd = currency === "USD";
    const ingresos = isUsd ? totalIngresosUSD : totalIngresosVES;
    const ratioVES = totalIngresosUSD > 0 ? totalIngresosVES / totalIngresosUSD : 0;
    const costos = isUsd ? totalCostosUSD : totalCostosUSD * ratioVES;
    const margen = ingresos - costos;
    const margenPct = ingresos > 0 ? (margen / ingresos) * 100 : 0;

    return {
      totalVentas,
      ingresos: Math.round(ingresos * 100) / 100,
      costos: Math.round(costos * 100) / 100,
      margen: Math.round(margen * 100) / 100,
      margenPct,
    };
  }, [rawData, currency]);

  const chartData = useMemo<SalesChartRow[]>(() => {
    const isUsd = currency === "USD";
    return rawData.map((item) => {
      const ingresos = isUsd ? Number(item.total_usd) : Number(item.total_ves);
      const ratio = Number(item.total_usd) > 0 ? Number(item.total_ves) / Number(item.total_usd) : 0;
      const costos = isUsd ? Number(item.costo_usd) : Number(item.costo_usd) * ratio;
      const margen = ingresos - costos;

      return {
        periodoRaw: item.periodo,
        periodoFormatted: formatPeriod(item.periodo),
        ventas: Number(item.total_ventas),
        ingresos: Math.round(ingresos * 100) / 100,
        costos: Math.round(costos * 100) / 100,
        margen: Math.round(margen * 100) / 100,
      };
    });
  }, [rawData, currency]);

  const tableData = useMemo<SalesChartRow[]>(() => {
    return [...chartData].reverse();
  }, [chartData]);

  const totalPages = useMemo<number>(
    () => Math.ceil(tableData.length / pageSize) || 1,
    [tableData, pageSize],
  );

  const paginatedData = useMemo<SalesChartRow[]>(() => {
    const start = (page - 1) * pageSize;
    return tableData.slice(start, start + pageSize);
  }, [tableData, page, pageSize]);

  return {
    rawData,
    chartData,
    paginatedData,
    tableData,
    totals,
    totalPages,
    loading,
    error,
    retry,
  };
}
