import { useCallback } from "react";
import type { CartItem } from "../store/cartStore";
import { useCartStore } from "../store/cartStore";

export function useCartItem(item: CartItem) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateEmpaque = useCartStore((s) => s.updateEmpaque);
  const removeItem = useCartStore((s) => s.removeItem);
  const toggleDivisas = useCartStore((s) => s.toggleDivisas);
  const snapshotTasa = useCartStore((s) => s.snapshotTasa);

  const isCombo = Boolean(item.combo_id && item.comboDetalle);

  const subtotalUsd = Math.round(item.cantidad * item.precio_unitario_usd * 100) / 100;
  const precioUnitarioVes = snapshotTasa > 0 ? item.precio_unitario_usd * snapshotTasa : 0;
  const subtotalVes = snapshotTasa > 0 ? subtotalUsd * snapshotTasa : 0;

  const hasDivisas = item.precioDivisasUnidad !== null || item.precioDivisasCaja !== null;
  const precioDivisasActual =
    item.tipo_empaque === "UNIDAD"
      ? item.precioDivisasUnidad
      : item.precioDivisasCaja;

  const handleIncrement = useCallback(() => {
    updateQuantity(item.cartItemId, item.cantidad + 1);
  }, [updateQuantity, item.cartItemId, item.cantidad]);

  const handleDecrement = useCallback(() => {
    updateQuantity(item.cartItemId, item.cantidad - 1);
  }, [updateQuantity, item.cartItemId, item.cantidad]);

  const handleQuantityChange = useCallback(
    (qty: number) => {
      if (!isNaN(qty)) {
        updateQuantity(item.cartItemId, qty);
      }
    },
    [updateQuantity, item.cartItemId]
  );

  const handleEmpaqueChange = useCallback(
    (empaque: "UNIDAD" | "CAJA") => {
      updateEmpaque(item.cartItemId, empaque);
    },
    [updateEmpaque, item.cartItemId]
  );

  const handleRemove = useCallback(() => {
    removeItem(item.cartItemId);
  }, [removeItem, item.cartItemId]);

  const handleToggleDivisas = useCallback(() => {
    toggleDivisas(item.cartItemId);
  }, [toggleDivisas, item.cartItemId]);

  const variantNames = item.comboDetalle?.productos.map((p) => p.nombre).join(" + ") ?? "";

  return {
    isCombo,
    subtotalUsd,
    precioUnitarioVes,
    subtotalVes,
    snapshotTasa,
    hasDivisas,
    precioDivisasActual,
    variantNames,
    onIncrement: handleIncrement,
    onDecrement: handleDecrement,
    onQuantityChange: handleQuantityChange,
    onEmpaqueChange: handleEmpaqueChange,
    onRemove: handleRemove,
    onToggleDivisas: handleToggleDivisas,
  };
}
