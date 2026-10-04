import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CategoriesPage from "../../../features/categories/pages/CategoriesPage";

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={["/categories"]}>{children}</MemoryRouter>;
}

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  api: {
    getCategories: vi.fn(),
    getCategoriesPaginated: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

import { api } from "@/services/api";
import { exportToExcel } from "@/lib/exportToExcel";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CategoriesPage", () => {
  it("shows loading skeleton initially", () => {
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    render(<CategoriesPage />, { wrapper });
    // Table shows skeleton rows when loading
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.queryByText("Licores")).not.toBeInTheDocument();
  });

  it("renders categories table with data", async () => {
    const mockCategories = [
      { id: 1, nombre: "Licores", descripcion: "Bebidas alcohólicas" },
      { id: 2, nombre: "Vinos", descripcion: "Vinos y espumosos" },
    ];
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ items: mockCategories, total: 2, page: 1, page_size: 20, pages: 1 });
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Licores")).toBeInTheDocument());
    expect(screen.getByText("Vinos")).toBeInTheDocument();
    expect(screen.getByText("Bebidas alcohólicas")).toBeInTheDocument();
  });

  it("shows empty state when no categories", async () => {
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ items: [], total: 0, page: 1, page_size: 20, pages: 0 });
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("No hay categorías registradas")).toBeInTheDocument());
  });

  it("filters categories by search input", async () => {
    const getCategoriesPaginated = api.getCategoriesPaginated as ReturnType<typeof vi.fn>;
    getCategoriesPaginated.mockResolvedValue({ items: [{ id: 1, nombre: "Licores", descripcion: null }], total: 1, page: 1, page_size: 20, pages: 1 });
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Licores")).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText("Buscar categoría por nombre o descripción..."), "vino");
    await waitFor(() => {
      expect(getCategoriesPaginated).toHaveBeenLastCalledWith(expect.objectContaining({ search: "vino" }));
    });
  });

  it("clears search and refetches all categories", async () => {
    const getCategoriesPaginated = api.getCategoriesPaginated as ReturnType<typeof vi.fn>;
    getCategoriesPaginated.mockResolvedValue({ items: [{ id: 1, nombre: "Licores", descripcion: null }], total: 1, page: 1, page_size: 20, pages: 1 });
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Licores")).toBeInTheDocument());
    const searchInput = screen.getByPlaceholderText("Buscar categoría por nombre o descripción...");
    await userEvent.type(searchInput, "vino");
    await waitFor(() => {
      expect(getCategoriesPaginated).toHaveBeenLastCalledWith(expect.objectContaining({ search: "vino" }));
    });
    await userEvent.clear(searchInput);
    await waitFor(() => {
      expect(getCategoriesPaginated).toHaveBeenLastCalledWith(expect.not.objectContaining({ search: "vino" }));
    });
  });

  it("shows error banner when fetch fails", async () => {
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Error de red"));
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Error de red")).toBeInTheDocument());
  });

  it("opens create modal on new category button click", async () => {
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ items: [], total: 0, page: 1, page_size: 20, pages: 0 });
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByRole("button", { name: "Nueva Categoría" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Nueva Categoría" }));
    expect(screen.getAllByText(/Nueva Categoría/).length).toBeGreaterThanOrEqual(2);
  });

  it("opens delete confirm dialog on delete button click", async () => {
    const mockCategories = [{ id: 1, nombre: "Licores", descripcion: "Desc" }];
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ items: mockCategories, total: 1, page: 1, page_size: 20, pages: 1 });
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Licores")).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "" });
    await userEvent.click(deleteButtons[1]);
    await waitFor(() => expect(screen.getByText('¿Estás seguro de eliminar "Licores"?')).toBeInTheDocument());
  });

  it("calls deleteCategory on confirm", async () => {
    const mockCategories = [{ id: 1, nombre: "Licores", descripcion: "Desc" }];
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ items: mockCategories, total: 1, page: 1, page_size: 20, pages: 1 });
    (api.deleteCategory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Licores")).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "" });
    await userEvent.click(deleteButtons[1]);
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(api.deleteCategory).toHaveBeenCalledWith(1));
  });

  it("opens edit modal on edit button click", async () => {
    const mockCategories = [{ id: 1, nombre: "Licores", descripcion: "Desc" }];
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ items: mockCategories, total: 1, page: 1, page_size: 20, pages: 1 });
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Licores")).toBeInTheDocument());
    const editButtons = screen.getAllByRole("button", { name: "" });
    await userEvent.click(editButtons[0]);
    await waitFor(() => expect(screen.getByText("Editar Categoría")).toBeInTheDocument());
    expect(screen.getByLabelText("Nombre")).toHaveValue("Licores");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Desc");
  });

  it("renders download excel button", async () => {
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ items: [], total: 0, page: 1, page_size: 20, pages: 0 });
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
  });

  it("exports all categories to excel on button click", async () => {
    const mockCategories = [
      { id: 1, nombre: "Licores", descripcion: "Bebidas alcoholicas" },
      { id: 2, nombre: "Vinos", descripcion: null },
    ];
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValue({ items: mockCategories, total: 2, page: 1, page_size: 20, pages: 1 });
    (api.getCategories as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockCategories);
    render(<CategoriesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      expect(api.getCategories).toHaveBeenCalled();
      expect(exportToExcel).toHaveBeenCalledWith({
        data: mockCategories,
        columns: expect.arrayContaining([
          expect.objectContaining({ header: "Nombre" }),
          expect.objectContaining({ header: "Descripción" }),
        ]),
        filename: "Categorias",
      });
    });
  });
});