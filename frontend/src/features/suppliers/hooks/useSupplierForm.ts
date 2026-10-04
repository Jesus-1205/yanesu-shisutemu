import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import type { SupplierOut } from "@/types/api";
import { toTitleCase } from "@/lib/text";

export interface UseSupplierFormOptions {
  supplierId?: number | null;
  initialData?: SupplierOut | null;
  initialNombre?: string;
  onSuccess?: (supplier: SupplierOut) => void;
  onClose?: () => void;
}

export function useSupplierForm({
  supplierId = null,
  initialData = null,
  initialNombre = "",
  onSuccess,
  onClose,
}: UseSupplierFormOptions = {}) {
  const isEdit = Boolean(supplierId || initialData?.id);
  const [nombre, setNombre] = useState(initialNombre ? toTitleCase(initialNombre) : "");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setNombre(initialNombre ? toTitleCase(initialNombre) : "");
    setTelefono("");
    setEmail("");
    setError(null);
    setLoading(false);
    setSaving(false);
  }, [initialNombre]);

  useEffect(() => {
    if (initialData) {
      setNombre(initialData.nombre);
      setTelefono(initialData.telefono ?? "");
      setEmail(initialData.email ?? "");
      setError(null);
    } else if (supplierId) {
      setLoading(true);
      setError(null);
      api
        .getSupplier(supplierId)
        .then((sup) => {
          setNombre(sup.nombre);
          setTelefono(sup.telefono ?? "");
          setEmail(sup.email ?? "");
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Error al cargar proveedor");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setNombre(initialNombre ? toTitleCase(initialNombre) : "");
      setTelefono("");
      setEmail("");
      setError(null);
    }
  }, [supplierId, initialData, initialNombre]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNombre = nombre.trim();
    if (!cleanNombre) return;

    setSaving(true);
    setError(null);
    try {
      let result: SupplierOut;
      const payload = {
        nombre: toTitleCase(cleanNombre),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
      };

      const targetId = supplierId || initialData?.id;
      if (targetId) {
        result = await api.updateSupplier(targetId, payload);
      } else {
        result = await api.createSupplier(payload);
      }

      onSuccess?.(result);
      if (onClose) {
        resetForm();
        onClose();
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar proveedor";
      setError(msg);
      return undefined;
    } finally {
      setSaving(false);
    }
  };

  const handleClose = useCallback(() => {
    resetForm();
    onClose?.();
  }, [resetForm, onClose]);

  return {
    isEdit,
    nombre,
    setNombre,
    telefono,
    setTelefono,
    email,
    setEmail,
    loading,
    saving,
    error,
    handleSubmit,
    handleClose,
    resetForm,
  };
}
