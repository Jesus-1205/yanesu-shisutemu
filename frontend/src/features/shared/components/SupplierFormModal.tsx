import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import Button from "@/ui-components/Button";
import Spinner from "@/ui-components/Spinner";
import type { SupplierOut } from "@/types/api";
import { useSupplierForm } from "@/features/suppliers/hooks/useSupplierForm";

export interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (supplier: SupplierOut) => void;
  onCreated?: (supplier: SupplierOut) => void;
  supplierId?: number | null;
  initialData?: SupplierOut | null;
  initialNombre?: string;
}

export default function SupplierFormModal({
  open,
  onClose,
  onSuccess,
  onCreated,
  supplierId,
  initialData,
  initialNombre,
}: SupplierFormModalProps) {
  const handleSuccess = (supplier: SupplierOut) => {
    onSuccess?.(supplier);
    onCreated?.(supplier);
  };

  const {
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
  } = useSupplierForm({
    supplierId: open ? supplierId : null,
    initialData: open ? initialData : null,
    initialNombre: open ? initialNombre : "",
    onSuccess: handleSuccess,
    onClose,
  });

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? "Editar Proveedor" : "Nuevo Proveedor"}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
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
            <Button
              type="submit"
              variant="accent"
              loading={saving}
              disabled={!nombre.trim()}
            >
              {isEdit ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
