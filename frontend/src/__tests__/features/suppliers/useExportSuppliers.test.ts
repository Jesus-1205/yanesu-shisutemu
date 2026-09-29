import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExportSuppliers } from "@/features/suppliers/hooks/useExportSuppliers";
import { api } from "@/services/api";
import { exportToExcel } from "@/lib/exportToExcel";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getSuppliers: vi.fn(),
  },
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useExportSuppliers", () => {
  it("exports all suppliers to excel successfully", async () => {
    const mockSuppliers = [
      { id: 1, nombre: "Polar", telefono: "04141234567", email: "p@p.com" },
      { id: 2, nombre: "Santa Teresa", telefono: null, email: null },
    ];
    (api.getSuppliers as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSuppliers);
    (exportToExcel as ReturnType<typeof vi.fn>).mockReturnValueOnce("Proveedores.xlsx");

    const { result } = renderHook(() => useExportSuppliers());

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(api.getSuppliers).toHaveBeenCalledTimes(1);
    expect(exportToExcel).toHaveBeenCalledWith({
      data: mockSuppliers,
      columns: [
        { key: "nombre", header: "Nombre" },
        { key: "telefono", header: "Teléfono" },
        { key: "email", header: "Email" },
      ],
      filename: "Proveedores",
    });
    expect(mockToast).toHaveBeenCalledWith("Archivo descargado: Proveedores.xlsx", "success");
  });

  it("handles export error and shows toast", async () => {
    (api.getSuppliers as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network failure"),
    );

    const { result } = renderHook(() => useExportSuppliers());

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(mockToast).toHaveBeenCalledWith("Error al exportar proveedores", "error");
  });
});
