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
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">Producto</th>
              <th className="px-4 py-3 text-center text-xs font-medium tracking-wider uppercase">Tipo</th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">Cant</th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">$/Caja</th>
              <th className="hidden px-4 py-3 text-right text-xs font-medium tracking-wider uppercase md:table-cell">$/Und</th>
              <th className="hidden px-4 py-3 text-right text-xs font-medium tracking-wider uppercase md:table-cell">Bs./Unid</th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">USD</th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">Bs.</th>
              <th className="w-16 p-3 text-center text-xs font-medium tracking-wider uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-surface">
            {lineItems.map((item) => (
              <tr key={item.key} className="transition-colors hover:bg-slate-50/80">
                <td className="max-w-55 truncate px-4 py-3 font-medium text-text-main">
                  {item.nombre}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.tipo_empaque === "CAJA"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {item.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                    </span>
                    {item.tipo_empaque === "CAJA" && item.unidades_por_caja > 1 && (
                      <span className="mt-0.5 text-[10px] text-slate-400">{item.unidades_por_caja} unds/caja</span>
                    )}
                    {aplicaIva && esBs && (
                      <button
                        type="button"
                        onClick={() => toggleItemIva(item.key)}
                        className={`mt-0.5 inline-flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
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
                <td className="px-4 py-3 text-right font-mono text-text-main">
                  {item.tipo_empaque === "CAJA" ? (
                    <span className="text-sm font-semibold">{formatUsd(item.costo_unitario_usd)}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-right font-mono text-text-main md:table-cell">
                  {item.tipo_empaque === "UNIDAD" ? (
                    <span className={esBs ? "text-xs text-slate-400" : "text-sm font-semibold"}>
                      {esBs && "≈ "}{formatUsd(item.costo_unitario_usd)}
                    </span>
                  ) : item.unidades_por_caja > 0 ? (
                    <span className="text-xs text-slate-400">{esBs && "≈ "}{formatUsd(item.costo_unitario_usd / item.unidades_por_caja)}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-right font-mono text-text-main md:table-cell">
                  <span className={esBs ? "text-sm font-semibold" : "text-xs"}>
                    {!esBs && "≈ "}Bs. {formatBs(item.costo_unitario_bs)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-text-main tabular-nums">
                  <span className={!esBs ? "font-semibold" : ""}>{formatUsd(item.subtotal_usd)}</span>
                </td>
                <td className="px-4 py-3 text-right text-text-main tabular-nums">
                  <span className={esBs ? "font-semibold" : ""}>Bs. {formatBs(item.subtotal_bs)}</span>
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.key)}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`Eliminar ${item.nombre}`}
                    title="Eliminar ítem"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-100/70 font-semibold text-text-main">
              <td className="px-4 py-3.5">Totales</td>
              <td />
              <td className="px-4 py-3.5 text-right text-xs tabular-nums">
                {ivaBreakdown.totalUnidades} unds
              </td>
              <td />
              <td className="hidden md:table-cell" />
              <td className="hidden md:table-cell" />
              <td className="px-4 py-3.5 text-right tabular-nums">
                <span>{formatUsd(totalUsd)}</span>
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