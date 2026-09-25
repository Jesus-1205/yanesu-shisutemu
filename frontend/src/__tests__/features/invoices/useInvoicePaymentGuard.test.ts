import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useInvoicePaymentGuard } from "@/features/invoices/hooks/useInvoicePaymentGuard";
import type { FacturaOut } from "@/types/api";

const mockNavigate = vi.fn();
const mockToast = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("useInvoicePaymentGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing if invoice is pending or partial", () => {
    const invoice = { id: 1, estado_pago: "PENDIENTE" } as FacturaOut;
    renderHook(() => useInvoicePaymentGuard({ invoice, invoiceId: "1" }));

    expect(mockToast).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("redirects and shows toast if invoice is already PAGADA", () => {
    const invoice = { id: 1, estado_pago: "PAGADA" } as FacturaOut;
    renderHook(() => useInvoicePaymentGuard({ invoice, invoiceId: "1" }));

    expect(mockToast).toHaveBeenCalledWith("Esta factura ya está pagada", "info");
    expect(mockNavigate).toHaveBeenCalledWith("/invoices/1", { replace: true });
  });
});
