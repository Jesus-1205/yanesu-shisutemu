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
      <div className="flex h-30 items-center justify-center">
        <p className="text-sm text-slate-400">Sin productos de este proveedor</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">Catálogo e Inventario</h3>
        <span className="text-xs font-medium text-slate-400">{data.length} productos</span>
      </div>
      <div className="max-h-65 overflow-y-auto rounded-xl border border-slate-200/90 shadow-xs">
        <Table
          className="!rounded-none !border-0 !shadow-none"
          columns={[
            {
              key: "nombre",
              header: "Producto",
              sortable: true,
              onSort: () => requestSort("nombre"),
              sortDirection: sortConfig?.key === "nombre" ? sortConfig.direction : null,
              className: "max-w-44 truncate font-medium text-slate-900",
            },
            {
              key: "stock_unidades",
              header: "Stock",
              sortable: true,
              onSort: () => requestSort("stock_unidades"),
              sortDirection: sortConfig?.key === "stock_unidades" ? sortConfig.direction : null,
              render: (p: SupplierDetailProduct) =>
                p.stock_unidades <= 0 ? (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    0
                  </span>
                ) : p.stock_unidades <= 5 ? (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {p.stock_unidades}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-700">{p.stock_unidades}</span>
                ),
              exportValue: (p: SupplierDetailProduct) => p.stock_unidades,
            },
            {
              key: "precio_unidad_usd",
              header: "Precio",
              sortable: true,
              onSort: () => requestSort("precio_unidad_usd"),
              sortDirection: sortConfig?.key === "precio_unidad_usd" ? sortConfig.direction : null,
              render: (p: SupplierDetailProduct) => (
                <span className="font-semibold text-slate-900">
                  {formatCurrency(Number(p.precio_unidad_usd))}
                </span>
              ),
              exportValue: (p: SupplierDetailProduct) => Number(p.precio_unidad_usd),
            },
            {
              key: "margen_porcentaje",
              header: "Margen",
              sortable: true,
              onSort: () => requestSort("margen_porcentaje"),
              sortDirection: sortConfig?.key === "margen_porcentaje" ? sortConfig.direction : null,
              render: (p: SupplierDetailProduct) => (
                <span className="text-xs font-semibold text-emerald-600">
                  {Number(p.margen_porcentaje).toFixed(1)}%
                </span>
              ),
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
