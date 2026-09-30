import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/services/api";
import type { ProductOut, CategoryOut, SupplierOut } from "@/types/api";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  PRODUCT_FORM_INITIAL,
  type ProductFormData,
  calcMargin,
  type MarginDisplay,
} from "@/features/products/types";
import { toTitleCase } from "@/lib/text";
import { extractUnidadesFromNombre } from "../utils/extractUnidades";

export const n = (v: number | "" | undefined): number => (v === "" || v === undefined ? 0 : Number(v));

export interface UseCreateProductOptions {
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

export interface UseCreateProductReturn {
  // State
  formData: ProductFormData;
  updateField: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void;
  isOperator: boolean;
  saving: boolean;
  error: string | null;

  // Catalogs
  categories: CategoryOut[];
  suppliers: SupplierOut[];
  categoryOptions: { value: number; label: string }[];
  supplierOptions: { value: number; label: string }[];

  // Computed calculations
  costoUnitario: number;
  precioSugeridoUnidad: number;
  precioSugeridoCaja: number;
  margin: MarginDisplay;

  // Handlers
  handleSearchSuppliers: (query: string) => Promise<{ value: number; label: string }[]>;
  resetForm: () => void;
  handleClose: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useCreateProduct({
  open,
  onClose,
  onCreated,
  initialNombre,
  initialPrecio,
  initialMoneda,
  initialProveedorId,
  tasaBs,
  compact = false,
}: UseCreateProductOptions): UseCreateProductReturn {
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";

  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProductFormData>(() => ({
    ...PRODUCT_FORM_INITIAL,
    stock_minimo: 5,
  }));

  const updateField = useCallback(<K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      ...PRODUCT_FORM_INITIAL,
      stock_minimo: 5,
    });
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    api.getCategories()
      .then(setCategories)
      .catch(() => {});
    api.getSuppliers()
      .then(setSuppliers)
      .catch(() => {});

    // Pre-llenar campos si vienen de IA
    setFormData((prev) => {
      let nombre = prev.nombre;
      let unidades_por_caja = prev.unidades_por_caja;
      let precio_costo_caja_usd = prev.precio_costo_caja_usd;
      let proveedor_id = prev.proveedor_id;

      if (initialNombre) {
        const { cleanName, unidades } = extractUnidadesFromNombre(initialNombre);
        nombre = toTitleCase(cleanName);
        if (unidades > 0) unidades_por_caja = unidades;
      }
      if (initialPrecio && initialPrecio > 0) {
        const precioUsd = initialMoneda === "BS" && tasaBs && tasaBs > 0
          ? Math.round((initialPrecio / tasaBs) * 100) / 100
          : initialPrecio;
        precio_costo_caja_usd = precioUsd;
      }
      if (initialProveedorId) {
        proveedor_id = initialProveedorId;
      }

      return {
        ...prev,
        nombre,
        unidades_por_caja,
        precio_costo_caja_usd,
        proveedor_id,
      };
    });
  }, [open, initialNombre, initialPrecio, initialMoneda, initialProveedorId, tasaBs]);

  const handleSearchSuppliers = useCallback(async (query: string) => {
    const data = await api.getSuppliers({ search: query || undefined });
    setSuppliers(data);
    return data.map((s) => ({
      value: s.id,
      label: s.nombre,
    }));
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const costoUnitario = useMemo(() => {
    const c = n(formData.precio_costo_caja_usd);
    const u = n(formData.unidades_por_caja);
    return c > 0 && u > 0 ? Math.round((c / u) * 100) / 100 : 0;
  }, [formData.precio_costo_caja_usd, formData.unidades_por_caja]);

  const precioSugeridoUnidad = useMemo(
    () => (costoUnitario > 0 ? Math.round((costoUnitario / 0.7) * 100) / 100 : 0),
    [costoUnitario],
  );

  const precioSugeridoCaja = useMemo(() => {
    const c = n(formData.precio_costo_caja_usd);
    return c > 0 ? Math.round((c / 0.7) * 100) / 100 : 0;
  }, [formData.precio_costo_caja_usd]);

  const margin = useMemo(
    () => calcMargin(costoUnitario, n(formData.precio_unidad_usd)),
    [costoUnitario, formData.precio_unidad_usd],
  );

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.nombre })),
    [categories],
  );

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.nombre })),
    [suppliers],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;
    const unds = n(formData.unidades_por_caja);
    if (!unds || unds <= 0) {
      setError("Las unidades por caja son obligatorias");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const precioUnidadFinal = compact ? 0.01 : n(formData.precio_unidad_usd);
      const precioCajaFinal = compact ? 0.01 : n(formData.precio_caja_usd);
      const product = await api.createProduct({
        nombre: toTitleCase(formData.nombre.trim()),
        codigo_barra: formData.codigo_barra.trim() || null,
        categoria_ids: formData.categoria_ids,
        unidades_por_caja: unds || 1,
        stock_unidades: compact ? 0 : n(formData.stock_unidades),
        stock_minimo: compact ? 5 : n(formData.stock_minimo),
        precio_costo_caja_usd: compact ? 0.01 : n(formData.precio_costo_caja_usd),
        precio_unidad_usd: precioUnidadFinal || 0.01,
        precio_caja_usd: precioCajaFinal || 0.01,
        proveedor_id: compact ? null : formData.proveedor_id,
        tipo_iva: compact ? "GRAVADO" : formData.tipo_iva,
      });
      onCreated(product);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear producto");
    } finally {
      setSaving(false);
    }
  };

  return {
    formData,
    updateField,
    isOperator,
    saving,
    error,
    categories,
    suppliers,
    categoryOptions,
    supplierOptions,
    costoUnitario,
    precioSugeridoUnidad,
    precioSugeridoCaja,
    margin,
    handleSearchSuppliers,
    resetForm,
    handleClose,
    handleSubmit,
  };
}
