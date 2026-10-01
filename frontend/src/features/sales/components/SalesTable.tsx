import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import { formatCurrency, formatPaymentMethodName, formatRate } from "@/lib/utils";
import type { Sale } from "../types";

export interface SalesTableProps {
  sales: Sale[];
  loading: boolean;
  onViewSale: (id: number) => void;
}

export default function SalesTable({ sales, loading, onViewSale }: SalesTableProps) {
  const columns: Column<Sale>[] = [
    {
      key: "fecha_venta",
      header: "Fecha",
      render: (s: Sale) => new Date(s.fecha_venta).toLocaleDateString("es-VE"),
    },
    {
      key: "total_usd",
      header: "Total USD",
      render: (s: Sale) => (
        <span className="font-semibold text-slate-900">{formatCurrency(s.total_usd)}</span>
      ),
    },
    {
      key: "total_ves",
      header: "Total VES",
      hideOnMobile: true,
      render: (s: Sale) => formatCurrency(s.total_ves, "Bs "),
    },
    {
      key: "metodo_pago",
      header: "Método de Pago",
      hideOnMobile: true,
      render: (s: Sale) => (
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {s.metodo_pago ? s.metodo_pago.split(", ").map(formatPaymentMethodName).join(", ") : "-"}
        </span>
      ),
    },
    {
      key: "tasa_bcv_aplicada",
      header: "Tasa BCV",
      hideOnMobile: true,
      render: (s: Sale) => formatRate(s.tasa_bcv_aplicada),
    },
    {
      key: "items",
      header: "Items",
      render: (s: Sale) => s.items.length,
    },
    {
      key: "acciones",
      header: "",
      render: (s: Sale) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewSale(s.id)}
        >
          Ver
        </Button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={sales}
      keyExtractor={(s) => s.id}
      loading={loading}
      emptyMessage="No hay ventas registradas"
      className="!rounded-none !border-0 !shadow-none"
    />
  );
}
