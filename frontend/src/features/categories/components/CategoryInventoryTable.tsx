import { formatCurrency } from "@/lib/utils";
import type { CategoryDetailProduct } from "@/types/api";
import Table from "@/ui-components/Table";
import { useSortableData } from "@/hooks/useSortableData";
import { useToast } from "@/ui-components/Toast";

interface CategoryInventoryTableProps {
  data: CategoryDetailProduct[];
  categoryName: string;
}

export default function CategoryInventoryTable({ data, categoryName }: CategoryInventoryTableProps) {
  const { toast } = useToast();
  const { sorted, sortConfig, requestSort } = useSortableData(
    data as (CategoryDetailProduct & Record<string, unknown>)[],
    "nombre",
  );

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[120px]">
        <p className="text-sm text-slate-400">Sin productos en esta categoría</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-main mb-2">Inventario</h3>
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
              render: (p: CategoryDetailProduct) =>
                p.stock_unidades <= 5 ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                    {p.stock_unidades}
                  </span>
                ) : (
                  <span>{p.stock_unidades}</span>
                ),
              exportValue: (p: CategoryDetailProduct) => p.stock_unidades,
            },
            {
              key: "precio_unidad_usd",
              header: "Precio",
              sortable: true,
              onSort: () => requestSort("precio_unidad_usd"),
              sortDirection: sortConfig?.key === "precio_unidad_usd" ? sortConfig.direction : null,
              render: (p: CategoryDetailProduct) => formatCurrency(Number(p.precio_unidad_usd)),
              exportValue: (p: CategoryDetailProduct) => Number(p.precio_unidad_usd),
            },
            {
              key: "margen_porcentaje",
              header: "Margen",
              sortable: true,
              onSort: () => requestSort("margen_porcentaje"),
              sortDirection: sortConfig?.key === "margen_porcentaje" ? sortConfig.direction : null,
              render: (p: CategoryDetailProduct) => `${Number(p.margen_porcentaje).toFixed(1)}%`,
              exportValue: (p: CategoryDetailProduct) => Number(p.margen_porcentaje),
            },
          ]}
          data={sorted}
          keyExtractor={(p) => p.id}
          emptyMessage="Sin productos en esta categoría"
          exportable
          singleExport
          exportFilename={`Inventario_categoria_${categoryName}`}
          onExported={(name) => toast(`Archivo descargado: ${name}`, "success")}
        />
      </div>
    </div>
  );
}
