import type { SupplierOut } from "@/types/api";
import SupplierFormModal from "./SupplierFormModal";

interface CreateSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: SupplierOut) => void;
  initialNombre?: string;
}

export default function CreateSupplierModal({
  open,
  onClose,
  onCreated,
  initialNombre,
}: CreateSupplierModalProps) {
  return (
    <SupplierFormModal
      open={open}
      onClose={onClose}
      onCreated={onCreated}
      initialNombre={initialNombre}
    />
  );
}

