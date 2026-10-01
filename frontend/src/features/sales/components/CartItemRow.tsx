import { memo } from "react";
import type { CartItem } from "../store/cartStore";
import { useCartItem } from "../hooks/useCartItem";
import { CartItemCombo } from "./CartItemCombo";
import { CartItemProduct } from "./CartItemProduct";

interface CartItemRowProps {
  item: CartItem;
}

export default memo(function CartItemRow({ item }: CartItemRowProps) {
  const {
    isCombo,
    subtotalUsd,
    precioUnitarioVes,
    subtotalVes,
    snapshotTasa,
    hasDivisas,
    precioDivisasActual,
    variantNames,
    onIncrement,
    onDecrement,
    onQuantityChange,
    onEmpaqueChange,
    onRemove,
    onToggleDivisas,
  } = useCartItem(item);

  if (isCombo) {
    return (
      <CartItemCombo
        item={item}
        subtotalUsd={subtotalUsd}
        precioUnitarioVes={precioUnitarioVes}
        subtotalVes={subtotalVes}
        snapshotTasa={snapshotTasa}
        variantNames={variantNames}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onQuantityChange={onQuantityChange}
        onRemove={onRemove}
      />
    );
  }

  return (
    <CartItemProduct
      item={item}
      subtotalUsd={subtotalUsd}
      precioUnitarioVes={precioUnitarioVes}
      subtotalVes={subtotalVes}
      snapshotTasa={snapshotTasa}
      hasDivisas={hasDivisas}
      precioDivisasActual={precioDivisasActual}
      onIncrement={onIncrement}
      onDecrement={onDecrement}
      onQuantityChange={onQuantityChange}
      onEmpaqueChange={onEmpaqueChange}
      onRemove={onRemove}
      onToggleDivisas={onToggleDivisas}
    />
  );
});
