import React from "react";
import { ArrowRight, Trophy } from "lucide-react";
import Button from "@/ui-components/Button";
import type { TopSupplier } from "@/types/api";

export interface ComprasHubTopSuppliersProps {
  suppliers: TopSupplier[];
  onViewAll: () => void;
  onSelectSupplier: (supplierId: number) => void;
}

export const ComprasHubTopSuppliers: React.FC<ComprasHubTopSuppliersProps> = ({
  suppliers,
  onViewAll,
  onSelectSupplier,
}) => {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-main">Top Proveedores</h2>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          Ver todos
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-surface p-8 text-center">
          <p className="text-sm text-slate-500">No hay proveedores con compras registradas</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-12 px-4 py-3 text-left font-medium text-slate-600">#</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Proveedor</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Compras</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, idx) => (
                <tr
                  key={s.supplier_id}
                  className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50"
                  onClick={() => onSelectSupplier(s.supplier_id)}
                >
                  <td className="px-4 py-3">
                    {idx === 0 ? (
                      <Trophy className="size-4 text-amber-500" />
                    ) : (
                      <span className="font-mono text-xs text-slate-400">{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-text-main">{s.supplier_name}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">
                    {s.invoice_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ComprasHubTopSuppliers;
