import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/services/api";
import type { Supplier } from "@/types/api";
import Button from "@/ui-components/Button";
import Input from "@/ui-components/Input";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import { useToast } from "@/ui-components/Toast";

export default function SupplierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
  });

  useEffect(() => {
    if (isNew) return;
    api
      .getSupplier(Number(id))
      .then((sup: Supplier) => {
        setForm({
          nombre: sup.nombre,
          telefono: sup.telefono ?? "",
          email: sup.email ?? "",
        });
      })
      .catch(() => toast("Error al cargar proveedor", "error"))
      .finally(() => setLoading(false));
  }, [id, isNew, toast]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await api.createSupplier({
          nombre: form.nombre,
          telefono: form.telefono || null,
          email: form.email || null,
        });
        toast("Proveedor creado", "success");
      } else {
        await api.updateSupplier(Number(id), {
          nombre: form.nombre || undefined,
          telefono: form.telefono || null,
          email: form.email || null,
        });
        toast("Proveedor actualizado", "success");
      }
      navigate("/suppliers");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar proveedor",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title={isNew ? "Nuevo Proveedor" : "Editar Proveedor"}
        description={
          isNew ? "Registra un nuevo proveedor" : "Modifica los datos del proveedor"
        }
      />

      <form
        onSubmit={handleSubmit}
        className="bg-surface rounded-xl border border-slate-200 shadow-xs p-6 space-y-5"
      >
        <Input
          label="Nombre"
          value={form.nombre}
          onChange={(e) => handleChange("nombre", e.target.value)}
          placeholder="ej: Distribuidora ABC"
          required
        />

        <Input
          label="Teléfono"
          value={form.telefono}
          onChange={(e) => handleChange("telefono", e.target.value)}
          placeholder="ej: +58 412 123 4567"
        />

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="ej: contacto@distribuidora.com"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/suppliers")}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="accent" loading={saving}>
            {isNew ? "Crear proveedor" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
