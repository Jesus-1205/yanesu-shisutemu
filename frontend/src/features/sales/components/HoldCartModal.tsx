import { useEffect, useState } from "react";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import Button from "@/ui-components/Button";

interface HoldCartModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (label: string) => void;
}

export default function HoldCartModal({
  open,
  onClose,
  onConfirm,
}: HoldCartModalProps) {
  const [holdLabel, setHoldLabel] = useState("");

  useEffect(() => {
    if (open) {
      setHoldLabel("");
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(holdLabel);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Guardar venta"
    >
      <p className="mb-4 text-sm text-slate-600">
        El carrito actual se guardará en la cola de espera y quedará vacío para poder hacer otra venta.
      </p>
      <Input
        label="Nombre / nota del cliente (opcional)"
        placeholder="Cliente"
        maxLength={60}
        autoFocus
        value={holdLabel}
        onChange={(e) => setHoldLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleConfirm();
          }
        }}
      />
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="success" onClick={handleConfirm}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
