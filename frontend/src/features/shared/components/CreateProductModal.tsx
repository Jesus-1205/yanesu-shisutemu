import Modal from "@/ui-components/Modal";
import type { ProductOut } from "@/types/api";
import { useCreateProduct } from "../hooks/useCreateProduct";
import CreateProductForm from "./CreateProductForm";

export { extractUnidadesFromNombre } from "../utils/extractUnidades";

export interface CreateProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: ProductOut) => void;
  initialNombre?: string;
  initialPrecio?: number;
  initialMoneda?: "USD" | "BS";
  initialProveedorId?: number | null;
  tasaBs?: number;
  compact?: boolean;
}

export default function CreateProductModal(props: CreateProductModalProps) {
  const { open, compact = false } = props;
  const hook = useCreateProduct(props);

  return (
    <Modal
      open={open}
      onClose={hook.handleClose}
      title="Nuevo Producto"
      className={compact ? "max-w-lg!" : "max-w-7xl!"}
    >
      <CreateProductForm hook={hook} compact={compact} />
    </Modal>
  );
}
