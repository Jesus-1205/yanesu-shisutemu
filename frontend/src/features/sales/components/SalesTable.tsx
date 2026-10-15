import { useMemo } from "react";
import { Eye } from "lucide-react";
import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import Pagination from "@/ui-components/Pagination";
import { formatCurrency, formatPaymentMethodName, formatRate } from "@/lib/utils";
import type { SaleListItem } from "../types";

export interface SalesTableProps {
  sales: SaleListItem[];
  loading: boolean;
  onViewSale: (id: number) => void;
  totalRows?: number;
  page?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

function getPaymentMethodBadgeClass(methodName: string): string {
  const lower = methodName.toLowerCase();
  if (lower.includes("divisa") || lower.includes("usd") || lower.includes("dolar") || lower.includes("dólar")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
  }
  if (lower.includes("punto") || lower.includes("tarjeta") || lower.includes("pos") || lower.includes("debito") || lower.includes("débito")) {
    return "bg-blue-50 text-brand-blue border border-blue-200/60";
  }
  if (lower.includes("movil") || lower.includes("móvil") || lower.includes("transferencia")) {
    return "bg-purple-50 text-purple-700 border border-purple-200/60";
  }
  if (lower.includes("efectivo") || lower.includes("cash")) {
    return "bg-amber-50 text-amber-700 border border-amber-200/60";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200/60";
}

function formatSaleDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: iso, time: "" };
  const date = d.toLocaleDateString("es-VE");
  const time = d.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

export default function SalesTable({
  sales,
  loading,
  onViewSale,
  totalRows,
  page,
  totalPages,
  pageSize,
  onPageChange,
}: SalesTableProps) {
  const columns: Column<SaleListItem>[] = useMemo(
    () => [
      {
        key: "fecha_venta",
        header: "Fecha",
        render: (s: SaleListItem) => {
          const { date, time } = formatSaleDateTime(s.fecha_venta);
          return (
            <div className="flex flex-col">
              <span className="font-medium text-slate-900">{date}</span>
              {time ? <span className="text-xs text-slate-400 font-mono">{time}</span> : null}
            </div>
          );
        },
      },
      {
        key: "total_usd",
        header: "Total USD",
        render: (s: SaleListItem) => (
          <span className="font-semibold text-brand-blue">{formatCurrency(s.total_usd)}</span>
        ),
      },
      {
        key: "total_ves",
        header: "Total VES",
        hideOnMobile: true,
        render: (s: SaleListItem) => (
          <span className="text-xs text-slate-500 font-mono">{formatCurrency(s.total_ves, "Bs ")}</span>
        ),
      },
      {
        key: "metodo_pago",
        header: "Método de Pago",
        hideOnMobile: true,
        render: (s: SaleListItem) => {
          if (!s.metodo_pago) {
            return <span className="text-xs text-slate-400">-</span>;
          }
          const methods = s.metodo_pago.split(",").map((m) => m.trim()).filter(Boolean);
          if (methods.length === 0) {
            return <span className="text-xs text-slate-400">-</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {methods.map((method, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentMethodBadgeClass(method)}`}
                >
                  {formatPaymentMethodName(method)}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        key: "tasa_bcv_aplicada",
        header: "Tasa BCV",
        hideOnMobile: true,
        render: (s: SaleListItem) => (
          <span className="text-xs text-slate-500 font-mono">{formatRate(s.tasa_bcv_aplicada)}</span>
        ),
      },
      {
        key: "items",
        header: "Items",
        render: (s: SaleListItem) => (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {s.items_count}
          </span>
        ),
      },
      {
        key: "acciones",
        header: "",
        render: (s: SaleListItem) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewSale(s.id)}
            className="text-brand-blue hover:bg-blue-50 hover:text-blue-700"
          >
            <Eye className="size-3.5" />
            Ver
          </Button>
        ),
      },
    ],
    [onViewSale]
  );

  const showFooter = Boolean(
    totalRows && totalRows > 0 && page && totalPages && pageSize && onPageChange
  );

  return (
    <div>
      <Table
        columns={columns}
        data={sales}
        keyExtractor={(s) => s.id}
        loading={loading}
        emptyMessage="No hay ventas registradas"
        className="!rounded-none !border-0 !shadow-none"
      />
      {showFooter && page && pageSize && totalRows && totalPages && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 p-4 bg-slate-50/50">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Mostrando <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}</span> a{" "}
            <span className="font-semibold text-slate-700">{Math.min(page * pageSize, totalRows)}</span> de{" "}
            <span className="font-semibold text-slate-700">{totalRows}</span> ventas
          </p>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
          )}
        </div>
      )}
    </div>
  );
}
