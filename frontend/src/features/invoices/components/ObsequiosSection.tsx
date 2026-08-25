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
    <div className="rounded-xl border-2 border-purple-200 bg-purple-50/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setShowObsequios((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-purple-100/50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wide flex items-center gap-2">
          <Gift className="w-4 h-4" />
          Obsequios / Cortesías
          {obsequioItems.length > 0 && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{obsequioItems.length}</span>
          )}
        </h3>
        {showObsequios ? (
          <ChevronUp className="w-4 h-4 text-purple-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-purple-500" />
        )}
      </button>

      {showObsequios && (
        <div className="px-5 pb-5 space-y-4 border-t border-purple-200">
          <div className="rounded-lg border border-purple-200 bg-white p-4 space-y-3 mt-3">
            <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Agregar Obsequio</div>
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
                  <tr className="bg-purple-50 border-b border-purple-200 text-purple-700">
                    <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-2">Producto</th>
                    <th className="text-center text-xs font-medium uppercase tracking-wider px-4 py-2">Tipo</th>
                    <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-2">Cant</th>
                    <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-2">Justificación</th>
                    <th className="text-center text-xs font-medium uppercase tracking-wider px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100">
                  {obsequioItems.map((item) => (
                    <tr key={item.key} className="bg-purple-50/30 hover:bg-purple-50/60 transition-colors">
                      <td className="px-4 py-2 text-text-main font-medium max-w-[200px] truncate">{item.nombre}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.tipo_empaque === "CAJA" ? "bg-purple-100 text-purple-700" : "bg-purple-100 text-purple-600"
                        }`}>
                          {item.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-text-main tabular-nums">{item.cantidad}</td>
                      <td className="px-4 py-2 text-xs text-slate-600 max-w-[250px] truncate">{item.justificacion}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeObsequio(item.key)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar obsequio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {obsequioItems.length === 0 && (
            <p className="text-xs text-purple-400 text-center py-2">
              No hay obsequios registrados. Los obsequios actualizan el stock sin afectar el total.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
