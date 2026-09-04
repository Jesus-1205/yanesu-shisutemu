import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { MonedaEnum, TipoEmpaque, ProductOut } from "@/types/api";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import Button from "@/ui-components/Button";
import { formatBs, formatUsd } from "@/lib/text";
import { convertirCostos } from "@/lib/money";
import { useInvoiceFormStore } from "../store/invoiceFormStore";

interface LineItemInputRowProps {
  products: ProductOut[];
  onSearchProducts: (query: string) => Promise<Array<{ value: number; label: string; subtitle?: string }>>;
  esBs: boolean;
  moneda: MonedaEnum;
  tasa: string;
  aplicaIva: boolean;
}

const inputBase = "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const inputReadOnly = "w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500";
const labelBase = "block text-xs font-medium text-slate-700 mb-1";

export default function LineItemInputRow({ products, onSearchProducts, esBs, moneda, tasa, aplicaIva }: LineItemInputRowProps) {
  const addLineItem = useInvoiceFormStore((s) => s.addLineItem);

  const [newProductId, setNewProductId] = useState<number | null>(null);
  const [newTipoEmpaque, setNewTipoEmpaque] = useState<TipoEmpaque>("CAJA");
  const [newCantidad, setNewCantidad] = useState("1");
  const [newCostoPrimario, setNewCostoPrimario] = useState("");
  const [newUnidadesPorCaja, setNewUnidadesPorCaja] = useState("");

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const fid = (name: string) => `line-${uid}-${name}`;

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === newProductId),
    [newProductId, products],
  );

  const nCostoPrim = newCostoPrimario === "" ? 0 : Number(newCostoPrimario);
  const nTasa = tasa === "" ? 0 : Number(tasa);
  const nCajas = newCantidad === "" ? 0 : Number(newCantidad);
  const nUndsCaja = newUnidadesPorCaja === "" ? 0 : Number(newUnidadesPorCaja);

  const newCostoSecundario = useMemo(() => {
    const costos = convertirCostos(nCostoPrim, moneda, nTasa);
    return esBs ? costos.usd : costos.bs;
  }, [esBs, nCostoPrim, nTasa, moneda]);

  const canAdd = newProductId !== null && nCajas > 0 && nCostoPrim > 0 && nTasa > 0 && (newTipoEmpaque === "UNIDAD" || nUndsCaja > 0);

  const handleProductSelect = useCallback((val: string | number | null) => {
    const id = val ? Number(val) : null;
    setNewProductId(id);
    if (id) {
      const prod = products.find((p) => p.id === id);
      if (prod) setNewUnidadesPorCaja(String(prod.unidades_por_caja));
    } else {
      setNewUnidadesPorCaja("");
    }
  }, [products]);

  const handleAddLine = useCallback(() => {
    if (!canAdd || !selectedProduct) return;
    const costo_ingresado = nCostoPrim;
    const moneda_ingreso = moneda;
    const unidadesPorCaja = newTipoEmpaque === "CAJA" ? nUndsCaja : selectedProduct.unidades_por_caja;
    addLineItem({
      producto_id: newProductId!,
      nombre: selectedProduct.nombre,
      codigo_barra: selectedProduct.codigo_barra,
      tipo_empaque: newTipoEmpaque,
      cantidad: nCajas,
      unidades_por_caja: unidadesPorCaja,
      tipo_iva: aplicaIva ? "GRAVADO" : selectedProduct.tipo_iva,
      costo_ingresado,
      moneda_ingreso,
    });
    setNewProductId(null);
    setNewCantidad("1");
    setNewCostoPrimario("");
    setNewUnidadesPorCaja("");
  }, [canAdd, selectedProduct, newProductId, nCajas, nCostoPrim, nTasa, nUndsCaja, moneda, newTipoEmpaque, aplicaIva, addLineItem]);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
      <div className="text-xs font-semibold tracking-wider text-slate-600 uppercase">
        Agregar Ítem
      </div>
      <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-8">
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <AsyncCombobox
            label="Buscar producto"
            value={newProductId}
            onChange={handleProductSelect}
            onSearch={onSearchProducts}
            placeholder="Buscar producto por nombre o código..."
            allowClear
            clearLabel="Limpiar"
          />
        </div>
        <div>
          <label htmlFor={fid("cajas")} className={labelBase}>{newTipoEmpaque === "CAJA" ? "Cajas" : "Unids"}</label>
          <input
            id={fid("cajas")}
            type="number"
            min={1}
            value={newCantidad}
            onChange={(e) => setNewCantidad(e.target.value)}
            autoComplete="off"
            className={inputBase}
          />
        </div>
        <div>
          <label htmlFor={fid("costo-prim")} className={labelBase}>
            {newTipoEmpaque === "CAJA" ? "$/Caja" : "$/Unid"} <span className="font-normal text-slate-400">({esBs ? "Bs" : "USD"})</span>
          </label>
          <input
            id={fid("costo-prim")}
            type="number"
            min={0}
            step="0.01"
            value={newCostoPrimario}
            onChange={(e) => setNewCostoPrimario(e.target.value)}
            autoComplete="off"
            className={inputBase}
            placeholder="0.00"
          />
        </div>
        <div>
          <label htmlFor={fid("costo-sec")} className={labelBase}>
            {esBs ? "USD" : "Bs"} <span className="font-normal text-slate-400">calc.</span>
          </label>
          <input
            id={fid("costo-sec")}
            type="text"
            value={newCostoSecundario > 0 ? (esBs ? formatUsd(newCostoSecundario) : `Bs. ${formatBs(newCostoSecundario)}`) : "—"}
            className={`${inputReadOnly} cursor-not-allowed text-center font-mono text-xs text-slate-400`}
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            autoComplete="off"
            placeholder="—"
          />
        </div>
        <div>
          <label htmlFor={fid("unds-caja")} className={labelBase}>Unds/Caja</label>
          {newTipoEmpaque === "CAJA" ? (
            <input
              id={fid("unds-caja")}
              type="number"
              min={1}
              step={1}
              value={newUnidadesPorCaja}
              onChange={(e) => setNewUnidadesPorCaja(e.target.value)}
              autoComplete="off"
              className={inputBase}
              placeholder="24"
            />
          ) : (
            <input
              type="text"
              value="—"
              className={`${inputReadOnly} cursor-not-allowed text-center text-slate-400`}
              readOnly
              tabIndex={-1}
              aria-readonly="true"
              autoComplete="off"
            />
          )}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelBase}>Empaque</label>
          <div className="flex h-10 overflow-hidden rounded-lg border border-slate-300">
            <button
              type="button"
              data-testid="empaque-caja"
              onClick={() => {
                setNewTipoEmpaque("CAJA");
                if (selectedProduct) setNewUnidadesPorCaja(String(selectedProduct.unidades_por_caja));
              }}
              className={`flex-1 cursor-pointer text-xs font-medium transition-colors ${
                newTipoEmpaque === "CAJA"
                  ? "bg-brand-blue text-white"
                  : "bg-surface text-slate-600 hover:bg-slate-50"
              }`}
            >
              Caja
            </button>
            <button
              type="button"
              data-testid="empaque-unid"
              onClick={() => {
                setNewTipoEmpaque("UNIDAD");
                setNewUnidadesPorCaja("");
              }}
              className={`flex-1 cursor-pointer text-xs font-medium transition-colors ${
                newTipoEmpaque === "UNIDAD"
                  ? "bg-brand-blue text-white"
                  : "bg-surface text-slate-600 hover:bg-slate-50"
              }`}
            >
              Unid
            </button>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Button
            type="button"
            variant="accent"
            onClick={handleAddLine}
            disabled={!canAdd}
            data-testid="agregar-item"
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-1 font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        </div>
      </div>
      {newTipoEmpaque === "CAJA" && nUndsCaja > 0 && nCostoPrim > 0 && (
        <p className="mt-1 text-[10px] whitespace-nowrap text-slate-400">
          = {formatUsd((esBs ? newCostoSecundario : nCostoPrim) / nUndsCaja)}/und ({nUndsCaja} unds/caja)
        </p>
      )}
    </div>
  );
}