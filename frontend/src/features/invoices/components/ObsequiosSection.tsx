import { useState } from "react";
import { Trash2, ChevronDown, ChevronUp, Gift } from "lucide-react";
import type { ProductOut } from "@/types/api";
import { useInvoiceFormStore } from "../store/invoiceFormStore";
import ObsequioForm from "./ObsequioForm";

interface ObsequiosSectionProps {
  products: ProductOut[];
  onSearchProducts: (query: string) => Promise<Array<{ value: number; label: string; subtitle?: string }>>;
}

export default function ObsequiosSection({ products, onSearchProducts }: ObsequiosSectionProps) {
  const [showObsequios, setShowObsequios] = useState(false);
  const obsequioItems = useInvoiceFormStore((s) => s.obsequioItems);
  const addObsequio = useInvoiceFormStore((s) => s.addObsequio);
  const removeObsequio = useInvoiceFormStore((s) => s.removeObsequio);

  return (
    <div className="overflow-hidden rounded-xl border-2 border-purple-200 bg-purple-50/50">
      <button
        type="button"
        onClick={() => setShowObsequios((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-purple-100/50"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-purple-800 uppercase">
          <Gift className="size-4" />
          Obsequios / Cortesías
          {obsequioItems.length > 0 && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{obsequioItems.length}</span>
          )}
        </h3>
        {showObsequios ? (
          <ChevronUp className="size-4 text-purple-500" />
        ) : (
          <ChevronDown className="size-4 text-purple-500" />
        )}
      </button>

      {showObsequios && (
        <div className="space-y-4 border-t border-purple-200 px-5 pb-5">
          <div className="mt-3 space-y-3 rounded-lg border border-purple-200 bg-white p-4">
            <div className="text-xs font-semibold tracking-wider text-purple-600 uppercase">Agregar Obsequio</div>
            <ObsequioForm
              products={products}
              onSearchProducts={onSearchProducts}
              onAdd={(item) => addObsequio(item)}
            />
          </div>

          {obsequioItems.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-purple-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-200 bg-purple-50 text-purple-700">
                    <th className="px-4 py-2 text-left text-xs font-medium tracking-wider uppercase">Producto</th>
                    <th className="px-4 py-2 text-center text-xs font-medium tracking-wider uppercase">Tipo</th>
                    <th className="px-4 py-2 text-right text-xs font-medium tracking-wider uppercase">Cant</th>
                    <th className="px-4 py-2 text-left text-xs font-medium tracking-wider uppercase">Justificación</th>
                    <th className="w-16 px-3 py-2 text-center text-xs font-medium tracking-wider uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100">
                  {obsequioItems.map((item) => (
                    <tr key={item.key} className="bg-purple-50/30 transition-colors hover:bg-purple-50/60">
                      <td className="max-w-50 truncate px-4 py-2 font-medium text-text-main">{item.nombre}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.tipo_empaque === "CAJA" ? "bg-purple-100 text-purple-700" : "bg-purple-100 text-purple-600"
                        }`}>
                          {item.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-text-main tabular-nums">{item.cantidad}</td>
                      <td className="max-w-[250px] truncate px-4 py-2 text-xs text-slate-600">{item.justificacion}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeObsequio(item.key)}
                          className="cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Eliminar obsequio"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {obsequioItems.length === 0 && (
            <p className="py-2 text-center text-xs text-purple-400">
              No hay obsequios registrados. Los obsequios actualizan el stock sin afectar el total.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
