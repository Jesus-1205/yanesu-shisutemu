import { useState, useCallback } from "react";
import { api } from "@/services/api";
import type { ComboOut, ComboGroupEntry } from "@/types/api";

interface FormProductEntry {
  producto_id: number;
  _nombre?: string;
}

export interface FormGroup {
  nombre: string;
  min_cantidad: number;
  max_cantidad: number;
  productos: FormProductEntry[];
}

interface UseComboFormReturn {
  formName: string;
  setFormName: (v: string) => void;
  formDesc: string;
  setFormDesc: (v: string) => void;
  formPrecio: string;
  setFormPrecio: (v: string) => void;
  formGroups: FormGroup[];
  formMethodIds: number[];
  saving: boolean;
  setSaving: (v: boolean) => void;
  resetForm: (combo?: ComboOut | null) => void;

  handleProductSearch: (query: string) => Promise<{ value: number; label: string; subtitle?: string }[]>;

  addGroup: () => void;
  updateGroup: (idx: number, field: keyof FormGroup, value: unknown) => void;
  removeGroup: (idx: number) => void;
  addProductToGroup: (groupIdx: number) => void;
  updateProductInGroup: (groupIdx: number, prodIdx: number, producto_id: number) => void;
  removeProductFromGroup: (groupIdx: number, prodIdx: number) => void;
  toggleMethod: (id: number) => void;

  validateAndBuildPayload: () => { valid: boolean; payload: any | null };
}

export function useComboForm(): UseComboFormReturn {
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrecio, setFormPrecio] = useState("");
  const [formGroups, setFormGroups] = useState<FormGroup[]>([]);
  const [formMethodIds, setFormMethodIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback((combo?: ComboOut | null) => {
    if (combo) {
      setFormName(combo.nombre);
      setFormDesc(combo.descripcion ?? "");
      setFormPrecio(String(combo.precio_total_usd));
      setFormGroups(
        combo.groups.map((g) => ({
          nombre: g.nombre,
          min_cantidad: g.min_cantidad,
          max_cantidad: g.max_cantidad,
          productos: g.products.map((p) => ({
            producto_id: p.producto_id,
            _nombre: p.producto_nombre,
          })),
        }))
      );
      setFormMethodIds(combo.metodo_pago_ids);
    } else {
      setFormName("");
      setFormDesc("");
      setFormPrecio("");
      setFormGroups([]);
      setFormMethodIds([]);
    }
  }, []);

  const addGroup = useCallback(() => {
    setFormGroups((prev) => [...prev, { nombre: "", min_cantidad: 0, max_cantidad: 8, productos: [] }]);
  }, []);

  const updateGroup = useCallback((idx: number, field: keyof FormGroup, value: unknown) => {
    setFormGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, [field]: value } : g)));
  }, []);

  const removeGroup = useCallback((idx: number) => {
    setFormGroups((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addProductToGroup = useCallback((groupIdx: number) => {
    setFormGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx ? { ...g, productos: [...g.productos, { producto_id: 0 }] } : g
      )
    );
  }, []);

  const updateProductInGroup = useCallback((groupIdx: number, prodIdx: number, producto_id: number) => {
    setFormGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx
          ? { ...g, productos: g.productos.map((p, j) => (j === prodIdx ? { ...p, producto_id } : p)) }
          : g
      )
    );
  }, []);

  const removeProductFromGroup = useCallback((groupIdx: number, prodIdx: number) => {
    setFormGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx ? { ...g, productos: g.productos.filter((_, j) => j !== prodIdx) } : g
      )
    );
  }, []);

  const toggleMethod = useCallback((id: number) => {
    setFormMethodIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }, []);

  const handleProductSearch = useCallback(async (query: string) => {
    const data = await api.getProducts({ search: query || undefined });
    return data.items.map((p) => ({
      value: p.id,
      label: p.nombre,
      subtitle: p.codigo_barra || undefined,
    }));
  }, []);

  const validateAndBuildPayload = useCallback(() => {
    if (!formName.trim() || !formPrecio || Number(formPrecio) <= 0 || formGroups.length === 0 || formMethodIds.length === 0) {
      return { valid: false, payload: null };
    }

    const grupos: ComboGroupEntry[] = formGroups.map((g) => ({
      nombre: g.nombre,
      min_cantidad: g.min_cantidad,
      max_cantidad: g.max_cantidad,
      productos: g.productos.filter((p) => p.producto_id > 0).map((p) => ({ producto_id: p.producto_id })),
    }));

    return {
      valid: true,
      payload: {
        nombre: formName.trim(),
        descripcion: formDesc.trim() || null,
        precio_total_usd: Number(formPrecio),
        grupos,
        metodo_pago_ids: formMethodIds,
      },
    };
  }, [formName, formDesc, formPrecio, formGroups, formMethodIds]);

  return {
    formName, setFormName,
    formDesc, setFormDesc,
    formPrecio, setFormPrecio,
    formGroups, formMethodIds,
    saving, setSaving,
    resetForm,
    handleProductSearch,
    addGroup, updateGroup, removeGroup,
    addProductToGroup, updateProductInGroup, removeProductFromGroup,
    toggleMethod,
    validateAndBuildPayload,
  };
}
