import { Trash2 } from "lucide-react";
import { formatBs, formatUsd } from "@/lib/text";
import { useInvoiceFormStore } from "../store/invoiceFormStore";

interface LineItemsTableProps {
  esBs: boolean;
  aplicaIva: boolean;
  totalUsd: number;
  totalBs: number;
  ivaBreakdown: {
    exento: number;
    base_imponible: number;
    iva: number;
    total: number;
    totalUnidades: number;
  };
}

export default function LineItemsTable({ esBs, aplicaIva, totalUsd, totalBs, ivaBreakdown }: LineItemsTableProps) {
  const lineItems = useInvoiceFormStore((s) => s.lineItems);
  const removeLineItem = useInvoiceFormStore((s) => s.removeLineItem);
  const toggleItemIva = useInvoiceFormStore((s) => s.toggleItemIva);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
              <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3">Producto</th>
              <th className="text-center text-xs font-medium uppercase tracking-wider px-4 py-3">Tipo</th>
              <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3">Cant</th>
              <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3">$/Caja</th>
              <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3 hidden md:table-cell">$/Und</th>
              <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3 hidden md:table-cell">Bs./Unid</th>
              <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3">USD</th>
              <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3">Bs.</th>
              <th className="text-center text-xs font-medium uppercase tracking-wider px-3 py-3 w-16">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-surface">
            {lineItems.map((item) => (
              <tr key={item.key} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 text-text-main font-medium max-w-[220px] truncate">
                  {item.nombre}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.tipo_empaque === "CAJA"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {item.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                    </span>
                    {item.tipo_empaque === "CAJA" && item.unidades_por_caja > 1 && (
                      <span className="text-[10px] text-slate-400 mt-0.5">{item.unidades_por_caja} unds/caja</span>
                    )}
                    {aplicaIva && esBs && (
                      <button
                        type="button"
                        onClick={() => toggleItemIva(item.key)}
                        className={`mt-0.5 inline-flex items-center gap-1 text-[10px] cursor-pointer rounded-full px-1.5 py-0.5 font-medium transition-colors ${
                          item.tipo_iva === "GRAVADO"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                        }`}
                      >
                        {item.tipo_iva === "GRAVADO" ? "IVA 16%" : "Exento"}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-text-main tabular-nums">
                  {item.cantidad}
                </td>
                <td className="px-4 py-3 text-right text-text-main font-mono">
                  {item.tipo_empaque === "CAJA" ? (
                    <span className="font-semibold text-sm">{formatUsd(item.costo_unitario_usd)}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-text-main font-mono hidden md:table-cell">
                  {item.tipo_empaque === "UNIDAD" ? (
                    <span className="font-semibold text-sm">{formatUsd(item.costo_unitario_usd)}</span>
                  ) : item.unidades_por_caja > 0 ? (
                    <span className="text-xs text-slate-400">{formatUsd(item.costo_unitario_usd / item.unidades_por_caja)}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-text-main font-mono hidden md:table-cell">
                  <span className="text-xs">Bs. {formatBs(item.costo_unitario_bs)}</span>
                </td>
                <td className="px-4 py-3 text-right text-text-main tabular-nums">
                  {formatUsd(item.subtotal_usd)}
                </td>
                <td className="px-4 py-3 text-right text-text-main tabular-nums">
                  Bs. {formatBs(item.subtotal_bs)}
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.key)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                    aria-label={`Eliminar ${item.nombre}`}
                    title="Eliminar ítem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100/70 border-t-2 border-slate-200 font-semibold text-text-main">
              <td className="px-4 py-3.5">Totales</td>
              <td />
              <td className="px-4 py-3.5 text-right tabular-nums text-xs">
                {ivaBreakdown.totalUnidades} unds
              </td>
              <td />
              <td className="hidden md:table-cell" />
              <td className="hidden md:table-cell" />
              <td className="px-4 py-3.5 text-right tabular-nums">
                {formatUsd(totalUsd)}
              </td>
              <td className="px-4 py-3.5 text-right tabular-nums">
                Bs. {formatBs(totalBs)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
