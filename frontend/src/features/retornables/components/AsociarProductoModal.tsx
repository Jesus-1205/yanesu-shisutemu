import { useState } from "react";
import Modal from "@/ui-components/Modal";
import Button from "@/ui-components/Button";
import Select from "@/ui-components/Select";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import { useToast } from "@/ui-components/Toast";
import {
  useSearchProductosSelect,
  useAsociarProductoRetornable,
} from "../hooks/useRetornableMutations";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AsociarProductoModal({ open, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [productoId, setProductoId] = useState<number | null>(null);
  const [presentacion, setPresentacion] = useState<"222" | "333">("222");

  const { searchProducts } = useSearchProductosSelect();
  const { asociar, isAsociando } = useAsociarProductoRetornable();

  const handleAssociate = async () => {
    if (!productoId) {
      toast("Selecciona un producto", "error");
      return;
    }
    const success = await asociar(
      {
        producto_id: productoId,
        presentacion,
      },
      () => {
        onSaved();
        handleClose();
      }
    );
    if (success) {
      setProductoId(null);
    }
  };

  const handleClose = () => {
    setProductoId(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Asociar Producto Retornable" className="max-w-md">
      <div className="space-y-4">
        <AsyncCombobox
          label="Producto"
          value={productoId}
          onSearch={searchProducts}
          onChange={(v) => setProductoId(v as number | null)}
          placeholder="Buscar producto por nombre..."
          allowClear
          clearLabel="Ninguno"
        />

        <Select
          label="Presentación"
          value={presentacion}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPresentacion(e.target.value as "222" | "333")}
          options={[
            { label: "222 (222ml)", value: "222" },
            { label: "333 (333ml)", value: "333" },
          ]}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleAssociate} loading={isAsociando}>
            Asociar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
