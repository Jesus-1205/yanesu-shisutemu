import { useState, useEffect, useMemo, useId } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { Product, CategoryOut, SupplierOut } from "@/types/api";
import Select from "@/ui-components/Select";
import Combobox from "@/ui-components/Combobox";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { useToast } from "@/ui-components/Toast";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useMarginInput } from "../hooks/useMarginInput";

interface FormState {
  nombre: string;
  codigo_barra: string;
  categoria_ids: number[];
  precio_costo_caja_usd: number | "";
  precio_unidad_usd: number | "";
  tipo_iva: "GRAVADO" | "EXENTO";
  stock_cajas: number | "";
  stock_unidades: number | "";
  stock_minimo: number | "";
  unidades_por_caja: number | "";
  precio_caja_usd: number | "";
  proveedor_id: number | null;
}

const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

const labelBase = "block text-xs font-medium text-slate-700 mb-1";

const cardBase = "rounded-xl border border-slate-200 bg-surface p-5 space-y-4";

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const uid = useId();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [prod, cats, sups] = await Promise.all([
          api.getProduct(Number(id)),
          api.getCategories(),
          api.getSuppliers(),
        ]);
        if (cancelled) return;
        setProduct(prod);
        setCategories(cats);
        setSuppliers(sups);
        setForm({
          nombre: prod.nombre,
          codigo_barra: prod.codigo_barra ?? "",
          categoria_ids: prod.categories.map((c) => c.id),
          precio_costo_caja_usd: Number(prod.precio_costo_caja_usd) || 0,
          precio_unidad_usd: Number(prod.precio_unidad_usd) || 0,
          tipo_iva: prod.tipo_iva,
          stock_cajas: prod.stock_cajas ?? 0,
          stock_unidades: prod.stock_unidades ?? 0,
          stock_minimo: prod.stock_minimo ?? 0,
          unidades_por_caja: prod.unidades_por_caja ?? 1,
          precio_caja_usd: Number(prod.precio_caja_usd) || 0,
          proveedor_id: prod.proveedor_id,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar producto");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const n = (v: number | ""): number => (v === "" ? 0 : v);

  const precioCostoUnitario = useMemo(
    () => {
      if (!form) return 0;
      const costo = n(form.precio_costo_caja_usd);
      const uds = n(form.unidades_por_caja);
      return costo > 0 && uds > 0 ? Math.round((costo / uds) * 100) / 100 : 0;
    },
    [form?.precio_costo_caja_usd, form?.unidades_por_caja],
  );

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const unitMargin = useMarginInput(
    precioCostoUnitario,
    n(form?.precio_unidad_usd ?? ""),
    (p) => setField("precio_unidad_usd", p),
  );

  const boxMargin = useMarginInput(
    n(form?.precio_costo_caja_usd ?? ""),
    n(form?.precio_caja_usd ?? ""),
    (p) => setField("precio_caja_usd", p),
  );

  const precioSugerido = useMemo(
    () => (precioCostoUnitario > 0 ? Math.round((precioCostoUnitario / 0.7) * 100) / 100 : 0),
    [precioCostoUnitario],
  );

  const precioSugeridoCaja = useMemo(
    () => {
      if (!form) return 0;
      const costo = n(form.precio_costo_caja_usd);
      return costo > 0 ? Math.round((costo / 0.7) * 100) / 100 : 0;
    },
    [form?.precio_costo_caja_usd],
  );

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.nombre }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.nombre }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !product) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nombre: form.nombre,
        codigo_barra: form.codigo_barra || null,
        categoria_ids: form.categoria_ids,
        unidades_por_caja: n(form.unidades_por_caja) || 1,
        precio_unidad_usd: n(form.precio_unidad_usd),
        precio_caja_usd: n(form.precio_caja_usd),
        proveedor_id: form.proveedor_id,
        tipo_iva: form.tipo_iva,
        stock_cajas: n(form.stock_cajas),
        stock_unidades: n(form.stock_unidades),
        stock_minimo: n(form.stock_minimo),
      };
      payload.precio_costo_caja_usd = n(form.precio_costo_caja_usd);
      await api.updateProduct(product.id, payload);
      toast("Producto actualizado", "success");
      navigate("/products");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar producto",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldId = (name: string) => `${uid}-${name}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Editar Producto" description="Error al cargar" />
        <div className="mt-4">
          <ErrorBanner onRetry={() => window.location.reload()}>
            {error}
          </ErrorBanner>
        </div>
      </div>
    );
  }

  if (!product || !form) {
    return (
      <div>
        <PageHeader title="Editar Producto" description="Producto no encontrado" />
        <p className="mt-4 text-slate-500">El producto solicitado no existe.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/products")}>
          Volver a productos
        </Button>
      </div>
    );
  }

  const numChange = (field: "precio_costo_caja_usd" | "precio_unidad_usd" | "stock_minimo" | "precio_caja_usd") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setField(field, raw === "" ? "" : e.target.valueAsNumber);
    };

  return (
    <div>
      <PageHeader
        title={`Editar: ${product.nombre}`}
        description="Gestión completa del producto"
      />

      <form onSubmit={handleSubmit} className="mt-6 space-y-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={cardBase}>
            <h3 className="text-sm font-semibold text-text-main uppercase tracking-wide">
              Información General
            </h3>
            <div>
              <label htmlFor={fieldId("nombre")} className={labelBase}>Nombre</label>
              <input
                id={fieldId("nombre")}
                value={form.nombre}
                onChange={(e) => setField("nombre", e.target.value)}
                placeholder="ej: Ron Santa Teresa Añejo"
                required
                className={inputBase}
              />
            </div>
            <div>
              <label htmlFor={fieldId("codigo")} className={labelBase}>Código de barra</label>
              <input
                id={fieldId("codigo")}
                value={form.codigo_barra}
                onChange={(e) => setField("codigo_barra", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                placeholder="Opcional"
                className={inputBase}
              />
            </div>
            <div>
              <MultiSelectTags
                label="Categorías"
                selected={form.categoria_ids}
                options={categoryOptions}
                onChange={(ids) => setField("categoria_ids", ids)}
                placeholder="Seleccionar categorías..."
              />
            </div>
            <div>
              <Combobox
                label="Proveedor"
                value={form.proveedor_id}
                options={supplierOptions}
                onChange={(val) => setField("proveedor_id", val as number | null)}
                placeholder="Buscar proveedor..."
                clearLabel="Sin proveedor"
              />
            </div>
            {!isOperator && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label htmlFor={fieldId("stock-cajas")} className={labelBase}>Stock cajas</label>
                  <input
                    id={fieldId("stock-cajas")}
                    type="number"
                    min="0"
                    value={form.stock_cajas}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setForm((prev) =>
                        prev ? { ...prev, stock_cajas: raw === "" ? "" : e.target.valueAsNumber } : prev,
                      );
                    }}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label htmlFor={fieldId("stock")} className={labelBase}>Stock unidades</label>
                  <input
                    id={fieldId("stock")}
                    type="number"
                    min="0"
                    value={form.stock_unidades}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setForm((prev) =>
                        prev ? { ...prev, stock_unidades: raw === "" ? "" : e.target.valueAsNumber } : prev,
                      );
                    }}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label htmlFor={fieldId("stock-min")} className={labelBase}>Stock mínimo</label>
                  <input
                    id={fieldId("stock-min")}
                    type="number"
                    min="0"
                    value={form.stock_minimo}
                    onChange={numChange("stock_minimo")}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label htmlFor={fieldId("uds-caja")} className={labelBase}>Unidades/caja</label>
                  <input
                    id={fieldId("uds-caja")}
                    type="number"
                    min="1"
                    value={form.unidades_por_caja}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setField("unidades_por_caja", raw === "" ? "" : e.target.valueAsNumber);
                    }}
                    className={inputBase}
                  />
                </div>
              </div>
            )}
            {isOperator && (
              <div>
                <label htmlFor={fieldId("uds-caja")} className={labelBase}>Unidades/caja</label>
                <input
                  id={fieldId("uds-caja")}
                  type="number"
                  min="1"
                  value={form.unidades_por_caja}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setField("unidades_por_caja", raw === "" ? "" : e.target.valueAsNumber);
                  }}
                  className={inputBase}
                />
              </div>
            )}
          </div>

          <div className={cardBase}>
            <h3 className="text-sm font-semibold text-text-main uppercase tracking-wide">
              {isOperator ? "Precios" : "Precios y Finanzas"}
            </h3>
            <div>
              <label htmlFor={fieldId("costo-caja")} className={labelBase}>Costo por caja USD</label>
              <input
                id={fieldId("costo-caja")}
                type="number"
                step="0.01"
                min="0"
                value={form.precio_costo_caja_usd}
                onChange={numChange("precio_costo_caja_usd")}
                required
                className={inputBase}
              />
            </div>
            <div>
              <span className={labelBase}>Costo por unidad USD</span>
              <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-sm text-slate-600 font-mono">
                ${precioCostoUnitario.toFixed(2)}
                <span className="ml-auto text-[11px] text-slate-400">
                  {n(form.precio_costo_caja_usd) > 0 && n(form.unidades_por_caja) > 0
                    ? `${n(form.precio_costo_caja_usd).toFixed(2)} ÷ ${n(form.unidades_por_caja)} uds`
                    : "—"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {!isOperator && (
                <div>
                  <span className={labelBase}>Precio sugerido unidad USD</span>
                  <div className="h-10 px-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-sm">
                    <span className="text-blue-700 font-mono font-medium">
                      ${precioSugerido.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-blue-500">30% margen obj.</span>
                  </div>
                </div>
              )}
              <div>
                <label htmlFor={fieldId("precio-u")} className={labelBase}>Precio unidad USD</label>
                <div className="flex gap-2">
                  <input
                    id={fieldId("precio-u")}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.precio_unidad_usd}
                    onChange={numChange("precio_unidad_usd")}
                    required
                    className={`${inputBase} flex-1`}
                  />
                  {!isOperator && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs whitespace-nowrap"
                      onClick={() => setField("precio_unidad_usd", precioSugerido)}
                      disabled={precioSugerido <= 0}
                    >
                      Copiar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {!isOperator && (
                <div>
                  <span className={labelBase}>Precio sugerido caja USD</span>
                  <div className="h-10 px-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center text-sm text-blue-700 font-mono">
                    ${precioSugeridoCaja.toFixed(2)}
                  </div>
                </div>
              )}
              <div>
                <label htmlFor={fieldId("precio-c")} className={labelBase}>Precio caja USD</label>
                <div className="flex gap-2">
                  <input
                    id={fieldId("precio-c")}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.precio_caja_usd}
                    onChange={numChange("precio_caja_usd")}
                    required
                    className={`${inputBase} flex-1`}
                  />
                  {!isOperator && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs whitespace-nowrap"
                      onClick={() => setField("precio_caja_usd", precioSugeridoCaja)}
                      disabled={precioSugeridoCaja <= 0}
                    >
                      Copiar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Select
                label="Tipo de IVA"
                value={form.tipo_iva}
                onChange={(e) => setField("tipo_iva", e.target.value as "GRAVADO" | "EXENTO")}
                options={[
                  { value: "GRAVADO", label: "Gravado" },
                  { value: "EXENTO", label: "Exento" },
                ]}
              />
            </div>
            {!isOperator && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className={labelBase}>Margen unidad</span>
                  <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={unitMargin.input}
                      placeholder="0.0"
                      onFocus={unitMargin.onFocus}
                      onChange={(e) => unitMargin.onChange(e.target.value)}
                      onBlur={unitMargin.onBlur}
                      className="w-16 bg-transparent text-sm text-text-main outline-none text-right font-mono"
                    />
                    <span className="text-xs text-slate-400">%</span>
                    <Badge variant={unitMargin.margin.color}>{unitMargin.margin.label}</Badge>
                  </div>
                </div>
                <div>
                  <span className={labelBase}>Margen caja</span>
                  <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={boxMargin.input}
                      placeholder="0.0"
                      onFocus={boxMargin.onFocus}
                      onChange={(e) => boxMargin.onChange(e.target.value)}
                      onBlur={boxMargin.onBlur}
                      className="w-16 bg-transparent text-sm text-text-main outline-none text-right font-mono"
                    />
                    <span className="text-xs text-slate-400">%</span>
                    <Badge variant={boxMargin.margin.color}>{boxMargin.margin.label}</Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/products")}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="accent" loading={saving}>
            Guardar Cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
