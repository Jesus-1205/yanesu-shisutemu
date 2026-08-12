import { formatCurrency } from "@/lib/utils";
import type { SupplierDetailProduct } from "@/types/api";
import Table from "@/ui-components/Table";
import { useSortableData } from "@/hooks/useSortableData";
import { useToast } from "@/ui-components/Toast";

interface SupplierInventoryTableProps {
  data: SupplierDetailProduct[];
  supplierName: string;
}

export default function SupplierInventoryTable({ data, supplierName }: SupplierInventoryTableProps) {
  const { toast } = useToast();
  const { sorted, sortConfig, requestSort } = useSortableData(
    data as (SupplierDetailProduct & Record<string, unknown>)[],
    "stock_unidades",
    "asc",
  );

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[120px]">
        <p className="text-sm text-slate-400">Sin productos de este proveedor</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-main mb-2">Catálogo e Inventario</h3>
      <div className="max-h-[260px] overflow-y-auto">
        <Table
          columns={[
            {
              key: "nombre",
              header: "Producto",
              sortable: true,
              onSort: () => requestSort("nombre"),
              sortDirection: sortConfig?.key === "nombre" ? sortConfig.direction : null,
              className: "max-w-[160px] truncate",
            },
            {
              key: "stock_unidades",
              header: "Stock",
              sortable: true,
              onSort: () => requestSort("stock_unidades"),
              sortDirection: sortConfig?.key === "stock_unidades" ? sortConfig.direction : null,
              render: (p: SupplierDetailProduct) =>
                p.stock_unidades <= 0 ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                    0
                  </span>
                ) : p.stock_unidades <= 5 ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">
                    {p.stock_unidades}
                  </span>
                ) : (
                  <span>{p.stock_unidades}</span>
                ),
              exportValue: (p: SupplierDetailProduct) => p.stock_unidades,
            },
            {
              key: "precio_unidad_usd",
              header: "Precio",
              sortable: true,
              onSort: () => requestSort("precio_unidad_usd"),
              sortDirection: sortConfig?.key === "precio_unidad_usd" ? sortConfig.direction : null,
              render: (p: SupplierDetailProduct) => formatCurrency(Number(p.precio_unidad_usd)),
              exportValue: (p: SupplierDetailProduct) => Number(p.precio_unidad_usd),
            },
            {
              key: "margen_porcentaje",
              header: "Margen",
              sortable: true,
              onSort: () => requestSort("margen_porcentaje"),
              sortDirection: sortConfig?.key === "margen_porcentaje" ? sortConfig.direction : null,
              render: (p: SupplierDetailProduct) => `${Number(p.margen_porcentaje).toFixed(1)}%`,
              exportValue: (p: SupplierDetailProduct) => Number(p.margen_porcentaje),
            },
          ]}
          data={sorted}
          keyExtractor={(p) => p.id}
          emptyMessage="Sin productos de este proveedor"
          exportable
          singleExport
          exportFilename={`Inventario_proveedor_${supplierName}`}
          onExported={(name) => toast(`Archivo descargado: ${name}`, "success")}
        />
      </div>
    </div>
  );
}
