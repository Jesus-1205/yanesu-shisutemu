import { useEffect, type RefObject } from "react";
import { useCartStore } from "../store/cartStore";
import { useToast } from "@/ui-components/Toast";

export function usePosKeyboard(
  searchRef: RefObject<HTMLInputElement | null>,
  onCheckout: () => void,
  checkoutOpen: boolean,
  onCloseCheckout: () => void,
) {
  const clearCart = useCartStore((s) => s.clearCart);
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if (e.key === "F9") {
        e.preventDefault();
        clearCart();
        toast("Carrito vaciado", "success");
        return;
      }

      if (e.key === "F10") {
        e.preventDefault();
        onCheckout();
        return;
      }

      if (e.key === "Escape") {
        if (checkoutOpen) {
          onCloseCheckout();
          return;
        }
        if (document.activeElement === searchRef.current) {
          (searchRef.current as HTMLInputElement).value = "";
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          )?.set;
          nativeInputValueSetter?.call(searchRef.current, "");
          searchRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchRef, onCheckout, checkoutOpen, onCloseCheckout, clearCart, toast]);
}
