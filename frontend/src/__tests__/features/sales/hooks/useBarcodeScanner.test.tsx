import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBarcodeScanner } from "../../../../features/sales/hooks/useBarcodeScanner";
import { useCartStore } from "../../../../features/sales/store/cartStore";
import type { ProductOut } from "../../../../types/api";
import { api } from "../../../../services/api";

const mockToast = vi.fn();
const mockOnBarcodeScan = vi.fn();

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/services/api", () => ({
  api: {
    getProducts: vi.fn(),
  },
}));

function createRef() {
  const input = document.createElement("input");
  document.body.appendChild(input);
  const ref = { current: input };
  return { input, ref };
}

function makeProduct(overrides: Partial<ProductOut> = {}): ProductOut {
  return {
    id: 1,
    nombre: "Producto Test",
    codigo_barra: "7501234567890",
    categories: [],
    unidades_por_caja: 12,
    stock_cajas: 5,
    stock_unidades: 50,
    stock_minimo: 5,
    precio_costo_caja_usd: 80,
    precio_costo_usd: 7,
    precio_unidad_usd: 10,
    precio_caja_usd: 100,
    precio_sugerido_unidad_usd: 12,
    precio_sugerido_caja_usd: 120,
    proveedor_id: null,
    tipo_iva: "GRAVADO",
    es_favorito: false,
    precio_divisas_unidad: null,
    precio_divisas_caja: null,
    ...overrides,
  };
}

function scanBarcode(code: string) {
  const chars = code.split("");
  const startTime = Date.now();

  for (let i = 0; i < chars.length; i++) {
    const event = new KeyboardEvent("keydown", {
      key: chars[i],
      bubbles: true,
      cancelable: true,
    });
    vi.spyOn(Date, "now").mockReturnValue(startTime + i * 5);
    document.dispatchEvent(event);
  }

  const enterEvent = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  });
  vi.spyOn(Date, "now").mockReturnValue(startTime + chars.length * 5);
  document.dispatchEvent(enterEvent);
}

function typeSlowly(code: string) {
  const chars = code.split("");
  const startTime = Date.now();

  for (let i = 0; i < chars.length; i++) {
    const event = new KeyboardEvent("keydown", {
      key: chars[i],
      bubbles: true,
      cancelable: true,
    });
    vi.spyOn(Date, "now").mockReturnValue(startTime + i * 150);
    document.dispatchEvent(event);
  }

  const enterEvent = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  });
  vi.spyOn(Date, "now").mockReturnValue(startTime + chars.length * 150);
  document.dispatchEvent(enterEvent);
}

afterEach(() => {
  document.body.querySelectorAll("input").forEach((el) => el.remove());
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  useCartStore.setState({ items: {}, snapshotTasa: 0 });
  vi.mocked(api.getProducts).mockReset();
});

describe("useBarcodeScanner", () => {
  it("adds product to cart on fast scan", async () => {
    const product = makeProduct();
    vi.mocked(api.getProducts).mockResolvedValue({
      items: [product],
      total: 1,
      page: 1,
      page_size: 5,
      pages: 1,
    });

    const { ref } = createRef();
    const addItem = vi.fn();
    renderHook(() => useBarcodeScanner(addItem, ref, false, mockOnBarcodeScan));

    scanBarcode("7501234567890");

    await vi.waitFor(() => {
      expect(api.getProducts).toHaveBeenCalledWith({
        search: "7501234567890",
        page_size: 5,
      });
    });

    await vi.waitFor(() => {
      expect(addItem).toHaveBeenCalledWith(product, "UNIDAD");
    });

    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        "Producto agregado: Producto Test",
        "success",
      );
    });
  });

  it("shows error toast when product not found", async () => {
    vi.mocked(api.getProducts).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 5,
      pages: 0,
    });

    const { ref } = createRef();
    const addItem = vi.fn();
    renderHook(() => useBarcodeScanner(addItem, ref, false, mockOnBarcodeScan));

    scanBarcode("9999999999999");

    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        "Producto no encontrado: 9999999999999",
        "error",
      );
    });

    expect(addItem).not.toHaveBeenCalled();
  });

  it("does NOT trigger on slow human typing", async () => {
    const { ref } = createRef();
    const addItem = vi.fn();
    renderHook(() => useBarcodeScanner(addItem, ref, false, mockOnBarcodeScan));

    typeSlowly("7501234567890");

    await new Promise((r) => setTimeout(r, 50));

    expect(api.getProducts).not.toHaveBeenCalled();
    expect(addItem).not.toHaveBeenCalled();
  });

  it("calls onBarcodeScan on successful scan", async () => {
    const product = makeProduct();
    vi.mocked(api.getProducts).mockResolvedValue({
      items: [product],
      total: 1,
      page: 1,
      page_size: 5,
      pages: 1,
    });

    const { ref } = createRef();
    const addItem = vi.fn();
    renderHook(() => useBarcodeScanner(addItem, ref, false, mockOnBarcodeScan));

    scanBarcode("7501234567890");

    await vi.waitFor(() => {
      expect(mockOnBarcodeScan).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(addItem).toHaveBeenCalledWith(product, "UNIDAD");
    });
  });

  it("does not match product with different barcode", async () => {
    const product = makeProduct({ codigo_barra: "1111111111111" });
    vi.mocked(api.getProducts).mockResolvedValue({
      items: [product],
      total: 1,
      page: 1,
      page_size: 5,
      pages: 1,
    });

    const { ref } = createRef();
    const addItem = vi.fn();
    renderHook(() => useBarcodeScanner(addItem, ref, false, mockOnBarcodeScan));

    scanBarcode("7501234567890");

    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        "Producto no encontrado: 7501234567890",
        "error",
      );
    });

    expect(addItem).not.toHaveBeenCalled();
  });

  it("does NOT scan when checkout is open", async () => {
    const product = makeProduct();
    vi.mocked(api.getProducts).mockResolvedValue({
      items: [product],
      total: 1,
      page: 1,
      page_size: 5,
      pages: 1,
    });

    const { ref } = createRef();
    const addItem = vi.fn();
    renderHook(() => useBarcodeScanner(addItem, ref, true, mockOnBarcodeScan));

    scanBarcode("7501234567890");

    await new Promise((r) => setTimeout(r, 50));

    expect(api.getProducts).not.toHaveBeenCalled();
    expect(addItem).not.toHaveBeenCalled();
  });

  it("cleans up event listener on unmount", () => {
    const { ref } = createRef();
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useBarcodeScanner(vi.fn(), ref, false, mockOnBarcodeScan));

    expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function), true);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
      true,
    );
  });
});
