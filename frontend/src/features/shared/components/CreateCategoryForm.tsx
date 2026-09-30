import { useState } from "react";
import Input from "@/ui-components/Input";
import Button from "@/ui-components/Button";
import type { CategoryCreate } from "@/types/api";

interface CreateCategoryFormProps {
  onSubmit: (data: CategoryCreate) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  error?: string | null;
}

export default function CreateCategoryForm({
  onSubmit,
  onCancel,
  saving = false,
  error = null,
}: CreateCategoryFormProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

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
          Crear categoría
        </Button>
      </div>
    </form>
  );
}
