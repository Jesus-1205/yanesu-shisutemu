import { Plus } from "lucide-react";
import type { UseProductFormReturn } from "../hooks/useProductForm";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import Combobox from "@/ui-components/Combobox";

const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const labelBase = "block text-xs font-medium text-slate-700 mb-1";
const cardBase = "rounded-xl border border-slate-200 bg-surface p-5 space-y-4";

interface ProductFormGeneralInfoProps {
  formAPI: UseProductFormReturn;
  isOperator: boolean;
  onOpenCreateCategory: () => void;
  onOpenCreateSupplier: () => void;
  fieldId: (name: string) => string;
}

export function ProductFormGeneralInfo({
  formAPI,
  isOperator,
  onOpenCreateCategory,
  onOpenCreateSupplier,
  fieldId,
}: ProductFormGeneralInfoProps) {
  const { form, setField, setForm, numChange, categories, suppliers } = formAPI;

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.nombre }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.nombre }));

  return (
    <div className={cardBase}>
      <h3 className="text-sm font-semibold tracking-wide text-text-main uppercase">
        Información General
      </h3>
      <div>
        <label htmlFor={fieldId("nombre")} className={labelBase}>
          Nombre
        </label>
        <input
          id={fieldId("nombre")}
          value={form.nombre}
          onChange={(e) => setField("nombre", e.target.value)}
          placeholder="ej: Ron Santa Teresa Añejo"
          required
          autoComplete="off"
          className={inputBase}
        />
      </div>
      <div>
        <label htmlFor={fieldId("codigo")} className={labelBase}>
          Código de barra
        </label>
        <input
          id={fieldId("codigo")}
          value={form.codigo_barra}
          onChange={(e) => setField("codigo_barra", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="Opcional"
          autoComplete="off"
          className={inputBase}
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className={labelBase}>Categorías</label>
          <button
            type="button"
            onClick={onOpenCreateCategory}
            className="cursor-pointer text-brand-blue transition-colors hover:text-blue-800"
            aria-label="Crear categoría"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <MultiSelectTags
          selected={form.categoria_ids}
          options={categoryOptions}
          onChange={(ids) => setField("categoria_ids", ids)}
          placeholder="Seleccionar categorías..."
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className={labelBase}>Proveedor</label>
          <button
            type="button"
            onClick={onOpenCreateSupplier}
            className="cursor-pointer text-brand-blue transition-colors hover:text-blue-800"
            aria-label="Crear proveedor"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <Combobox
          value={form.proveedor_id}
          options={supplierOptions}
          onChange={(val) => setField("proveedor_id", val as number | null)}
          placeholder="Buscar proveedor..."
          clearLabel="Sin proveedor"
        />
      </div>
      {!isOperator && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor={fieldId("stock-cajas")} className={labelBase}>
              Stock cajas
            </label>
            <input
              id={fieldId("stock-cajas")}
              type="number"
              min="0"
              value={form.stock_cajas}
              onChange={(e) => {
                const raw = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  stock_cajas: raw === "" ? "" : e.target.valueAsNumber,
                }));
              }}
              autoComplete="off"
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor={fieldId("stock")} className={labelBase}>
              Stock unidades
            </label>
            <input
              id={fieldId("stock")}
              type="number"
              min="0"
              value={form.stock_unidades}
              onChange={(e) => {
                const raw = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  stock_unidades: raw === "" ? "" : e.target.valueAsNumber,
                }));
              }}
              autoComplete="off"
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor={fieldId("stock-min")} className={labelBase}>
              Stock mínimo
            </label>
            <input
              id={fieldId("stock-min")}
              type="number"
              min="0"
              value={form.stock_minimo}
              onChange={numChange("stock_minimo")}
              autoComplete="off"
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor={fieldId("uds-caja")} className={labelBase}>
              Unidades/caja
            </label>
            <input
              id={fieldId("uds-caja")}
              type="number"
              min="1"
              value={form.unidades_por_caja}
              onChange={(e) => {
                const raw = e.target.value;
                setField("unidades_por_caja", raw === "" ? "" : e.target.valueAsNumber);
              }}
              autoComplete="off"
              className={inputBase}
            />
          </div>
        </div>
      )}
      {isOperator && (
        <div>
          <label htmlFor={fieldId("uds-caja")} className={labelBase}>
            Unidades/caja
          </label>
          <input
            id={fieldId("uds-caja")}
            type="number"
            min="1"
            value={form.unidades_por_caja}
            onChange={(e) => {
              const raw = e.target.value;
              setField("unidades_por_caja", raw === "" ? "" : e.target.valueAsNumber);
            }}
            autoComplete="off"
            className={inputBase}
          />
        </div>
      )}
    </div>
  );
}
