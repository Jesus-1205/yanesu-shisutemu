import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { CategoryReportItemOut } from "@/types/api";
import type {
  UseCategoriesReportParams,
  UseCategoriesReportReturn,
  CategoryKpis,
  CategoryTableRow,
} from "../types";

export function useCategoriesReport({
  from,
  to,
  currency,
  tableTab,
  page,
  pageSize,
}: UseCategoriesReportParams): UseCategoriesReportReturn {
  const tasaBCV = useExchangeRateStore((s) => s.tasa);
  const conversionRate = currency === "VES" && tasaBCV > 0 ? tasaBCV : 1;
  const currSymbol = currency === "USD" ? "$" : "Bs ";

  const [rawData, setRawData] = useState<CategoryReportItemOut[]>([]);
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
        const res = await api.getCategoryReport({
          fecha_desde: from,
          fecha_hasta: to,
        });
        if (!cancelled) {
          setRawData(res || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar reporte de categorías",
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

  const kpis = useMemo<CategoryKpis>(() => {
    let totalIngresosUsd = 0;
    let totalMargenUsd = 0;
    let totalUnidades = 0;

    for (const c of rawData) {
      totalIngresosUsd += Number(c.ingresos_usd) || 0;
      totalMargenUsd += Number(c.margen_usd) || 0;
      totalUnidades += Number(c.unidades_vendidas) || 0;
    }

    const conVentas = rawData.filter(
      (c) => (Number(c.unidades_vendidas) || 0) > 0 || (Number(c.ingresos_usd) || 0) > 0,
    );

    const lider =
      conVentas.length > 0
        ? conVentas.reduce(
            (best, c) =>
              (Number(c.ingresos_usd) || 0) > (Number(best.ingresos_usd) || 0) ? c : best,
            conVentas[0],
          )
        : null;

    const totalIngresos =
      currency === "USD"
        ? Math.round(totalIngresosUsd * 100) / 100
        : Math.round(totalIngresosUsd * conversionRate * 100) / 100;

    const margenPromedio =
      totalIngresosUsd > 0
        ? Math.round(((totalMargenUsd / totalIngresosUsd) * 100) * 100) / 100
        : 0;

    return {
      totalIngresos,
      lider,
      totalUnidades,
      margenPromedio,
    };
  }, [rawData, currency, conversionRate]);

  const tableData = useMemo<CategoryTableRow[]>(() => {
    let sorted: CategoryReportItemOut[];

    switch (tableTab) {
      case "mas_vendidas":
        sorted = [...rawData].sort(
          (a, b) => (Number(b.unidades_vendidas) || 0) - (Number(a.unidades_vendidas) || 0),
        );
        break;
      case "mayor_margen":
        sorted = [...rawData].sort(
          (a, b) => (Number(b.margen_porcentaje) || 0) - (Number(a.margen_porcentaje) || 0),
        );
        break;
      case "menor_margen":
        sorted = [...rawData].sort(
          (a, b) => (Number(a.margen_porcentaje) || 0) - (Number(b.margen_porcentaje) || 0),
        );
        break;
      case "todos":
      default:
        sorted = [...rawData].sort(
          (a, b) => (Number(b.ingresos_usd) || 0) - (Number(a.ingresos_usd) || 0),
        );
        break;
    }

    const totalIngresosUsd = rawData.reduce(
      (acc, c) => acc + (Number(c.ingresos_usd) || 0),
      0,
    );

    return sorted.map((c): CategoryTableRow => {
      const rawIncome = Number(c.ingresos_usd) || 0;
      const rawCost = Number(c.costos_usd) || 0;
      const ingresos = Math.round(rawIncome * conversionRate * 100) / 100;
      const costos = Math.round(rawCost * conversionRate * 100) / 100;
      const margen = Math.round((ingresos - costos) * 100) / 100;
      const participacion_pct =
        totalIngresosUsd > 0
          ? Math.round(((rawIncome / totalIngresosUsd) * 100) * 10) / 10
          : 0;

      return {
        id: c.id,
        nombre: c.nombre,
        total_productos: c.total_productos,
        stock_total: c.stock_total,
        unidades_vendidas: c.unidades_vendidas,
        ingresos,
        costos,
        margen,
        rentabilidad_pct: Number(c.margen_porcentaje) || 0,
        participacion_pct,
      };
    });
  }, [rawData, tableTab, conversionRate]);

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
