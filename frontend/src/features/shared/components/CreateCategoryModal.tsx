import { useState } from "react";
import { api } from "@/services/api";
import type { CategoryOut } from "@/types/api";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import Button from "@/ui-components/Button";

interface CreateCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (category: CategoryOut) => void;
}

export default function CreateCategoryModal({ open, onClose, onCreated }: CreateCategoryModalProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const category = await api.createCategory({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
      });
      onCreated(category);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear categoría");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setNombre("");
    setDescripcion("");
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Nueva Categoría">
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
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent" loading={saving}>
            Crear categoría
          </Button>
        </div>
      </form>
    </Modal>
  );
}
