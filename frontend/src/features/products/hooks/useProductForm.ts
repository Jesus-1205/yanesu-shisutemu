import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import type { CategoryOut, ProductOut as Product, SupplierOut } from "@/types/api";
import { PRODUCT_FORM_INITIAL, type ProductFormData } from "../types";
import { useMarginInput } from "./useMarginInput";

export const n = (v: number | ""): number => (v === "" ? 0 : v);

export function useProductForm(initialProduct?: Product | null) {
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [form, setForm] = useState<ProductFormData>(() => {
    if (initialProduct) {
      return {
        nombre: initialProduct.nombre,
        codigo_barra: initialProduct.codigo_barra ?? "",
        categoria_ids: initialProduct.categories.map((c) => c.id),
        precio_costo_caja_usd: Number(initialProduct.precio_costo_caja_usd) || 0,
        precio_unidad_usd: Number(initialProduct.precio_unidad_usd) || 0,
        tipo_iva: initialProduct.tipo_iva,
        stock_cajas: initialProduct.stock_cajas ?? 0,
        stock_unidades: initialProduct.stock_unidades ?? 0,
        stock_minimo: initialProduct.stock_minimo ?? 0,
        unidades_por_caja: initialProduct.unidades_por_caja ?? 1,
        precio_caja_usd: Number(initialProduct.precio_caja_usd) || 0,
        proveedor_id: initialProduct.proveedor_id,
      };
    }
    return PRODUCT_FORM_INITIAL;
  });

  // Re-sync if initialProduct is loaded asynchronously
  useEffect(() => {
    if (initialProduct) {
      setForm({
        nombre: initialProduct.nombre,
        codigo_barra: initialProduct.codigo_barra ?? "",
        categoria_ids: initialProduct.categories.map((c) => c.id),
        precio_costo_caja_usd: Number(initialProduct.precio_costo_caja_usd) || 0,
        precio_unidad_usd: Number(initialProduct.precio_unidad_usd) || 0,
        tipo_iva: initialProduct.tipo_iva,
        stock_cajas: initialProduct.stock_cajas ?? 0,
        stock_unidades: initialProduct.stock_unidades ?? 0,
        stock_minimo: initialProduct.stock_minimo ?? 0,
        unidades_por_caja: initialProduct.unidades_por_caja ?? 1,
        precio_caja_usd: Number(initialProduct.precio_caja_usd) || 0,
        proveedor_id: initialProduct.proveedor_id,
      });
    }
  }, [initialProduct]);

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      try {
        const [cats, sups] = await Promise.all([
          api.getCategories(),
          api.getSuppliers(),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setSuppliers(sups);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    loadMeta();
    return () => { cancelled = true; };
  }, []);

  const setField = useCallback(<K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const numChange = useCallback((field: "precio_costo_caja_usd" | "precio_unidad_usd" | "stock_minimo" | "precio_caja_usd") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setField(field, raw === "" ? "" : e.target.valueAsNumber);
    }, [setField]);

  const precioCostoUnitario = useMemo(() => {
    const costo = n(form.precio_costo_caja_usd);
    const uds = n(form.unidades_por_caja);
    return costo > 0 && uds > 0 ? Math.round((costo / uds) * 100) / 100 : 0;
  }, [form.precio_costo_caja_usd, form.unidades_por_caja]);

  const unitMargin = useMarginInput(
    precioCostoUnitario,
    n(form.precio_unidad_usd),
    (p) => setField("precio_unidad_usd", p),
  );

  const boxMargin = useMarginInput(
    n(form.precio_costo_caja_usd),
    n(form.precio_caja_usd),
    (p) => setField("precio_caja_usd", p),
  );

  const precioSugerido = useMemo(
    () => (precioCostoUnitario > 0 ? Math.round((precioCostoUnitario / 0.7) * 100) / 100 : 0),
    [precioCostoUnitario],
  );

  const precioSugeridoCaja = useMemo(() => {
    const costo = n(form.precio_costo_caja_usd);
    return costo > 0 ? Math.round((costo / 0.7) * 100) / 100 : 0;
  }, [form.precio_costo_caja_usd]);

  const onCategoryCreated = useCallback((cat: CategoryOut) => {
    setCategories((prev) => [...prev, cat]);
    setForm((prev) => ({ ...prev, categoria_ids: [...prev.categoria_ids, cat.id] }));
  }, []);

  const onSupplierCreated = useCallback((sup: SupplierOut) => {
    setSuppliers((prev) => [...prev, sup]);
    setField("proveedor_id", sup.id);
  }, [setField]);

  const buildPayload = useCallback(() => {
    return {
      nombre: form.nombre,
      codigo_barra: form.codigo_barra || null,
      categoria_ids: form.categoria_ids,
      unidades_por_caja: n(form.unidades_por_caja) || 1,
      precio_costo_caja_usd: n(form.precio_costo_caja_usd),
      precio_unidad_usd: n(form.precio_unidad_usd),
      precio_caja_usd: n(form.precio_caja_usd),
      proveedor_id: form.proveedor_id,
      tipo_iva: form.tipo_iva,
      stock_cajas: n(form.stock_cajas),
      stock_unidades: n(form.stock_unidades),
      stock_minimo: n(form.stock_minimo),
    };
  }, [form]);

  return {
    form,
    setForm,
    setField,
    numChange,
    categories,
    suppliers,
    loadingMeta,
    precioCostoUnitario,
    unitMargin,
    boxMargin,
    precioSugerido,
    precioSugeridoCaja,
    onCategoryCreated,
    onSupplierCreated,
    buildPayload,
  };
}

export type UseProductFormReturn = ReturnType<typeof useProductForm>;
