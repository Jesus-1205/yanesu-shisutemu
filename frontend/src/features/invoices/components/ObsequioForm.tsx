import { useCallback, useState } from "react";
import type { TipoEmpaque, ProductOut } from "@/types/api";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import Button from "@/ui-components/Button";
import { generateUUID } from "@/lib/utils";

interface ObsequioFormProps {
  products: ProductOut[];
  onSearchProducts: (query: string) => Promise<Array<{ value: number; label: string; subtitle?: string }>>;
  onAdd: (item: {
    key: string;
    producto_id: number;
    nombre: string;
    tipo_empaque: TipoEmpaque;
    cantidad: number;
    unidades_por_caja: number;
    justificacion: string;
  }) => void;
}

export default function ObsequioForm({ products, onSearchProducts, onAdd }: ObsequioFormProps) {
  const [productoId, setProductoId] = useState<number | null>(null);
  const [tipoEmpaque, setTipoEmpaque] = useState<TipoEmpaque>("CAJA");
  const [cantidad, setCantidad] = useState("1");
  const [unidadesPorCaja, setUnidadesPorCaja] = useState("");
  const [justificacion, setJustificacion] = useState("");

  const selectedProduct = products.find((p) => p.id === productoId);
  const nCajas = cantidad === "" ? 0 : Number(cantidad);
  const nUndsCaja = unidadesPorCaja === "" ? 0 : Number(unidadesPorCaja);
  const isValid = productoId !== null && nCajas > 0 && justificacion.trim().length >= 3;

  const handleProductSelect = useCallback((val: string | number | null) => {
    const id = val ? Number(val) : null;
    setProductoId(id);
    if (id) {
      const prod = products.find((p) => p.id === id);
      if (prod) setUnidadesPorCaja(String(prod.unidades_por_caja));
    } else {
      setUnidadesPorCaja("");
    }
  }, [products]);

  const handleAdd = useCallback(() => {
    if (!isValid || !selectedProduct) return;
    onAdd({
      key: generateUUID(),
      producto_id: productoId!,
      nombre: selectedProduct.nombre,
      tipo_empaque: tipoEmpaque,
      cantidad: nCajas,
      unidades_por_caja: tipoEmpaque === "CAJA" ? nUndsCaja : selectedProduct.unidades_por_caja,
      justificacion: justificacion.trim(),
    });
    setProductoId(null);
    setCantidad("1");
    setJustificacion("");
  }, [isValid, selectedProduct, productoId, tipoEmpaque, nCajas, nUndsCaja, justificacion, onAdd]);

  const inputBase = "w-full h-9 rounded-lg border border-slate-300 bg-surface px-2.5 text-sm outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
  const inputReadOnly = "w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-400";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3 items-end">
      <div className="lg:col-span-2">
        <label className="block text-xs font-medium text-slate-700 mb-1">Buscar producto</label>
        <AsyncCombobox
          value={productoId}
          onChange={handleProductSelect}
          onSearch={onSearchProducts}
          placeholder="Buscar producto..."
          allowClear
          clearLabel="Limpiar"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Cant</label>
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className={inputBase}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Empaque</label>
        <div className="flex rounded-lg border border-slate-300 overflow-hidden h-9">
          <button
            type="button"
            onClick={() => {
              setTipoEmpaque("CAJA");
              if (selectedProduct) setUnidadesPorCaja(String(selectedProduct.unidades_por_caja));
            }}
            className={`flex-1 text-xs font-medium transition-colors cursor-pointer ${
              tipoEmpaque === "CAJA"
                ? "bg-purple-600 text-white"
                : "bg-surface text-slate-600 hover:bg-slate-50"
            }`}
          >
            Caja
          </button>
          <button
            type="button"
            onClick={() => { setTipoEmpaque("UNIDAD"); setUnidadesPorCaja(""); }}
            className={`flex-1 text-xs font-medium transition-colors cursor-pointer ${
              tipoEmpaque === "UNIDAD"
                ? "bg-purple-600 text-white"
                : "bg-surface text-slate-600 hover:bg-slate-50"
            }`}
          >
            Unid
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Unds/Caja</label>
        {tipoEmpaque === "CAJA" ? (
          <input
            type="number"
            min={1}
            step={1}
            value={unidadesPorCaja}
            onChange={(e) => setUnidadesPorCaja(e.target.value)}
            autoComplete="off"
            className={inputBase}
            placeholder="24"
          />
        ) : (
          <input
            type="text"
            value="—"
            className={`${inputReadOnly} cursor-not-allowed text-center`}
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            autoComplete="off"
          />
        )}
      </div>
      <div className="lg:col-span-2">
        <label className="block text-xs font-medium text-slate-700 mb-1">Justificación</label>
        <div className="relative">
          <input
            type="text"
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Mín. 3 caracteres..."
            className={`${inputBase} ${justificacion.length > 0 && justificacion.length < 3 ? "pr-8" : ""}`}
          />
          {justificacion.length > 0 && justificacion.length < 3 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-red-500 font-mono pointer-events-none">
              {justificacion.length}/3
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          variant="accent"
          onClick={handleAdd}
          disabled={!isValid}
          className="w-full h-9 shadow-sm font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-700"
        >
          + Agregar
        </Button>
      </div>
    </div>
  );
}
