import { useState } from "react";
import type { RetornableProductoOut } from "@/types/api";
import Modal from "@/ui-components/Modal";
import Button from "@/ui-components/Button";
import Select from "@/ui-components/Select";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  productos: RetornableProductoOut[];
}

export function GestionarProductosModal({ open, onClose, onSaved, productos }: Props) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [productoId, setProductoId] = useState("");
  const [presentacion, setPresentacion] = useState<"222" | "333">("222");
  const [loading, setLoading] = useState(false);

  const handleAssociate = async () => {
    if (!productoId) {
      toast("Selecciona un producto", "error");
      return;
    }
    setLoading(true);
    try {
      await api.asociarRetornableProducto({
        producto_id: Number(productoId),
        presentacion,
      });
      toast("Producto asociado exitosamente", "success");
      onSaved();
      setShowAdd(false);
      setProductoId("");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Error al asociar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDisassociate = async (id: number) => {
    setLoading(true);
    try {
      await api.desasociarRetornableProducto(id);
      toast("Producto desasociado", "success");
      onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message: "Error al desasociar", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Productos Retornables"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="accent" size="sm" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancelar" : "+ Asociar Nuevo"}
          </Button>
        </div>

        {showAdd && (
          <div className="flex gap-3 items-end p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Producto
              </label>
              <input
                type="text"
                placeholder="ID del producto"
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                value={productoId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductoId(e.target.value)}
              />
            </div>
            <div className="w-32">
              <Select
                label="Presentación"
                value={presentacion}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPresentacion(e.target.value as "222" | "333")}
                options={[
                  { label: "222", value: "222" },
                  { label: "333", value: "333" },
                ]}
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleAssociate} loading={loading}>
              Asociar
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-2 font-semibold text-slate-600">Producto</th>
                <th className="p-2 font-semibold text-slate-600">Presentación</th>
                <th className="p-2 font-semibold text-slate-600">Stock (cajas)</th>
                <th className="p-2 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="p-2">{p.producto_nombre}</td>
                  <td className="p-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                      {p.presentacion}
                    </span>
                  </td>
                  <td className="p-2 font-mono">{p.stock_cajas}</td>
                  <td className="p-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDisassociate(p.id)}
                      loading={loading}
                    >
                      Quitar
                    </Button>
                  </td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400">
                    No hay productos asociados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
