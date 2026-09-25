import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInvoiceAI } from "@/features/invoices/hooks/useInvoiceAI";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";
import { api } from "@/services/api";
import type { InvoiceAnalysisOut } from "@/types/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    analyzeInvoice: vi.fn(),
  },
}));

describe("useInvoiceAI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceFormStore.getState().reset();
  });

  it("shows error toast if analyzing without files", async () => {
    const { result } = renderHook(() => useInvoiceAI());

    await act(async () => {
      await result.current.handleAnalyzeImage();
    });

    expect(mockToast).toHaveBeenCalledWith("Sube una imagen primero para analizar con IA", "error");
    expect(result.current.aiState).toBe("idle");
  });

  it("analyzes files and updates state when files are present", async () => {
    const file = new File(["dummy"], "factura.png", { type: "image/png" });
    useInvoiceFormStore.getState().setField("invoiceFiles", [file]);

    const mockAnalysis: InvoiceAnalysisOut = {
      proveedor_nombre: "Distribuidora Polar",
      numero_factura: "FAC-888",
      fecha_factura: "2026-08-10",
      fecha_limite_pago: null,
      moneda: "USD",
      tipo_documento: "FACTURA",
      productos: [
        {
          nombre: "Cerveza Polar Pilsen",
          cantidad: 10,
          precio_unitario: 15,
          tipo_empaque: "CAJA",
        },
      ],
      raw_json_ia: { foo: "bar" },
    };

    vi.mocked(api.analyzeInvoice).mockResolvedValue(mockAnalysis);

    const { result } = renderHook(() => useInvoiceAI());

    await act(async () => {
      await result.current.handleAnalyzeImage();
    });

    expect(api.analyzeInvoice).toHaveBeenCalledWith([file]);
    expect(result.current.aiState).toBe("reviewing");
    expect(result.current.aiAnalysis).toEqual(mockAnalysis);
    expect(result.current.aiRawJsonIa).toEqual({ foo: "bar" });
    expect(mockToast).toHaveBeenCalledWith("IA: 1 productos extraídos", "success");
  });

  it("handles cancel and reset correctly", () => {
    const { result } = renderHook(() => useInvoiceAI());

    act(() => {
      result.current.handleCancelAiReview();
    });
    expect(result.current.aiState).toBe("idle");
    expect(result.current.aiAnalysis).toBeNull();

    act(() => {
      result.current.resetAi();
    });
    expect(result.current.aiState).toBe("idle");
    expect(result.current.aiRawJsonIa).toBeNull();
  });
});
