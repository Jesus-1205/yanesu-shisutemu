import { useEffect, useState } from "react";
import Input from "@/ui-components/Input";
import Button from "@/ui-components/Button";
import type { CategoryCreate } from "@/types/api";

interface CreateCategoryFormProps {
  initialData?: { nombre: string; descripcion?: string | null } | null;
  submitLabel?: string;
  onSubmit: (data: CategoryCreate) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  error?: string | null;
}

export default function CreateCategoryForm({
  initialData,
  submitLabel,
  onSubmit,
  onCancel,
  saving = false,
  error = null,
}: CreateCategoryFormProps) {
  const [nombre, setNombre] = useState(initialData?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? "");

  useEffect(() => {
    if (initialData) {
      setNombre(initialData.nombre ?? "");
      setDescripcion(initialData.descripcion ?? "");
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    onSubmit({
      nombre,
      descripcion: descripcion.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="ej: Licores Premium"
        required
        autoFocus
      />
      <Input
        label="Descripción"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Opcional — descripción breve"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" loading={saving}>
          {submitLabel || (initialData ? "Guardar cambios" : "Crear categoría")}
        </Button>
      </div>
    </form>
  );
}
