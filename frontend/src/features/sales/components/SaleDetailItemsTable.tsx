import Table from "@/ui-components/Table";
import Badge from "@/ui-components/Badge";
import type { Column } from "@/ui-components/Table";
import { formatCurrency } from "@/lib/utils";
import type { SaleItem } from "../types";

export interface SaleDetailItemsTableProps {
  items: SaleItem[];
}

export default function SaleDetailItemsTable({ items }: SaleDetailItemsTableProps) {
  const columns: Column<SaleItem>[] = [
    {
      key: "producto_nombre",
      header: "Producto",
      render: (i: SaleItem) => (
        <div className="flex items-center gap-1.5">
          <span>{i.producto_nombre || `Producto #${i.producto_id}`}</span>
          {i.combo_id && i.combo_nombre ? (
            <Badge variant="warning" className="text-[10px]! bg-amber-100! px-1! py-0! text-amber-700!">
              {i.combo_nombre}
            </Badge>
          ) : i.usa_precio_divisas ? (
            <Badge variant="success" className="text-[10px]! px-1! py-0!">DIV</Badge>
          ) : null}
        </div>
      ),
    },
    { key: "tipo_empaque", header: "Empaque" },
    { key: "cantidad", header: "Cantidad" },
    { key: "unidades_descontadas", header: "Unds." },
    {
      key: "precio_unitario_usd",
      header: "Precio Ud.",
      render: (i: SaleItem) => formatCurrency(i.precio_unitario_usd),
    },
    {
      key: "subtotal_usd",
      header: "Subtotal",
      render: (i: SaleItem) => formatCurrency(i.subtotal_usd),
    },
    {
      key: "iva_porcentaje",
      header: "IVA %",
      render: (i: SaleItem) => `${i.iva_porcentaje}%`,
    },
  ];

  return (
    <Table
      columns={columns}
      data={items}
      keyExtractor={(i) => i.id}
      emptyMessage="Sin items"
    />
  );
}
