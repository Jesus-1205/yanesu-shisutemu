import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExportCategories } from "@/features/categories/hooks/useExportCategories";
import { api } from "@/services/api";
import { exportToExcel } from "@/lib/exportToExcel";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getCategories: vi.fn(),
  },
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useExportCategories", () => {
  it("exports all categories to excel successfully", async () => {
    const mockCategories = [
      { id: 1, nombre: "Licores", descripcion: "Desc 1" },
      { id: 2, nombre: "Vinos", descripcion: null },
    ];
    (api.getCategories as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockCategories);
    (exportToExcel as ReturnType<typeof vi.fn>).mockReturnValueOnce("Categorias.xlsx");

    const { result } = renderHook(() => useExportCategories());

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(api.getCategories).toHaveBeenCalledTimes(1);
    expect(exportToExcel).toHaveBeenCalledWith({
      data: mockCategories,
      columns: [
        { key: "nombre", header: "Nombre" },
        { key: "descripcion", header: "Descripción" },
      ],
      filename: "Categorias",
    });
    expect(mockToast).toHaveBeenCalledWith("Archivo descargado: Categorias.xlsx", "success");
  });

  it("handles export error and shows toast", async () => {
    (api.getCategories as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network failure"),
    );

    const { result } = renderHook(() => useExportCategories());

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(mockToast).toHaveBeenCalledWith("Error al exportar categorias", "error");
  });
});
