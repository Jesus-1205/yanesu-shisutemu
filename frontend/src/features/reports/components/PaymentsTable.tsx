import { formatCurrency } from "@/lib/utils";
import Pagination from "@/ui-components/Pagination";
import type { PaymentTableRow, PaymentTableTab } from "../types";

export interface PaymentsTableProps {
  data: PaymentTableRow[];
  totalRows: number;
  page: number;
  totalPages: number;
  pageSize: number;
  tableTab: PaymentTableTab;
  currency: "USD" | "VES";
  currSymbol: string;
  onTabChange: (tab: PaymentTableTab) => void;
  onPageChange: (page: number) => void;
}

const TABLE_TABS: { id: PaymentTableTab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "divisas", label: "Divisas (USD)" },
  { id: "bolivares", label: "Bolívares (VES)" },
];

export default function PaymentsTable({
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
}: PaymentsTableProps) {
  return (
    <div className="space-y-4">
      {/* Sub-tabs with horizontal scroll for mobile */}
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
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="py-3 px-4">Método de Pago</th>
              <th className="py-3 px-4 text-center">Transacciones</th>
              <th className="py-3 px-4 text-right">Total USD</th>
              <th className="py-3 px-4 text-right">Total VES</th>
              <th className="py-3 px-4 text-right">Equiv. ({currency})</th>
              <th className="py-3 px-4 text-right">Participación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                  No hay métodos de pago registrados en este filtro
                </td>
              </tr>
            ) : (
              data.map((m) => {
                const isUsd = m.monedaDefault === "USD";

                return (
                  <tr
                    key={m.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {m.nombreFormatted}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                            isUsd
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {m.monedaDefault}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700">
                      {m.cantidadPagos}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(m.totalUsd, "$")}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(m.totalVes, "Bs ")}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-brand-blue">
                      {formatCurrency(m.totalEquiv, currSymbol)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-brand-blue rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, m.participacionPct),
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {m.participacionFormatted}%
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
            de <span className="font-medium text-slate-700">{totalRows}</span> métodos
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
