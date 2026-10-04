import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import type { ProductOut, TipoEmpaque } from "@/types/api";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import { calcularSubtotal } from "@/lib/money";
import type { ReviewItem } from "../hooks/useAIReviewState";

interface AIReviewItemRowProps {
  item: ReviewItem;
  index: number;
  moneda: "USD" | "BS";
  products: ProductOut[];
  onProductSelect: (index: number, productoId: number | null) => void;
  onUpdateItem: (index: number, field: keyof ReviewItem, value: string | number) => void;
  onToggleEmpaque: (index: number, nuevoTipo: TipoEmpaque) => void;
  onOpenProductModal: (extractedNombre: string) => void;
}

const inputBase = "h-9 rounded-lg border border-slate-300 bg-surface px-2 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const labelSmall = "text-[10px] font-medium text-slate-500 uppercase mb-1 block";

export default function AIReviewItemRow({
  item,
  index,
  moneda,
  products,
  onProductSelect,
  onUpdateItem,
  onToggleEmpaque,
  onOpenProductModal,
}: AIReviewItemRowProps) {
  const [localCantidad, setLocalCantidad] = useState(item.cantidad === 0 ? "" : String(item.cantidad));
  const [localCosto, setLocalCosto] = useState(item.costo === 0 ? "" : String(item.costo));
  const [localUnidades, setLocalUnidades] = useState(item.unidades_por_caja === 0 ? "" : String(item.unidades_por_caja));

  useEffect(() => {
    setLocalCantidad(item.cantidad === 0 ? "" : String(item.cantidad));
  }, [item.cantidad]);

  useEffect(() => {
    setLocalCosto(item.costo === 0 ? "" : String(item.costo));
  }, [item.costo]);

  useEffect(() => {
    setLocalUnidades(item.unidades_por_caja === 0 ? "" : String(item.unidades_por_caja));
  }, [item.unidades_por_caja]);

  const handleCantidadChange = (val: string) => {
    setLocalCantidad(val);
    if (val === "") {
      onUpdateItem(index, "cantidad", 0);
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateItem(index, "cantidad", parsed);
    }
  };

  const handleCostoChange = (val: string) => {
    setLocalCosto(val);
    if (val === "") {
      onUpdateItem(index, "costo", 0);
      return;
    }
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateItem(index, "costo", parsed);
    }
  };

  const handleUnidadesChange = (val: string) => {
    setLocalUnidades(val);
    if (val === "") {
      onUpdateItem(index, "unidades_por_caja", 0);
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateItem(index, "unidades_por_caja", parsed);
    }
  };

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        item.producto_id !== null
          ? "border-green-200 bg-green-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-2 flex items-start gap-2">
        <span className="mt-1 text-[10px] font-bold text-slate-400">#{index + 1}</span>
        <span className="flex-1 truncate text-xs text-slate-500" title={item.extracted.nombre}>
          {item.extracted.nombre}
        </span>
        {item.producto_id !== null && <Check className="size-4 shrink-0 text-green-500" />}
      </div>

      <div className="grid grid-cols-2 items-end gap-2 md:grid-cols-6">
        <div className="col-span-2">
          <label className={labelSmall}>Producto</label>
          <AsyncCombobox
            value={item.producto_id}
            onChange={(val) => onProductSelect(index, val as number | null)}
            onSearch={async (q) => {
              const { api } = await import("@/services/api");
              const data = await api.getProducts({ search: q || undefined });
              return data.items.map((p) => ({ value: p.id, label: p.nombre, subtitle: p.codigo_barra || undefined }));
            }}
            initialOptions={products.map((p) => ({ value: p.id, label: p.nombre, subtitle: p.codigo_barra || undefined }))}
            placeholder="Buscar producto..."
            allowClear
          />
        </div>
        <div>
          <label className={labelSmall}>Cant</label>
          <input
            type="number"
            value={localCantidad}
            onChange={(e) => handleCantidadChange(e.target.value)}
            min="0"
            className={`${inputBase} w-full`}
          />
        </div>
        <div>
          <label className={labelSmall}>{moneda === "BS" ? "Costo Bs." : "Costo $"}</label>
          <input
            type="number"
            value={localCosto}
            onChange={(e) => handleCostoChange(e.target.value)}
            min="0"
            step="0.01"
            className={`${inputBase} w-full`}
          />
        </div>
        <div>
          <label className={labelSmall}>Subtotal</label>
          <div className={`${inputBase} flex w-full items-center bg-slate-50 font-mono text-xs`}>
            {moneda === "BS" ? "Bs. " : "$ "}
            {calcularSubtotal(item.cantidad, item.costo).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <label className={labelSmall}>Tipo</label>
          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => onToggleEmpaque(index, "CAJA")}
              className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
                item.tipo_empaque === "CAJA" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
              }`}
            >
              Caja
            </button>
            <button
              type="button"
              onClick={() => onToggleEmpaque(index, "UNIDAD")}
              className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
                item.tipo_empaque === "UNIDAD" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
              }`}
            >
              Und
            </button>
          </div>
        </div>
      </div>

      {item.tipo_empaque === "CAJA" && (
        <div className="mt-2 flex items-center gap-2">
          <label className={labelSmall}>Unds/Caja</label>
          <input
            type="number"
            value={localUnidades}
            onChange={(e) => handleUnidadesChange(e.target.value)}
            min="1"
            className={`${inputBase} w-20`}
          />
          <button
            type="button"
            onClick={() => onOpenProductModal(item.extracted.nombre)}
            className="cursor-pointer text-[10px] text-brand-blue hover:underline"
          >
            Crear producto
          </button>
        </div>
      )}
    </div>
  );
}
