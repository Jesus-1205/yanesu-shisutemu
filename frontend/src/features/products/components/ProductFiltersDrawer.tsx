import { RotateCcw, Check } from "lucide-react";
import Select from "@/ui-components/Select";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import Button from "@/ui-components/Button";
import Drawer from "@/ui-components/Drawer";
import type { CategoryOut, SupplierOut } from "@/types/api";
import type { ProductFiltersState, StockStatus } from "../types";
import { useProductsStore } from "../stores/useProductsStore";

export interface ProductFiltersDrawerProps {
  categories: CategoryOut[];
  suppliers: SupplierOut[];
  isOperator?: boolean;
  open?: boolean;
  onClose?: () => void;
  draft?: ProductFiltersState;
  onDraftChange?: (draft: ProductFiltersState) => void;
  onApply?: () => void;
  onClear?: () => void;
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
  categories,
  suppliers,
  isOperator = false,
  open: propOpen,
  onClose: propOnClose,
  draft: propDraft,
  onDraftChange: propOnDraftChange,
  onApply: propOnApply,
  onClear: propOnClear,
}: ProductFiltersDrawerProps) {
  const storeOpen = useProductsStore((s) => s.drawerOpen);
  const storeClose = useProductsStore((s) => s.closeDrawer);
  const storeDraft = useProductsStore((s) => s.draftFilters);
  const storeUpdateDraft = useProductsStore((s) => s.updateDraftFilters);
  const storeApplyDraft = useProductsStore((s) => s.applyDraftFilters);
  const storeResetFilters = useProductsStore((s) => s.resetFilters);

  const isOpen = propOpen ?? storeOpen;
  const handleClose = propOnClose ?? storeClose;
  const currentDraft = propDraft ?? storeDraft;

  const handleDraftChange = (newDraft: ProductFiltersState) => {
    if (propOnDraftChange) {
      propOnDraftChange(newDraft);
    } else {
      storeUpdateDraft(newDraft);
    }
  };

  const handleApply = () => {
    if (propOnApply) {
      propOnApply();
    } else {
      storeApplyDraft();
      storeClose();
    }
  };

  const handleClear = () => {
    if (propOnClear) {
      propOnClear();
    } else {
      storeResetFilters();
      storeClose();
    }
  };

  const set = <K extends keyof ProductFiltersState>(
    key: K,
    value: ProductFiltersState[K],
  ) => {
    handleDraftChange({ ...currentDraft, [key]: value });
  };

  return (
    <Drawer open={isOpen} onClose={handleClose} title="Filtros" className="w-96">
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-5">
          {/* Estado de Stock (solo admin) */}
          {!isOperator && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                Estado de Stock
              </label>
              <Select
                value={currentDraft.stockStatus}
                onChange={(e) =>
                  set("stockStatus", e.target.value as StockStatus)
                }
                options={stockOptions}
              />
            </div>
          )}

          {/* Categorías */}
          <MultiSelectTags
            label="Categorías"
            selected={currentDraft.categoria_ids}
            options={categories.map((c) => ({
              value: c.id,
              label: c.nombre,
            }))}
            onChange={(ids) => set("categoria_ids", ids)}
            placeholder="Seleccionar categorías..."
          />

          {/* Proveedor */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              Proveedor
            </label>
            <Select
              value={
                currentDraft.proveedor_id !== null
                  ? String(currentDraft.proveedor_id)
                  : ""
              }
              onChange={(e) =>
                set(
                  "proveedor_id",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              options={[
                { value: "", label: "Todos los proveedores" },
                ...suppliers.map((s) => ({
                  value: String(s.id),
                  label: s.nombre,
                })),
              ]}
            />
          </div>

          {/* Rango de Precios */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              Rango de Precio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Mínimo"
                value={currentDraft.precio_min}
                onChange={(e) =>
                  set(
                    "precio_min",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Máximo"
                value={currentDraft.precio_max}
                onChange={(e) =>
                  set(
                    "precio_max",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>

          {/* Tipo de IVA */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              Tipo de IVA
            </label>
            <Select
              value={currentDraft.tipo_iva}
              onChange={(e) =>
                set(
                  "tipo_iva",
                  e.target.value as ProductFiltersState["tipo_iva"],
                )
              }
              options={ivaOptions}
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="sticky bottom-0 -mx-5 mt-6 border-t border-slate-100 bg-surface px-5 pt-4 pb-2">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleClear}
              className="flex-1 justify-center"
            >
              <RotateCcw className="size-4" />
              Limpiar
            </Button>
            <Button
              variant="accent"
              onClick={handleApply}
              className="flex-1 justify-center"
            >
              <Check className="size-4" />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
