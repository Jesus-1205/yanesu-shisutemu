import { useMemo, useState } from "react";
import { useToast } from "@/ui-components/Toast";
import { useSortableData } from "@/hooks/useSortableData";
import { formatPeriodRange } from "@/utils/dateUtils";
import { formatCurrency } from "@/lib/utils";
import Table from "@/ui-components/Table";
import Select from "@/ui-components/Select";
import type { SalesSummaryItem } from "@/features/sales/types";

const LIMIT_OPTIONS = [
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

interface SortableSalesTableProps {
  data: SalesSummaryItem[];
  rango: string;
}

export default function SortableSalesTable({ data, rango }: SortableSalesTableProps) {
  const { toast } = useToast();
  const notifyExport = (name: string) => toast(`Archivo descargado: ${name}`, "success");
  const [limit, setLimit] = useState(5);
  const visible = useMemo(() => data.slice(-limit), [data, limit]);
  const { sorted, sortConfig, requestSort } = useSortableData<SalesSummaryItem & Record<string, unknown>>(visible as (SalesSummaryItem & Record<string, unknown>)[], "periodo", "desc");
  const columns = [
    {
      key: "periodo",
      header: "Período",
      sortable: true,
      onSort: () => requestSort("periodo"),
      sortDirection: sortConfig?.key === "periodo" ? sortConfig.direction : null,
      render: (s: SalesSummaryItem) => formatPeriodRange(s.periodo, rango as "semanal"),
    },
    {
      key: "total_ventas",
      header: "Ventas",
      sortable: true,
      onSort: () => requestSort("total_ventas"),
      sortDirection: sortConfig?.key === "total_ventas" ? sortConfig.direction : null,
      render: (s: SalesSummaryItem) => String(s.total_ventas),
      exportValue: (s: SalesSummaryItem) => Number(s.total_ventas),
    },
    {
      key: "total_usd",
      header: "USD",
      sortable: true,
      onSort: () => requestSort("total_usd"),
      sortDirection: sortConfig?.key === "total_usd" ? sortConfig.direction : null,
      render: (s: SalesSummaryItem) => formatCurrency(s.total_usd),
      exportValue: (s: SalesSummaryItem) => Number(s.total_usd),
    },
    {
      key: "total_ves",
      header: "VES",
      sortable: true,
      onSort: () => requestSort("total_ves"),
      sortDirection: sortConfig?.key === "total_ves" ? sortConfig.direction : null,
      render: (s: SalesSummaryItem) => formatCurrency(s.total_ves, "Bs "),
      exportValue: (s: SalesSummaryItem) => Number(s.total_ves),
    },
  ];
  return (
    <Table
      headerLeft={<Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
      columns={columns}
      data={sorted}
      keyExtractor={(s) => s.periodo}
      emptyMessage="Sin datos"
      exportable
      exportFilename="Resumen_ventas"
      onExported={notifyExport}
      allData={data as (SalesSummaryItem & Record<string, unknown>)[]}
    />
  );
}
