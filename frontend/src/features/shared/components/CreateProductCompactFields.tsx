import React from "react";
import Input from "@/ui-components/Input";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import { useCreateProductContext } from "../context/CreateProductContext";

const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

export const CreateProductCompactFields: React.FC = () => {
  const { formData, updateField, categoryOptions } = useCreateProductContext();

  return (
    <div className="space-y-3">
      <Input
        label="Nombre del producto"
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
      <div>
        <label htmlFor="cp-uds-caja" className="mb-1 block text-xs font-medium text-slate-700">
          Unidades por caja
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
      <p className="text-[11px] text-slate-400">El costo se establecerá desde la factura.</p>
    </div>
  );
};

export default CreateProductCompactFields;
