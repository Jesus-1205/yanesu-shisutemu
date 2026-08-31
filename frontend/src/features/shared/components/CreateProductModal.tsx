import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/services/api";
import type { ProductOut, CategoryOut, SupplierOut } from "@/types/api";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import Select from "@/ui-components/Select";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import { useAuth } from "@/features/auth/context/AuthContext";
import { calcMargin } from "@/features/products/types";
import { toTitleCase } from "@/lib/text";

export function extractUnidadesFromNombre(nombre: string): { cleanName: string; unidades: number } {
  // Patrones comunes en facturas venezolanas:
  // "24UNID." / "24 UNID" / "12UND" / "12 UNIDADES" / "6 1L" (al final del nombre)
  const patterns = [
    /\s+(\d+)\s*(?:UNID(?:\.|ADES)?|UND(?:\.|ES)?)\.?\s*$/i,
    /\s+(\d+)\s+uds\.?\s*$/i,
  ];
  for (const re of patterns) {
    const match = nombre.match(re);
    if (match) {
      return {
        cleanName: nombre.replace(re, "").trim(),
        unidades: parseInt(match[1], 10),
      };
    }
  }
  return { cleanName: nombre, unidades: 0 };
}

interface CreateProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: ProductOut) => void;
  initialNombre?: string;
  initialPrecio?: number;
  initialMoneda?: "USD" | "BS";
  initialProveedorId?: number | null;
  tasaBs?: number;
  compact?: boolean;
}

const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const cardBase = "rounded-lg border border-slate-200 bg-surface p-4 space-y-3";

export default function CreateProductModal({ open, onClose, onCreated, initialNombre, initialPrecio, initialMoneda, initialProveedorId, tasaBs, compact = false }: CreateProductModalProps) {
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);

  const [nombre, setNombre] = useState("");
  const [codigoBarra, setCodigoBarra] = useState("");
  const [categoriaIds, setCategoriaIds] = useState<number[]>([]);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [costoCaja, setCostoCaja] = useState("");
  const [unidadesPorCaja, setUnidadesPorCaja] = useState("");
  const [precioUnidad, setPrecioUnidad] = useState("");
  const [precioCaja, setPrecioCaja] = useState("");
  const [stock, setStock] = useState("");
  const [stockMinimo, setStockMinimo] = useState("5");
  const [tipoIva, setTipoIva] = useState<"GRAVADO" | "EXENTO">("GRAVADO");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api.getCategories()
      .then(setCategories)
      .catch(() => {});
    api.getSuppliers()
      .then(setSuppliers)
      .catch(() => {});

    // Pre-llenar campos si vienen de IA
    if (initialNombre) {
      const { cleanName, unidades } = extractUnidadesFromNombre(initialNombre);
      setNombre(toTitleCase(cleanName));
      if (unidades > 0) setUnidadesPorCaja(String(unidades));
    }
    if (initialPrecio && initialPrecio > 0) {
      // Si el precio viene en BS, convertir a USD usando la tasa
      const precioUsd = initialMoneda === "BS" && tasaBs && tasaBs > 0
        ? Math.round((initialPrecio / tasaBs) * 100) / 100
        : initialPrecio;
      setCostoCaja(String(precioUsd));
    }
    if (initialProveedorId) setProveedorId(initialProveedorId);
  }, [open, initialNombre, initialPrecio, initialMoneda, initialProveedorId, tasaBs]);

  const handleSearchSuppliers = useCallback(async (query: string) => {
    const data = await api.getSuppliers({ search: query || undefined });
    setSuppliers(data);
    return data.map((s) => ({
      value: s.id,
      label: s.nombre,
    }));
  }, []);

  const resetForm = () => {
    setNombre("");
    setCodigoBarra("");
    setCategoriaIds([]);
    setProveedorId(null);
    setCostoCaja("");
    setUnidadesPorCaja("");
    setPrecioUnidad("");
    setPrecioCaja("");
    setStock("");
    setStockMinimo("5");
    setTipoIva("GRAVADO");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const n = (v: string): number => (v === "" ? 0 : Number(v));

  const costoUnitario = useMemo(() => {
    const c = n(costoCaja);
    const u = n(unidadesPorCaja);
    return c > 0 && u > 0 ? Math.round((c / u) * 100) / 100 : 0;
  }, [costoCaja, unidadesPorCaja]);

  const precioSugeridoUnidad = useMemo(
    () => (costoUnitario > 0 ? Math.round((costoUnitario / 0.7) * 100) / 100 : 0),
    [costoUnitario],
  );

  const precioSugeridoCaja = useMemo(() => {
    const c = n(costoCaja);
    return c > 0 ? Math.round((c / 0.7) * 100) / 100 : 0;
  }, [costoCaja]);

  const margin = useMemo(
    () => calcMargin(costoUnitario, n(precioUnidad)),
    [costoUnitario, precioUnidad],
  );

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.nombre }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const unds = n(unidadesPorCaja);
    if (!unds || unds <= 0) {
      setError("Las unidades por caja son obligatorias");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const precioUnidadFinal = compact ? 0.01 : n(precioUnidad);
      const precioCajaFinal = compact ? 0.01 : n(precioCaja);
      const product = await api.createProduct({
        nombre: toTitleCase(nombre.trim()),
        codigo_barra: codigoBarra.trim() || null,
        categoria_ids: categoriaIds,
        unidades_por_caja: unds || 1,
        stock_unidades: compact ? 0 : n(stock),
        stock_minimo: compact ? 5 : n(stockMinimo),
        precio_costo_caja_usd: compact ? 0.01 : n(costoCaja),
        precio_unidad_usd: precioUnidadFinal || 0.01,
        precio_caja_usd: precioCajaFinal || 0.01,
        proveedor_id: compact ? null : proveedorId,
        tipo_iva: compact ? "GRAVADO" : tipoIva,
      });
      onCreated(product);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear producto");
    } finally {
      setSaving(false);
    }
  };

  const fid = (name: string) => `cp-${name}`;

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo Producto" className={compact ? "!max-w-lg" : "!max-w-7xl"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className={compact ? "" : "max-h-[60vh] overflow-y-auto -mx-6 px-6"}>
          {compact ? (
            <div className="space-y-3">
              <Input
                label="Nombre del producto"
                id={fid("nombre")}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej: Ron Santa Teresa Añejo"
                required
                autoFocus
              />
              <Input
                label="Código de barra"
                id={fid("codigo")}
                value={codigoBarra}
                onChange={(e) => setCodigoBarra(e.target.value)}
                placeholder="Opcional"
              />
              <MultiSelectTags
                label="Categorías"
                selected={categoriaIds}
                options={categoryOptions}
                onChange={setCategoriaIds}
                placeholder="Seleccionar categorías..."
              />
              <div>
                <label htmlFor={fid("uds-caja")} className="block text-xs font-medium text-slate-700 mb-1">Unidades por caja</label>
                <input id={fid("uds-caja")} type="number" min="1" value={unidadesPorCaja}
                  onChange={(e) => setUnidadesPorCaja(e.target.value)} autoComplete="off" className={inputBase} placeholder="1" />
              </div>
              <p className="text-[11px] text-slate-400">El costo se establecerá desde la factura.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-4">

            {/* ─── Columna izquierda: info general ─────────────── */}
            <div className={cardBase}>
              <h4 className="text-xs font-semibold text-text-main uppercase tracking-wide">Información General</h4>
              <Input
                label="Nombre"
                id={fid("nombre")}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej: Ron Santa Teresa Añejo"
                required
                autoFocus
              />
              <Input
                label="Código de barra"
                id={fid("codigo")}
                value={codigoBarra}
                onChange={(e) => setCodigoBarra(e.target.value)}
                placeholder="Opcional"
              />
              <MultiSelectTags
                label="Categorías"
                selected={categoriaIds}
                options={categoryOptions}
                onChange={setCategoriaIds}
                placeholder="Seleccionar categorías..."
              />
              <AsyncCombobox
                label="Proveedor"
                value={proveedorId}
                onSearch={handleSearchSuppliers}
                onChange={(val) => setProveedorId(val as number | null)}
                placeholder="Buscar proveedor..."
                allowClear
                clearLabel="Sin proveedor"
                initialOptions={suppliers.map((s) => ({ value: s.id, label: s.nombre }))}
              />
              <div>
                <Select
                  label="Tipo de IVA"
                  value={tipoIva}
                  onChange={(e) => setTipoIva(e.target.value as "GRAVADO" | "EXENTO")}
                  options={[
                    { value: "GRAVADO", label: "Gravado" },
                    { value: "EXENTO", label: "Exento" },
                  ]}
                />
              </div>
              {!isOperator && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={fid("stock")} className="block text-xs font-medium text-slate-700 mb-1">Stock (uds)</label>
                    <input id={fid("stock")} type="number" min="0" value={stock}
                      onChange={(e) => setStock(e.target.value)} autoComplete="off" className={inputBase} placeholder="0" />
                  </div>
                  <div>
                    <label htmlFor={fid("stock-min")} className="block text-xs font-medium text-slate-700 mb-1">Stock mínimo</label>
                    <input id={fid("stock-min")} type="number" min="0" value={stockMinimo}
                      onChange={(e) => setStockMinimo(e.target.value)} autoComplete="off" className={inputBase} placeholder="0" />
                  </div>
                  <div>
                    <label htmlFor={fid("uds-caja")} className="block text-xs font-medium text-slate-700 mb-1">Unds/caja</label>
                    <input id={fid("uds-caja")} type="number" min="1" value={unidadesPorCaja}
                      onChange={(e) => setUnidadesPorCaja(e.target.value)} autoComplete="off" className={inputBase} placeholder="1" />
                  </div>
                </div>
              )}
              {isOperator && (
                <div>
                  <label htmlFor={fid("uds-caja")} className="block text-xs font-medium text-slate-700 mb-1">Unds/caja</label>
                  <input id={fid("uds-caja")} type="number" min="1" value={unidadesPorCaja}
                    onChange={(e) => setUnidadesPorCaja(e.target.value)} className={inputBase} placeholder="1" />
                </div>
              )}
            </div>

            {/* ─── Columna derecha: precios ─────────────────────── */}
            <div className={cardBase}>
              <h4 className="text-xs font-semibold text-text-main uppercase tracking-wide">
                {isOperator ? "Precios" : "Precios y Finanzas"}
              </h4>

              <div>
                <label htmlFor={fid("costo-caja")} className="block text-xs font-medium text-slate-700 mb-1">Costo por caja USD *</label>
                <input id={fid("costo-caja")} type="number" step="0.01" min="0" value={costoCaja}
                  onChange={(e) => setCostoCaja(e.target.value)} required autoComplete="off" className={inputBase} placeholder="0.00" />
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1">Costo por unidad USD</span>
                <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm text-slate-600 font-mono">
                  <span>${costoUnitario > 0 ? costoUnitario.toFixed(2) : "—"}</span>
                  {n(costoCaja) > 0 && n(unidadesPorCaja) > 0 && (
                    <span className="text-[11px] text-slate-400">
                      ${n(costoCaja).toFixed(2)} ÷ {n(unidadesPorCaja)} uds
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!isOperator && (
                  <div>
                    <span className="block text-xs font-medium text-slate-700 mb-1">Precio sugerido unidad USD</span>
                    <div className="h-10 px-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-sm">
                      <span className="text-blue-700 font-mono font-medium">${precioSugeridoUnidad > 0 ? precioSugeridoUnidad.toFixed(2) : "—"}</span>
                      <span className="text-[11px] text-blue-500">30% margen obj.</span>
                    </div>
                  </div>
                )}
                <div>
                  <label htmlFor={fid("precio-u")} className="block text-xs font-medium text-slate-700 mb-1">Precio unidad USD *</label>
                  <div className="flex gap-2">
                    <input id={fid("precio-u")} type="number" step="0.01" min="0" value={precioUnidad}
                      onChange={(e) => setPrecioUnidad(e.target.value)} required
                      autoComplete="off" className={`${inputBase} flex-1`} placeholder="0.00" />
                    {!isOperator && (
                      <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs whitespace-nowrap"
                        onClick={() => setPrecioUnidad(String(precioSugeridoUnidad))}
                        disabled={precioSugeridoUnidad <= 0}>
                        Copiar
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!isOperator && (
                  <div>
                    <span className="block text-xs font-medium text-slate-700 mb-1">Precio sugerido caja USD</span>
                    <div className="h-10 px-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center text-sm text-blue-700 font-mono">
                      ${precioSugeridoCaja > 0 ? precioSugeridoCaja.toFixed(2) : "—"}
                    </div>
                  </div>
                )}
                <div>
                  <label htmlFor={fid("precio-c")} className="block text-xs font-medium text-slate-700 mb-1">Precio caja USD *</label>
                  <div className="flex gap-2">
                    <input id={fid("precio-c")} type="number" step="0.01" min="0" value={precioCaja}
                      onChange={(e) => setPrecioCaja(e.target.value)} required
                      autoComplete="off" className={`${inputBase} flex-1`} placeholder="0.00" />
                    {!isOperator && (
                      <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs whitespace-nowrap"
                        onClick={() => setPrecioCaja(String(precioSugeridoCaja))}
                        disabled={precioSugeridoCaja <= 0}>
                        Copiar
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {!isOperator && (
                <div>
                  <span className="block text-xs font-medium text-slate-700 mb-1">Margen</span>
                  <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Ganancia</span>
                    <span className="text-xs text-slate-400">{margin.margen > 0 ? `${margin.margen.toFixed(1)}%` : "—"}</span>
                    <Badge variant={margin.color}>{margin.label}</Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent" loading={saving}>
            Crear producto
          </Button>
        </div>
      </form>
    </Modal>
  );
}
