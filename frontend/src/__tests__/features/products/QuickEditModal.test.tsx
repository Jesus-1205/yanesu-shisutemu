import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import QuickEditModal from "../../../features/products/components/QuickEditModal";
import type { Product } from "../../../types/api";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

vi.mock("../../../services/api", () => ({
  api: { updateProduct: vi.fn().mockResolvedValue({}) },
}));

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const product: Product = {
  id: 1,
  codigo_barra: "ABC123",
  nombre: "Whisky Premium",
  categories: [{ id: 1, nombre: "Licores", descripcion: null }],
  unidades_por_caja: 12,
  stock_unidades: 50,
  stock_minimo: 5,
  precio_costo_caja_usd: 96,
  precio_costo_usd: 8,
  precio_unidad_usd: 15,
  precio_caja_usd: 150,
  precio_sugerido_unidad_usd: 11.43,
  precio_sugerido_caja_usd: 137.14,
  proveedor_id: null,
  tipo_iva: "GRAVADO",
};

describe("QuickEditModal", () => {
  it("renders nothing when closed", () => {
    renderWithRouter(<QuickEditModal open={false} onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.queryByText("Editar Producto")).not.toBeInTheDocument();
  });

  it("renders product name and code when open", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Whisky Premium")).toBeInTheDocument();
    expect(screen.getByText(/Código: ABC123/)).toBeInTheDocument();
  });

  it("renders form inputs", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Stock (uds)")).toBeInTheDocument();
    expect(screen.getByText("Costo caja USD")).toBeInTheDocument();
    expect(screen.getByText("Precio unidad USD")).toBeInTheDocument();
  });

  it("renders margin and suggested price", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Margen")).toBeInTheDocument();
    expect(screen.getByText("Precio sugerido USD")).toBeInTheDocument();
  });

  it("shows Cancelar and Guardar Cambios buttons", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
    expect(screen.getByText("Guardar Cambios")).toBeInTheDocument();
  });

  it("shows link to full edit page", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Edición completa →")).toBeInTheDocument();
  });

  it("calls onClose when Cancelar clicked", async () => {
    const onClose = vi.fn();
    renderWithRouter(<QuickEditModal open onClose={onClose} onSaved={vi.fn()} product={product} />);
    await userEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when form submitted with no changes", async () => {
    const onClose = vi.fn();
    const { api } = await import("../../../services/api");
    renderWithRouter(<QuickEditModal open onClose={onClose} onSaved={vi.fn()} product={product} />);
    await userEvent.click(screen.getByText("Guardar Cambios"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.updateProduct).not.toHaveBeenCalled();
  });

  it("submits changed stock value", async () => {
    const onSaved = vi.fn();
    const { api } = await import("../../../services/api");
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={onSaved} product={product} />);

    const stockInput = screen.getByLabelText("Stock (uds)");
    await userEvent.clear(stockInput);
    await userEvent.type(stockInput, "60");

    await userEvent.click(screen.getByText("Guardar Cambios"));

    await waitFor(() => {
      expect(api.updateProduct).toHaveBeenCalledWith(1, { stock_unidades: 60 });
    });
    expect(onSaved).toHaveBeenCalled();
  });
});