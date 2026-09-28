import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PriceRuleFormModal } from "@/features/price-rules/components/PriceRuleFormModal";
import { api } from "@/services/api";
import type { PaymentMethodOut, PriceRuleOut } from "@/types/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethods: vi.fn(),
    getProducts: vi.fn(),
    createPriceRule: vi.fn(),
    updatePriceRule: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const mockMethods: PaymentMethodOut[] = [
  { id: 1, nombre: "Dólares Efectivo", moneda_default: "USD", acepta_referencia: false, activo: true },
];

const mockRule: PriceRuleOut = {
  id: 1,
  nombre: "Oferta Especial",
  descripcion: "Descripción previa",
  activo: true,
  products: [
    { id: 10, producto_id: 101, producto_nombre: "Cerveza", tipo_empaque: "UNIDAD", precio_usd: 1.5 },
  ],
  payment_methods: [
    { id: 20, metodo_pago_id: 1, metodo_pago_nombre: "Dólares Efectivo" },
  ],
};

describe("PriceRuleFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getPaymentMethods.mockResolvedValue(mockMethods);
    mockApi.getProducts.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
      pages: 0,
    });
  });

  it("renderiza modo creación cuando no hay initialRule", async () => {
    render(
      <PriceRuleFormModal
        open={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Nueva Regla de Precio" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej: Oferta Divisas Cerveza")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Crear Regla" })).toBeDisabled();
    await screen.findByText("Dólares Efectivo");
  });

  it("renderiza modo edición con initialRule prellenado", async () => {
    render(
      <PriceRuleFormModal
        open={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        initialRule={mockRule}
      />
    );

    expect(screen.getByRole("heading", { name: "Editar Regla de Precio" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej: Oferta Divisas Cerveza")).toHaveValue("Oferta Especial");
    expect(screen.getByRole("button", { name: "Guardar Cambios" })).not.toBeDisabled();
    await screen.findByText("Dólares Efectivo");
  });

  it("guarda cambios y llama a onSaved y onClose", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleSaved = vi.fn();
    mockApi.updatePriceRule.mockResolvedValueOnce(mockRule);

    render(
      <PriceRuleFormModal
        open={true}
        onClose={handleClose}
        onSaved={handleSaved}
        initialRule={mockRule}
      />
    );

    const submitBtn = screen.getByRole("button", { name: "Guardar Cambios" });
    await user.click(submitBtn);

    expect(mockApi.updatePriceRule).toHaveBeenCalledWith(1, {
      nombre: "Oferta Especial",
      descripcion: "Descripción previa",
      productos: [{ producto_id: 101, tipo_empaque: "UNIDAD", precio_usd: 1.5 }],
      metodo_pago_ids: [1],
    });
    expect(handleClose).toHaveBeenCalled();
    expect(handleSaved).toHaveBeenCalled();
  });
});
