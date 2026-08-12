import { useMemo } from "react";
import { History } from "lucide-react";
import Table, { type Column } from "@/ui-components/Table";
import Pagination from "@/ui-components/Pagination";
import { useToast } from "@/ui-components/Toast";
import { api } from "@/services/api";
import { formatRateFull, formatDateTimeVE } from "@/lib/utils";
import type { ExchangeRate } from "../types";

interface RateHistoryTableProps {
  data: ExchangeRate[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface HistoryRow extends ExchangeRate {
  previousUsd?: number;
  previousEur?: number;
}

const PAGE_SIZE = 200;

function enrichWithVariation(rates: ExchangeRate[]): HistoryRow[] {
  return rates.map((r, i) => ({
    ...r,
    previousUsd: i < rates.length - 1 ? Number(rates[i + 1].tasa_usd) : undefined,
    previousEur: i < rates.length - 1 ? Number(rates[i + 1].tasa_eur) : undefined,
  }));
}

function variationBadge(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) {
    return <span className="text-slate-300">—</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
        up ? "text-success" : "text-danger"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

export default function RateHistoryTable({
  data,
  loading,
  page,
  totalPages,
  onPageChange,
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
    },
    {
      key: "tasa_eur",
      header: "EUR (Bs)",
      render: (r) => formatRateFull(r.tasa_eur),
    },
    {
      key: "variacion_usd",
      header: "Var. USD",
      render: (r) => variationBadge(Number(r.tasa_usd), r.previousUsd),
    },
    {
      key: "variacion_eur",
      header: "Var. EUR",
      render: (r) => variationBadge(Number(r.tasa_eur), r.previousEur),
    },
    {
      key: "registrado_por_nombre",
      header: "Registrado por",
      render: (r) => r.registrado_por_nombre ?? "—",
      hideOnMobile: true,
    },
  ];

  const fetchAllRates = async (): Promise<HistoryRow[]> => {
    const all: ExchangeRate[] = [];
    let currentPage = 1;
    let pages = 1;
    do {
      const res = await api.getRateHistoryPaginated({
        page: currentPage,
        page_size: PAGE_SIZE,
      });
      all.push(...res.items);
      pages = res.pages;
      currentPage += 1;
    } while (currentPage <= pages);
    return enrichWithVariation(all);
  };

  return (
    <div>
      <Table
        headerLeft={
          <div className="flex items-center gap-2 py-1">
            <History className="w-4 h-4 text-brand-blue" />
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
        fetchAllData={fetchAllRates}
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
