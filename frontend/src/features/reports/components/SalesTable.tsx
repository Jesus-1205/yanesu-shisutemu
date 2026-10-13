import { formatCurrency } from "@/lib/utils";
import Pagination from "@/ui-components/Pagination";
import type { SalesChartRow } from "../types";

export interface SalesTableProps {
  data: SalesChartRow[];
  totalRows: number;
  page: number;
  totalPages: number;
  pageSize: number;
  currency: string;
  currSymbol: string;
  onPageChange: (page: number) => void;
}

export default function SalesTable({
  data,
  totalRows,
  page,
  totalPages,
  pageSize,
  currency,
  currSymbol,
  onPageChange,
}: SalesTableProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3 text-center">N° de Ventas</th>
              <th className="px-4 py-3 text-right">Ingresos ({currency})</th>
              <th className="px-4 py-3 text-right">Costos ({currency})</th>
              <th className="px-4 py-3 text-right">Margen ({currency})</th>
              <th className="px-4 py-3 text-right">Rentabilidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => {
              const pct = row.ingresos > 0 ? ((row.margen / row.ingresos) * 100).toFixed(1) : "0.0";
              return (
                <tr key={row.periodoRaw} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.periodoFormatted}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs">{row.ventas}</td>
                  <td className="px-4 py-3 text-right font-medium text-blue-600">
                    {formatCurrency(row.ingresos, currSymbol)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatCurrency(row.costos, currSymbol)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    {formatCurrency(row.margen, currSymbol)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {pct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, totalRows)} de {totalRows} registros
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
