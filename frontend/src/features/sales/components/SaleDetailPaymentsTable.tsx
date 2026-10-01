import Table from "@/ui-components/Table";
import type { Column } from "@/ui-components/Table";
import { formatCurrency, formatPaymentMethodName } from "@/lib/utils";
import type { SalePayment } from "../types";

export interface SaleDetailPaymentsTableProps {
  pagos: SalePayment[];
}

export default function SaleDetailPaymentsTable({ pagos }: SaleDetailPaymentsTableProps) {
  const columns: Column<SalePayment>[] = [
    {
      key: "metodo_pago_nombre",
      header: "Método",
      render: (p: SalePayment) => formatPaymentMethodName(p.metodo_pago_nombre),
    },
    {
      key: "referencia",
      header: "Referencia",
      render: (p: SalePayment) => p.referencia || "-",
    },
    {
      key: "monto_usd",
      header: "Monto USD",
      render: (p: SalePayment) => formatCurrency(p.monto_usd),
    },
    {
      key: "monto_ves",
      header: "Monto VES",
      render: (p: SalePayment) => formatCurrency(p.monto_ves, "Bs "),
    },
  ];

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-semibold text-text-main">Pagos</h3>
      <Table
        columns={columns}
        data={pagos}
        keyExtractor={(p) => p.id}
        emptyMessage="Sin pagos registrados"
      />
    </div>
  );
}
