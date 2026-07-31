import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { SupplierOut } from "@/types/api";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import Button from "@/ui-components/Button";
import { toTitleCase } from "@/lib/text";

interface CreateSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: SupplierOut) => void;
  initialNombre?: string;
}

export default function CreateSupplierModal({ open, onClose, onCreated, initialNombre }: CreateSupplierModalProps) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialNombre) setNombre(toTitleCase(initialNombre));
  }, [open, initialNombre]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const supplier = await api.createSupplier({
        nombre: toTitleCase(nombre.trim()),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
      });
      onCreated(supplier);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear proveedor");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setNombre("");
    setTelefono("");
    setEmail("");
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo Proveedor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="ej: Distribuidora ABC"
          required
          autoFocus
        />
        <Input
          label="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="ej: +58 412 123 4567"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ej: contacto@distribuidora.com"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent" loading={saving}>
            Crear proveedor
          </Button>
        </div>
      </form>
    </Modal>
  );
}
