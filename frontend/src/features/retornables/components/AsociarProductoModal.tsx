import { useState } from "react";
import Modal from "@/ui-components/Modal";
import Button from "@/ui-components/Button";
import Select from "@/ui-components/Select";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AsociarProductoModal({ open, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [productoId, setProductoId] = useState<number | null>(null);
  const [presentacion, setPresentacion] = useState<"222" | "333">("222");
  const [loading, setLoading] = useState(false);

  const searchProducts = async (query: string) => {
    const result = await api.getProducts({ search: query || undefined, page_size: 10 });
    return result.items.map((p) => ({
      value: p.id,
      label: p.nombre,
      subtitle: p.codigo_barra || undefined,
    }));
  };

  const handleAssociate = async () => {
    if (!productoId) {
      toast("Selecciona un producto", "error");
      return;
    }
    setLoading(true);
    try {
      await api.asociarRetornableProducto({
        producto_id: productoId,
        presentacion,
      });
      toast("Producto asociado exitosamente", "success");
      onSaved();
      onClose();
      setProductoId(null);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Error al asociar", "error");
    } finally {
      setLoading(false);
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
          <Button variant="primary" onClick={handleAssociate} loading={loading}>
            Asociar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
