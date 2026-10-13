import { formatCurrency } from "@/lib/utils";
import Pagination from "@/ui-components/Pagination";
import type { ProductTableRow, ProductTableTab } from "../types";

export interface ProductsTableProps {
  data: ProductTableRow[];
  totalRows: number;
  page: number;
  totalPages: number;
  pageSize: number;
  tableTab: ProductTableTab;
  sinRotacionCount: number;
  currency: "USD" | "VES";
  currSymbol: string;
  onTabChange: (tab: ProductTableTab) => void;
  onPageChange: (page: number) => void;
}

const TABLE_TABS: { id: ProductTableTab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "mas_vendidos", label: "Más Vendidos" },
  { id: "mayor_margen", label: "Mayor Margen" },
  { id: "menor_margen", label: "Menor Margen" },
  { id: "sin_rotacion", label: "Sin Rotación" },
];

export default function ProductsTable({
  data,
  totalRows,
  page,
  totalPages,
  pageSize,
  tableTab,
  sinRotacionCount,
  currency,
  currSymbol,
  onTabChange,
  onPageChange,
}: ProductsTableProps) {
  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-100 pb-3 -mx-1 px-1 flex-nowrap">
        {TABLE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`cursor-pointer shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tableTab === tab.id
                ? "bg-brand-blue text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab.label}
            {tab.id === "sin_rotacion" && sinRotacionCount > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  tableTab === tab.id ? "bg-white/20" : "bg-purple-100 text-purple-700"
                }`}
              >
                {sinRotacionCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3 text-center">Vendidos</th>
              <th className="px-4 py-3 text-right">Ingresos ({currency})</th>
              <th className="px-4 py-3 text-right">Costos ({currency})</th>
              <th className="px-4 py-3 text-right">Margen ({currency})</th>
              <th className="px-4 py-3 text-right">Rentabilidad</th>
              <th className="px-4 py-3 text-center">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No hay productos en esta categoría para el período seleccionado
                </td>
              </tr>
            ) : (
              data.map((p) => {
                const rentPct = p.rentabilidad_pct.toFixed(1);
                const stockBadge =
                  p.stock_unidades === 0
                    ? "bg-red-50 text-red-600"
                    : p.stock_unidades <= 5
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-50 text-slate-600";

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px]">
                      <span className="block truncate" title={p.nombre}>
                        {p.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs">{p.total_vendido}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                      {formatCurrency(p.ingresos, currSymbol)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCurrency(p.costos, currSymbol)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(p.margen, currSymbol)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          Number(rentPct) >= 30
                            ? "bg-emerald-50 text-emerald-700"
                            : Number(rentPct) >= 15
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-600"
                        }`}
                      >
                        {rentPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stockBadge}`}>
                        {p.stock_unidades} u
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + count */}
      {totalRows > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Mostrando{" "}
            <span className="font-medium text-slate-700">
              {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, totalRows)}
            </span>{" "}
            de <span className="font-medium text-slate-700">{totalRows}</span> productos
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
