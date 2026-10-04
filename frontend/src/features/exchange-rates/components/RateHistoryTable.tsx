import { useMemo, useCallback } from "react";
import { History } from "lucide-react";
import Table, { type Column } from "@/ui-components/Table";
import Pagination from "@/ui-components/Pagination";
import { useToast } from "@/ui-components/Toast";
import { formatRateFull, formatDateTimeVE } from "@/lib/utils";
import type { ExchangeRate } from "../types";
import {
  type HistoryRow,
  enrichWithVariation,
  variationBadge,
  variationValue,
} from "../utils/variations";

interface RateHistoryTableProps {
  data: ExchangeRate[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onFetchAllData?: () => Promise<ExchangeRate[]>;
}

export default function RateHistoryTable({
  data,
  loading,
  page,
  totalPages,
  onPageChange,
  onFetchAllData,
}: RateHistoryTableProps) {
  const { toast } = useToast();

  const rows = useMemo(() => enrichWithVariation(data), [data]);

  const columns: Column<HistoryRow>[] = [
    {
      key: "fecha_registro",
      header: "Fecha",
      render: (r) => formatDateTimeVE(r.fecha_registro),
      hideOnMobile: true,
    },
    {
      key: "tasa_usd",
      header: "USD (Bs)",
      render: (r) => formatRateFull(r.tasa_usd),
      exportValue: (r) => Number(r.tasa_usd),
    },
    {
      key: "tasa_eur",
      header: "EUR (Bs)",
      render: (r) => formatRateFull(r.tasa_eur),
      exportValue: (r) => Number(r.tasa_eur),
    },
    {
      key: "variacion_usd",
      header: "Var. USD",
      render: (r) => variationBadge(Number(r.tasa_usd), r.previousUsd),
      exportValue: (r) => variationValue(Number(r.tasa_usd), r.previousUsd),
    },
    {
      key: "variacion_eur",
      header: "Var. EUR",
      render: (r) => variationBadge(Number(r.tasa_eur), r.previousEur),
      exportValue: (r) => variationValue(Number(r.tasa_eur), r.previousEur),
    },
    {
      key: "registrado_por_nombre",
      header: "Registrado por",
      render: (r) => r.registrado_por_nombre ?? "—",
      hideOnMobile: true,
    },
  ];

  const handleFetchAllData = useCallback(async (): Promise<HistoryRow[]> => {
    if (!onFetchAllData) return [];
    const all = await onFetchAllData();
    return enrichWithVariation(all);
  }, [onFetchAllData]);

  return (
    <div>
      <Table
        headerLeft={
          <div className="flex items-center gap-2 py-1">
            <History className="size-4 text-brand-blue" />
            <h2 className="text-sm font-semibold text-text-main">Historial de tasas</h2>
          </div>
        }
        columns={columns}
        data={rows}
        keyExtractor={(r) => r.id}
        loading={loading}
        emptyMessage="No hay tasas registradas"
        exportable
        exportFilename="Tasas_cambio"
        fetchAllData={onFetchAllData ? handleFetchAllData : undefined}
        onExported={(name) => toast(`Archivo descargado: ${name}`, "success")}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        className="mt-4"
      />
    </div>
  );
}
