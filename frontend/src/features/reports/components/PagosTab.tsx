import { Suspense, lazy, useMemo } from "react";
import { Banknote, DollarSign, Wallet } from "lucide-react";
import type { PaymentMethodSummaryItem } from "@/types/api";
import { useSortableData } from "@/hooks/useSortableData";
import StatCard from "@/ui-components/StatCard";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import Spinner from "@/ui-components/Spinner";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency, formatPaymentMethodName } from "@/lib/utils";
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";

const PaymentMethodsDonut = lazy(() => import("./PaymentMethodsDonut"));

interface PagosTabProps {
  data: PaymentMethodSummaryItem[];
  loading: boolean;
  desde: string;
  hasta: string;
  onDesdeChange: (v: string) => void;
  onHastaChange: (v: string) => void;
  onClear: () => void;
}

export default function PagosTab({
  data,
  loading,
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
  onClear,
}: PagosTabProps) {
  const { toast } = useToast();
  const notifyExport = (name: string) => toast(`Archivo descargado: ${name}`, "success");
  const { sorted, sortConfig, requestSort } = useSortableData<PaymentMethodSummaryItem & Record<string, unknown>>(
    data as (PaymentMethodSummaryItem & Record<string, unknown>)[],
    "total_usd",
    "desc",
  );

  const totals = useMemo(() => {
    let totalUsd = 0;
    let totalVes = 0;
    let totalPagos = 0;
    let totalEquivUsd = 0;
    for (const m of data) {
      totalUsd = Math.round((totalUsd + (Number(m.total_usd) || 0)) * 100) / 100;
      totalVes = Math.round((totalVes + (Number(m.total_ves) || 0)) * 100) / 100;
      totalPagos += m.cantidad_pagos || 0;
      totalEquivUsd = Math.round((totalEquivUsd + (Number(m.total_equivalente_usd) || 0)) * 100) / 100;
    }
    return { totalUsd, totalVes, totalPagos, totalEquivUsd };
  }, [data]);
  const { totalUsd, totalVes, totalPagos, totalEquivUsd } = totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => onDesdeChange(e.target.value)}
            autoComplete="off"
            className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => onHastaChange(e.target.value)}
            autoComplete="off"
            className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>
        {(desde || hasta) && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Limpiar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Recibido USD" value={formatCurrency(totalUsd)} icon={<DollarSign className="size-5" />} variant="success" />
            <StatCard label="Recibido VES" value={formatCurrency(totalVes, "Bs ")} icon={<Banknote className="size-5" />} variant="info" />
            <StatCard label="Equivalente USD" value={formatCurrency(totalEquivUsd)} icon={<DollarSign className="size-5" />} />
            <StatCard label="Total de Pagos" value={String(totalPagos)} icon={<Wallet className="size-5" />} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-surface p-5">
            <Suspense fallback={<ChartSkeleton />}>
              <PaymentMethodsDonut data={data} />
            </Suspense>
          </div>

          <div className="rounded-xl border border-slate-200 bg-surface p-5">
            <h2 className="mb-3 text-lg font-semibold text-text-main">Detalle por Método de Pago</h2>
            <Table
              columns={[
                {
                  key: "metodo_pago_nombre",
                  header: "Método",
                  sortable: true,
                  onSort: () => requestSort("metodo_pago_nombre"),
                  sortDirection: sortConfig?.key === "metodo_pago_nombre" ? sortConfig.direction : null,
                  render: (m: PaymentMethodSummaryItem) => (
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {formatPaymentMethodName(m.metodo_pago_nombre)}
                      </span>
                      <span className="text-xs text-slate-400">{m.moneda_default}</span>
                    </span>
                  ),
                },
                {
                  key: "cantidad_pagos",
                  header: "Pagos",
                  sortable: true,
                  onSort: () => requestSort("cantidad_pagos"),
                  sortDirection: sortConfig?.key === "cantidad_pagos" ? sortConfig.direction : null,
                  render: (m: PaymentMethodSummaryItem) => String(m.cantidad_pagos),
                  exportValue: (m: PaymentMethodSummaryItem) => m.cantidad_pagos,
                },
                {
                  key: "total_usd",
                  header: "Total USD",
                  sortable: true,
                  onSort: () => requestSort("total_usd"),
                  sortDirection: sortConfig?.key === "total_usd" ? sortConfig.direction : null,
                  render: (m: PaymentMethodSummaryItem) => formatCurrency(m.total_usd),
                  exportValue: (m: PaymentMethodSummaryItem) => Number(m.total_usd),
                },
                {
                  key: "total_ves",
                  header: "Total VES",
                  sortable: true,
                  onSort: () => requestSort("total_ves"),
                  sortDirection: sortConfig?.key === "total_ves" ? sortConfig.direction : null,
                  render: (m: PaymentMethodSummaryItem) => formatCurrency(m.total_ves, "Bs "),
                  exportValue: (m: PaymentMethodSummaryItem) => Number(m.total_ves),
                },
                {
                  key: "total_equivalente_usd",
                  header: "Equiv. USD",
                  sortable: true,
                  onSort: () => requestSort("total_equivalente_usd"),
                  sortDirection: sortConfig?.key === "total_equivalente_usd" ? sortConfig.direction : null,
                  render: (m: PaymentMethodSummaryItem) => formatCurrency(m.total_equivalente_usd),
                  exportValue: (m: PaymentMethodSummaryItem) => Number(m.total_equivalente_usd),
                },
              ]}
              data={sorted}
              keyExtractor={(m) => m.metodo_pago_id}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Metodos_pago_estadisticas"
              onExported={notifyExport}
              allData={sorted as (PaymentMethodSummaryItem & Record<string, unknown>)[]}
            />
          </div>
        </>
      )}
    </div>
  );
}
