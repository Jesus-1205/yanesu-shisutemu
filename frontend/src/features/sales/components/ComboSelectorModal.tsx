import { useState } from "react";
import Modal from "@/ui-components/Modal";
import Button from "@/ui-components/Button";
import type { ComboActiveOut } from "@/types/api";
import { formatCurrency } from "@/lib/utils";

interface ComboSelectorModalProps {
  combo: ComboActiveOut;
  onConfirm: (selections: Map<number, number>) => void;
  onClose: () => void;
}

export default function ComboSelectorModal({ combo, onConfirm, onClose }: ComboSelectorModalProps) {
  const [quantities, setQuantities] = useState<Map<number, number>>(new Map());

  const allProducts = combo.groups[0].productos;

  const getQuantity = (productoId: number) => quantities.get(productoId) ?? 0;

  const setQuantity = (productoId: number, val: number) => {
    const next = new Map(quantities);
    if (val <= 0) {
      next.delete(productoId);
    } else {
      next.set(productoId, val);
    }
    setQuantities(next);
  };

  const total = Array.from(quantities.values()).reduce((a, b) => a + b, 0);
  const min = combo.groups[0].min_cantidad;
  const max = combo.groups[0].max_cantidad;
  const valid = total >= min && total <= max;

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm(quantities);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={combo.nombre}
      className="max-w-sm"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Grupo: {combo.groups[0].nombre}
          </span>
          <span className="text-slate-500">
            min {min}, max {max}
          </span>
        </div>

        <div className="space-y-2">
          {allProducts.map((p) => (
            <div key={p.producto_id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-sm text-text-main truncate mr-2">{p.nombre}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity(p.producto_id, getQuantity(p.producto_id) - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-200 text-sm cursor-pointer"
                >
                  -
                </button>
                <span className="w-7 text-center text-sm font-semibold">{getQuantity(p.producto_id)}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(p.producto_id, getQuantity(p.producto_id) + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-200 text-sm cursor-pointer"
                  disabled={total >= max}
                >
                  +
                </button>
                <span className="text-xs text-slate-400 w-16 text-right">
                  {formatCurrency(p.precio_unidad_usd)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
          <span className={`font-semibold ${valid ? "text-emerald-700" : "text-danger"}`}>
            Total: {total}/{max}
          </span>
          <span className="font-bold text-emerald-700">
            {formatCurrency(combo.precio_total_usd)}
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            onClick={handleConfirm}
            disabled={!valid}
          >
            Agregar combo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
