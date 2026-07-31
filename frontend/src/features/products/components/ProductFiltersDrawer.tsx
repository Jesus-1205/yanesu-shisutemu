import { RotateCcw, Check } from "lucide-react";
import Select from "@/ui-components/Select";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import Button from "@/ui-components/Button";
import Drawer from "@/ui-components/Drawer";
import type { CategoryOut, SupplierOut } from "@/types/api";
import type { ProductFiltersState, StockStatus } from "../types";

interface ProductFiltersDrawerProps {
  open: boolean;
  onClose: () => void;
  draft: ProductFiltersState;
  onDraftChange: (draft: ProductFiltersState) => void;
  onApply: () => void;
  onClear: () => void;
  categories: CategoryOut[];
  suppliers: SupplierOut[];
  isOperator?: boolean;
}

const stockOptions = [
  { value: "todos", label: "Todos" },
  { value: "disponible", label: "Disponible" },
  { value: "bajo", label: "Stock Bajo" },
  { value: "agotado", label: "Agotado" },
];

const ivaOptions = [
  { value: "", label: "Todo IVA" },
  { value: "GRAVADO", label: "Gravado" },
  { value: "EXENTO", label: "Exento" },
];

export default function ProductFiltersDrawer({
  open,
  onClose,
  draft,
  onDraftChange,
  onApply,
  onClear,
  categories,
  suppliers,
  isOperator = false,
}: ProductFiltersDrawerProps) {
  const set = <K extends keyof ProductFiltersState>(key: K, value: ProductFiltersState[K]) => {
    onDraftChange({ ...draft, [key]: value });
  };

  return (
    <Drawer open={open} onClose={onClose} title="Filtros" className="w-96">
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-5">
          {!isOperator && (
            <div>
              <label className="text-sm font-medium text-text-main block mb-1.5">Estado de Stock</label>
              <Select
                value={draft.stockStatus}
                onChange={(e) => set("stockStatus", e.target.value as StockStatus)}
                options={stockOptions}
              />
            </div>
          )}

          <MultiSelectTags
            label="Categorías"
            selected={draft.categoria_ids}
            options={categories.map((c) => ({ value: c.id, label: c.nombre }))}
            onChange={(ids) => set("categoria_ids", ids)}
            placeholder="Seleccionar categorías..."
          />

          <div>
            <label className="text-sm font-medium text-text-main block mb-1.5">Proveedor</label>
            <Select
              value={draft.proveedor_id?.toString() ?? ""}
              onChange={(e) => set("proveedor_id", e.target.value ? Number(e.target.value) : null)}
              options={[
                { value: "", label: "Todos los proveedores" },
                ...suppliers.map((s) => ({ value: String(s.id), label: s.nombre })),
              ]}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-main block mb-1.5">Rango de Precio</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Mínimo"
                value={draft.precio_min}
                onChange={(e) => set("precio_min", e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-surface outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 placeholder:text-slate-400"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Máximo"
                value={draft.precio_max}
                onChange={(e) => set("precio_max", e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-surface outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-main block mb-1.5">Tipo de IVA</label>
            <Select
              value={draft.tipo_iva}
              onChange={(e) => set("tipo_iva", e.target.value as "" | "GRAVADO" | "EXENTO")}
              options={ivaOptions}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface pt-4 pb-2 border-t border-slate-100 mt-6 -mx-5 px-5">
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClear} className="flex-1 justify-center">
              <RotateCcw className="w-4 h-4" />
              Limpiar
            </Button>
            <Button variant="accent" onClick={onApply} className="flex-1 justify-center">
              <Check className="w-4 h-4" />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
