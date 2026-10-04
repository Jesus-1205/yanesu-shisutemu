import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInvoiceSupplierModal } from "@/features/invoices/hooks/useInvoiceSupplierModal";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("useInvoiceSupplierModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceFormStore.getState().reset();
  });

  it("handles opening and closing the supplier modal", () => {
    const { result } = renderHook(() => useInvoiceSupplierModal());

    expect(result.current.supplierModalOpen).toBe(false);
    expect(result.current.supplierModalNombre).toBe("");

    act(() => {
      result.current.openSupplierModal("Polar");
    });

    expect(result.current.supplierModalOpen).toBe(true);
    expect(result.current.supplierModalNombre).toBe("Polar");

    act(() => {
      result.current.closeSupplierModal();
    });

    expect(result.current.supplierModalOpen).toBe(false);
  });

  it("handles newly created supplier and updates form store and toast", () => {
    const { result } = renderHook(() => useInvoiceSupplierModal());

    const newSupplier = {
      id: 42,
      nombre: "Distribuidora Caracas",
      telefono: "0414-1234567",
      email: "info@caracas.com",
    };

    act(() => {
      result.current.handleSupplierCreated(newSupplier);
    });

    expect(result.current.supplierCreated).toEqual(newSupplier);
    expect(useInvoiceFormStore.getState().proveedorId).toBe(42);
    expect(mockToast).toHaveBeenCalledWith('Proveedor "Distribuidora Caracas" creado', "success");
  });
});
