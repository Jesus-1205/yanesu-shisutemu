import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePosKeyboard } from "../../../../features/sales/hooks/usePosKeyboard";
import { useCartStore } from "../../../../features/sales/store/cartStore";


const mockToast = vi.fn();

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function createRef() {
  const input = document.createElement("input");
  document.body.appendChild(input);
  const ref = { current: input };
  return { input, ref };
}

afterEach(() => {
  document.body.querySelectorAll("input").forEach((el) => el.remove());
});

beforeEach(() => {
  vi.clearAllMocks();
  useCartStore.setState({ items: {}, snapshotTasa: 0 });
});

describe("usePosKeyboard", () => {
  it("F2 focuses the search input", async () => {
    const { input, ref } = createRef();
    const focusSpy = vi.spyOn(input, "focus");
    renderHook(() => usePosKeyboard(ref, vi.fn(), false, vi.fn()));
    await userEvent.keyboard("{F2}");
    expect(focusSpy).toHaveBeenCalled();
  });

  it("F9 clears cart and shows toast", async () => {
    const { ref } = createRef();
    useCartStore.setState({
      items: {
        "1_UNIDAD": {
          cartItemId: "1_UNIDAD", producto_id: 1, nombre: "X",
          tipo_empaque: "UNIDAD", cantidad: 1, unidades_por_caja: 12,
          unidades_descontadas: 1, precio_unidad_usd: 10, precio_caja_usd: 100,
          precio_unitario_usd: 10, iva_porcentaje: 16, tipo_iva: "GRAVADO",
        },
      },
    });
    const clearSpy = vi.spyOn(useCartStore.getState(), "clearCart");
    renderHook(() => usePosKeyboard(ref, vi.fn(), false, vi.fn()));
    await userEvent.keyboard("{F9}");
    expect(clearSpy).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Carrito vaciado", "success");
  });

  it("F10 calls onCheckout", async () => {
    const { ref } = createRef();
    const onCheckout = vi.fn();
    renderHook(() => usePosKeyboard(ref, onCheckout, false, vi.fn()));
    await userEvent.keyboard("{F10}");
    expect(onCheckout).toHaveBeenCalled();
  });

  it("Escape calls onCloseCheckout when checkout is open", async () => {
    const { ref } = createRef();
    const onCloseCheckout = vi.fn();
    renderHook(() => usePosKeyboard(ref, vi.fn(), true, onCloseCheckout));
    await userEvent.keyboard("{Escape}");
    expect(onCloseCheckout).toHaveBeenCalled();
  });

  it("Escape clears search input when focused", () => {
    const { input, ref } = createRef();
    renderHook(() => usePosKeyboard(ref, vi.fn(), false, vi.fn()));
    input.value = "whisky";
    input.focus();
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(input.value).toBe("");
  });

  it("removes event listener on unmount", () => {
    const { ref } = createRef();
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => usePosKeyboard(ref, vi.fn(), false, vi.fn()));
    expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});