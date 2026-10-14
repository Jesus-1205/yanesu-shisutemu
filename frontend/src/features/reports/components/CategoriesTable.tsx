import { formatCurrency } from "@/lib/utils";
import Pagination from "@/ui-components/Pagination";
import type { CategoryTableRow, CategoryTableTab } from "../types";

export interface CategoriesTableProps {
  data: CategoryTableRow[];
  totalRows: number;
  page: number;
  totalPages: number;
  pageSize: number;
  tableTab: CategoryTableTab;
  currency: "USD" | "VES";
  currSymbol: string;
  onTabChange: (tab: CategoryTableTab) => void;
  onPageChange: (page: number) => void;
}

const TABLE_TABS: { id: CategoryTableTab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "mas_vendidas", label: "Más vendidas" },
  { id: "mayor_margen", label: "Mayor margen" },
  { id: "menor_margen", label: "Menor margen" },
];

export default function CategoriesTable({
  data,
  totalRows,
  page,
  totalPages,
  pageSize,
  tableTab,
  currency,
  currSymbol,
  onTabChange,
  onPageChange,
}: CategoriesTableProps) {
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
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4 text-center">Productos</th>
              <th className="py-3 px-4 text-center">Unidades Vendidas</th>
              <th className="py-3 px-4 text-right">Ingresos ({currency})</th>
              <th className="py-3 px-4 text-right">Costos ({currency})</th>
              <th className="py-3 px-4 text-right">Margen ({currency})</th>
              <th className="py-3 px-4 text-right">Rentabilidad</th>
              <th className="py-3 px-4 text-right">Participación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                  No hay categorías registradas para este filtro o período
                </td>
              </tr>
            ) : (
              data.map((c) => {
                const rentPct = c.rentabilidad_pct.toFixed(1);
                const rentBadgeClass =
                  c.rentabilidad_pct >= 30
                    ? "bg-emerald-50 text-emerald-700"
                    : c.rentabilidad_pct >= 15
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-600";

                return (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-[180px]">
                      <span className="block truncate" title={c.nombre}>
                        {c.nombre}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-600">
                      {c.total_productos}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-700">
                      {c.unidades_vendidas}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-brand-blue">
                      {formatCurrency(c.ingresos, currSymbol)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatCurrency(c.costos, currSymbol)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(c.margen, currSymbol)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${rentBadgeClass}`}
                      >
                        {rentPct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-brand-blue rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, c.participacion_pct),
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {c.participacion_pct.toFixed(1)}%
                        </span>
                      </div>
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
            de <span className="font-medium text-slate-700">{totalRows}</span> categorías
          </p>
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
