import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/services/api";
import type { Category } from "@/types/api";
import Button from "@/ui-components/Button";
import Input from "@/ui-components/Input";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import { useToast } from "@/ui-components/Toast";

export default function CategoryFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });

  useEffect(() => {
    if (isNew) return;
    api
      .getCategory(Number(id))
      .then((cat: Category) => {
        setForm({
          nombre: cat.nombre,
          descripcion: cat.descripcion ?? "",
        });
      })
      .catch(() => toast("Error al cargar categoría", "error"))
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
        await api.createCategory({
          nombre: form.nombre,
          descripcion: form.descripcion || null,
        });
        toast("Categoría creada", "success");
      } else {
        await api.updateCategory(Number(id), {
          nombre: form.nombre || undefined,
          descripcion: form.descripcion || null,
        });
        toast("Categoría actualizada", "success");
      }
      navigate("/categories");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar categoría",
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
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={isNew ? "Nueva Categoría" : "Editar Categoría"}
        description={
          isNew ? "Crea una nueva categoría de productos" : "Modifica los datos de la categoría"
        }
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-slate-200 bg-surface p-6 shadow-xs"
      >
        <Input
          label="Nombre"
          value={form.nombre}
          onChange={(e) => handleChange("nombre", e.target.value)}
          placeholder="ej: Licores Premium"
          required
        />

        <Input
          label="Descripción"
          value={form.descripcion}
          onChange={(e) => handleChange("descripcion", e.target.value)}
          placeholder="Opcional — descripción breve"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/categories")}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="accent" loading={saving}>
            {isNew ? "Crear categoría" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
