import React from "react";
import Input from "@/ui-components/Input";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import Select from "@/ui-components/Select";
import { useCreateProductContext } from "../context/CreateProductContext";

const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const cardBase = "rounded-lg border border-slate-200 bg-surface p-4 space-y-3";

export const CreateProductGeneralInfoFields: React.FC = () => {
  const {
    formData,
    updateField,
    categoryOptions,
    suppliers,
    handleSearchSuppliers,
    isOperator,
  } = useCreateProductContext();

  return (
    <div className={cardBase}>
      <h4 className="text-xs font-semibold tracking-wide text-text-main uppercase">
        Información General
      </h4>
      <Input
        label="Nombre"
        id="cp-nombre"
        value={formData.nombre}
        onChange={(e) => updateField("nombre", e.target.value)}
        placeholder="ej: Ron Santa Teresa Añejo"
        required
        autoFocus
      />
      <Input
        label="Código de barra"
        id="cp-codigo"
        value={formData.codigo_barra}
        onChange={(e) => updateField("codigo_barra", e.target.value)}
        placeholder="Opcional"
      />
      <MultiSelectTags
        label="Categorías"
        selected={formData.categoria_ids}
        options={categoryOptions}
        onChange={(ids) => updateField("categoria_ids", ids)}
        placeholder="Seleccionar categorías..."
      />
      <AsyncCombobox
        label="Proveedor"
        value={formData.proveedor_id}
        onSearch={handleSearchSuppliers}
        onChange={(val) => updateField("proveedor_id", val as number | null)}
        placeholder="Buscar proveedor..."
        allowClear
        clearLabel="Sin proveedor"
        initialOptions={suppliers.map((s) => ({ value: s.id, label: s.nombre }))}
      />
      <div>
        <Select
          label="Tipo de IVA"
          value={formData.tipo_iva}
          onChange={(e) => updateField("tipo_iva", e.target.value as "GRAVADO" | "EXENTO")}
          options={[
            { value: "GRAVADO", label: "Gravado" },
            { value: "EXENTO", label: "Exento" },
          ]}
        />
      </div>
      {!isOperator && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="cp-stock" className="mb-1 block text-xs font-medium text-slate-700">
              Stock (uds)
            </label>
            <input
              id="cp-stock"
              type="number"
              min="0"
              value={formData.stock_unidades}
              onChange={(e) =>
                updateField("stock_unidades", e.target.value === "" ? "" : Number(e.target.value))
              }
              autoComplete="off"
              className={inputBase}
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="cp-stock-min" className="mb-1 block text-xs font-medium text-slate-700">
              Stock mínimo
            </label>
            <input
              id="cp-stock-min"
              type="number"
              min="0"
              value={formData.stock_minimo}
              onChange={(e) =>
                updateField("stock_minimo", e.target.value === "" ? "" : Number(e.target.value))
              }
              autoComplete="off"
              className={inputBase}
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="cp-uds-caja" className="mb-1 block text-xs font-medium text-slate-700">
              Unds/caja
            </label>
            <input
              id="cp-uds-caja"
              type="number"
              min="1"
              value={formData.unidades_por_caja}
              onChange={(e) =>
                updateField("unidades_por_caja", e.target.value === "" ? "" : Number(e.target.value))
              }
              autoComplete="off"
              className={inputBase}
              placeholder="1"
            />
          </div>
        </div>
      )}
      {isOperator && (
        <div>
          <label htmlFor="cp-uds-caja" className="mb-1 block text-xs font-medium text-slate-700">
            Unds/caja
          </label>
          <input
            id="cp-uds-caja"
            type="number"
            min="1"
            value={formData.unidades_por_caja}
            onChange={(e) =>
              updateField("unidades_por_caja", e.target.value === "" ? "" : Number(e.target.value))
            }
            className={inputBase}
            placeholder="1"
          />
        </div>
      )}
    </div>
  );
};

export default CreateProductGeneralInfoFields;
