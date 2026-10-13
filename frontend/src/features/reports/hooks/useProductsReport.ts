import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { ProductMatrixItem } from "@/types/api";
import type {
  UseProductsReportParams,
  UseProductsReportReturn,
  ProductKpis,
  ProductTableRow,
} from "../types";

export function useProductsReport({
  from,
  to,
  currency,
  tableTab,
  page,
  pageSize,
}: UseProductsReportParams): UseProductsReportReturn {
  const tasaBCV = useExchangeRateStore((s) => s.tasa);
  const conversionRate = currency === "VES" && tasaBCV > 0 ? tasaBCV : 1;
  const currSymbol = currency === "USD" ? "$" : "Bs ";

  const [rawData, setRawData] = useState<ProductMatrixItem[]>([]);
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
        const res = await api.getProductsMatrix({
          fecha_desde: from,
          fecha_hasta: to,
          limit: 200,
        });
        if (!cancelled) {
          setRawData(res || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar datos de productos");
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

  const kpis = useMemo<ProductKpis>(() => {
    const conVentas = rawData.filter((p) => p.total_vendido > 0);
    const totalUnidades = conVentas.reduce((acc, p) => acc + p.total_vendido, 0);

    const lider =
      conVentas.length > 0
        ? conVentas.reduce(
            (best, p) => (p.total_vendido > best.total_vendido ? p : best),
            conVentas[0],
          )
        : null;

    const margenPromedio =
      conVentas.length > 0
        ? conVentas.reduce((acc, p) => acc + Number(p.margen_porcentaje), 0) / conVentas.length
        : 0;

    const sinRotacion = rawData.filter((p) => p.total_vendido === 0).length;

    return { totalUnidades, lider, margenPromedio, sinRotacion };
  }, [rawData]);

  const tableData = useMemo<ProductTableRow[]>(() => {
    const mapToRow = (p: ProductMatrixItem): ProductTableRow => {
      const rawIncome = Number(p.precio_unidad_usd) * p.total_vendido;
      const rawCost = Number(p.precio_costo_usd) * p.total_vendido;
      const ingresos = Math.round(rawIncome * conversionRate * 100) / 100;
      const costos = Math.round(rawCost * conversionRate * 100) / 100;
      const margen = Math.round((ingresos - costos) * 100) / 100;

      return {
        id: p.id,
        nombre: p.nombre,
        total_vendido: p.total_vendido,
        ingresos,
        costos,
        margen,
        rentabilidad_pct: Number(p.margen_porcentaje) || 0,
        stock_unidades: p.stock_unidades,
      };
    };

    const sortedBySales = [...rawData].sort((a, b) => b.total_vendido - a.total_vendido);

    let filtered: ProductMatrixItem[];
    switch (tableTab) {
      case "mas_vendidos":
        filtered = sortedBySales.filter((p) => p.total_vendido > 0).slice(0, 50);
        break;
      case "mayor_margen":
        filtered = [...rawData].sort(
          (a, b) => Number(b.margen_porcentaje) - Number(a.margen_porcentaje),
        );
        break;
      case "menor_margen":
        filtered = [...rawData].sort(
          (a, b) => Number(a.margen_porcentaje) - Number(b.margen_porcentaje),
        );
        break;
      case "sin_rotacion":
        filtered = rawData.filter((p) => p.total_vendido === 0);
        break;
      default:
        filtered = sortedBySales;
        break;
    }

    return filtered.map(mapToRow);
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
