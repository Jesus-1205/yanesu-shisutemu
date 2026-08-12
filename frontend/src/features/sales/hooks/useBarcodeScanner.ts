import { useEffect, useRef, type RefObject } from "react";
import { api } from "@/services/api";
import type { ProductOut } from "@/types/api";
import { useToast } from "@/ui-components/Toast";

const SCANNER_THRESHOLD_MS = 80;

export function useBarcodeScanner(
  addItem: (product: ProductOut, tipo: "UNIDAD") => void,
  searchRef: RefObject<HTMLInputElement | null>,
  checkoutOpen: boolean,
) {
  const { toast } = useToast();
  const addItemRef = useRef(addItem);
  addItemRef.current = addItem;
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const scanningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const checkoutOpenRef = useRef(checkoutOpen);
  checkoutOpenRef.current = checkoutOpen;

  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;

    const processBarcode = async (code: string) => {
      if (scanningRef.current) return;
      scanningRef.current = true;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const data = await api.getProducts({ search: code, page_size: 5 });
        if (controller.signal.aborted) return;

        const match = data.items.find(
          (p) => p.codigo_barra?.trim() === code,
        );

        if (match) {
          addItemRef.current(match, "UNIDAD");
          toastRef.current(
            `Producto agregado: ${match.nombre}`,
            "success",
          );
          if (
            document.activeElement === searchRef.current &&
            searchRef.current
          ) {
            searchRef.current.value = "";
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value",
            )?.set;
            setter?.call(searchRef.current, "");
            searchRef.current.dispatchEvent(
              new Event("input", { bubbles: true }),
            );
          }
        } else {
          toastRef.current(
            `Producto no encontrado: ${code}`,
            "error",
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          toastRef.current("Error al buscar producto", "error");
        }
      } finally {
        if (!controller.signal.aborted) {
          scanningRef.current = false;
        }
      }
    };

    const handler = (e: KeyboardEvent) => {
      if (e.key.length === 1) {
        const now = Date.now();
        if (now - lastKeyTime > SCANNER_THRESHOLD_MS) {
          buffer = "";
        }
        buffer += e.key;
        lastKeyTime = now;
        return;
      }

      if (e.key === "Enter") {
        const now = Date.now();
        const elapsed = now - lastKeyTime;
        const code = buffer.trim();
        buffer = "";

        if (code && elapsed <= SCANNER_THRESHOLD_MS && !checkoutOpenRef.current) {
          e.preventDefault();
          e.stopPropagation();
          processBarcode(code);
        }
        return;
      }

      buffer = "";
    };

    document.addEventListener("keydown", handler, true);
    return () => {
      document.removeEventListener("keydown", handler, true);
      abortRef.current?.abort();
    };
  }, [searchRef]);
}
