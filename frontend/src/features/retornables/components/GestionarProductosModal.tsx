import { useState } from "react";
import type { RetornableProductoOut } from "@/types/api";
import Modal from "@/ui-components/Modal";
import Button from "@/ui-components/Button";
import { useDesasociarProductoRetornable } from "../hooks/useRetornableMutations";
import { AsociarProductoModal } from "./AsociarProductoModal";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  productos: RetornableProductoOut[];
}

export function GestionarProductosModal({ open, onClose, onSaved, productos }: Props) {
  const [showAsociar, setShowAsociar] = useState(false);
  const { desasociar, isDesasociando } = useDesasociarProductoRetornable();

  const handleDisassociate = async (id: number) => {
    await desasociar(id, () => {
      onSaved();
    });
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Productos Retornables"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="accent" size="sm" onClick={() => setShowAsociar(true)}>
              + Asociar Nuevo
            </Button>
          </div>

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
                        loading={isDesasociando}
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

      <AsociarProductoModal
        open={showAsociar}
        onClose={() => setShowAsociar(false)}
        onSaved={onSaved}
      />
    </>
  );
}
