import { useState } from "react";
import { Clock, Trash2, RotateCcw } from "lucide-react";
import Drawer from "@/ui-components/Drawer";
import Button from "@/ui-components/Button";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import EmptyState from "@/ui-components/EmptyState";
import { useToast } from "@/ui-components/Toast";
import {
  useHoldQueueStore,
  heldCartTotalUsd,
  heldCartItemCount,
} from "../store/holdQueueStore";
import { useCartStore } from "../store/cartStore";
import { formatCurrency, formatDateTimeVE } from "@/lib/utils";

interface HoldQueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function HoldQueueDrawer({ open, onClose }: HoldQueueDrawerProps) {
  const { toast } = useToast();
  const heldCarts = useHoldQueueStore((s) => s.heldCarts);
  const restoreCart = useHoldQueueStore((s) => s.restoreCart);
  const removeHeld = useHoldQueueStore((s) => s.removeHeld);
  const currentItems = useCartStore((s) => s.items);

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const hasCurrentItems = Object.keys(currentItems).length > 0;
  const confirmTarget = heldCarts.find((h) => h.id === confirmId) ?? null;
  const deleteTarget = heldCarts.find((h) => h.id === deleteId) ?? null;

  const handleRestoreClick = (id: string) => {
    if (hasCurrentItems) {
      setConfirmId(id);
      return;
    }
    restoreCart(id);
    toast("Venta cargada", "success");
    onClose();
  };

  const handleConfirmRestore = () => {
    if (confirmId) {
      restoreCart(confirmId);
      toast("Venta cargada", "success");
      onClose();
    }
    setConfirmId(null);
  };

  const handleDelete = (id: string) => {
    removeHeld(id);
    toast("Venta en espera eliminada", "success");
    setDeleteId(null);
  };

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Ventas en espera">
        {heldCarts.length === 0 ? (
          <EmptyState
            title="Sin ventas en espera"
            description="Guarda un carrito con el botón «Guardar» para recuperarlo y poder hacer otra venta."
          />
        ) : (
          <div className="space-y-3">
            {heldCarts.map((held) => {
              const totalUsd = heldCartTotalUsd(held);
              const itemCount = heldCartItemCount(held);
              return (
                <div
                  key={held.id}
                  className="bg-surface rounded-xl border border-slate-200 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-main truncate">{held.label}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDateTimeVE(held.savedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => setDeleteId(held.id)}
                      className="shrink-0 text-slate-400 hover:text-danger transition-colors cursor-pointer"
                      title="Eliminar"
                      aria-label={`Eliminar ${held.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
                    </span>
                    <span className="font-semibold text-brand-blue">{formatCurrency(totalUsd)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleRestoreClick(held.id)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Cargar
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={handleConfirmRestore}
        title="Reemplazar carrito"
        message={`El carrito actual tiene ${Object.keys(currentItems).length} línea(s). Al cargar «${confirmTarget?.label ?? ""}» se reemplazará el carrito actual. ¿Continuar?`}
        variant="success"
        confirmText="Reemplazar y cargar"
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget.id);
        }}
        title="Eliminar venta en espera"
        message={`¿Seguro que deseas eliminar «${deleteTarget?.label ?? ""}»? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </>
  );
}
