import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import PriceRulesPage from "../../../features/price-rules/pages/PriceRulesPage";
import { ToastProvider } from "../../../ui-components/Toast";
import { api } from "../../../services/api";
import type { PriceRuleOut, PaymentMethodOut } from "../../../types/api";

const mockMethods: PaymentMethodOut[] = [
  { id: 1, nombre: "Dólares Efectivo", moneda_default: "USD", acepta_referencia: false, activo: true },
  { id: 2, nombre: "Zelle", moneda_default: "USD", acepta_referencia: true, activo: true },
];

const mockRule: PriceRuleOut = {
  id: 1,
  nombre: "Descuento Efectivo Ron",
  descripcion: "Precio especial en efectivo",
  activo: true,
  products: [
    {
      id: 10,
      producto_id: 101,
      producto_nombre: "Ron Añejo 1L",
      tipo_empaque: "UNIDAD",
      precio_usd: 10.5,
    },
  ],
  payment_methods: [
    {
      id: 20,
      metodo_pago_id: 1,
      metodo_pago_nombre: "Dólares Efectivo",
    },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PriceRulesPage", () => {
  it("renders price rules table with products and payment methods", async () => {
    vi.spyOn(api, "getPriceRules").mockResolvedValue([mockRule]);
    vi.spyOn(api, "getPaymentMethods").mockResolvedValue(mockMethods);

    render(
      <ToastProvider>
        <PriceRulesPage />
      </ToastProvider>,
    );

    expect(screen.getByText("Reglas de Precio (Divisas)")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Descuento Efectivo Ron")).toBeInTheDocument();
      expect(screen.getByText("Precio especial en efectivo")).toBeInTheDocument();
      expect(screen.getByText("Ron Añejo 1L")).toBeInTheDocument();
      expect(screen.getByText("Und")).toBeInTheDocument();
      expect(screen.getByText("$10,50")).toBeInTheDocument();
      expect(screen.getByText("Dólares Efectivo")).toBeInTheDocument();
      expect(screen.getByText("1 regla activa")).toBeInTheDocument();
    });
  });

  it("opens create modal and saves a new price rule", async () => {
    vi.spyOn(api, "getPriceRules").mockResolvedValue([]);
    vi.spyOn(api, "getPaymentMethods").mockResolvedValue(mockMethods);
    vi.spyOn(api, "getProducts").mockResolvedValue({
      items: [
        {
          id: 101,
          codigo_barra: "111",
          nombre: "Ron Añejo 1L",
          categories: [],
          unidades_por_caja: 1,
          stock_cajas: 0,
          stock_unidades: 10,
          stock_minimo: 1,
          precio_costo_caja_usd: 5,
          precio_costo_usd: 5,
          precio_unidad_usd: 12,
          precio_caja_usd: 12,
          precio_sugerido_unidad_usd: 12,
          precio_sugerido_caja_usd: 12,
          proveedor_id: null,
          tipo_iva: "GRAVADO",
          es_favorito: false,
          precio_divisas_unidad: null,
          precio_divisas_caja: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 10,
      pages: 1,
    });
    vi.spyOn(api, "createPriceRule").mockResolvedValue(mockRule);

    render(
      <ToastProvider>
        <PriceRulesPage />
      </ToastProvider>,
    );

    const newRuleBtn = screen.getByRole("button", { name: /Nueva Regla/i });
    fireEvent.click(newRuleBtn);

    await waitFor(() => {
      expect(screen.getByText("Nueva Regla de Precio")).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText("Ej: Oferta Divisas Cerveza");
    fireEvent.change(nameInput, { target: { value: "Promo Zelle" } });

    const addProductBtn = screen.getByText("Agregar Producto");
    fireEvent.click(addProductBtn);

    const priceInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(priceInput, { target: { value: "11.00" } });

    fireEvent.click(screen.getByText("Dólares Efectivo"));

    const submitBtn = screen.getByRole("button", { name: "Crear Regla" });
    expect(submitBtn).toBeDisabled(); // disabled because product is not selected yet

    fireEvent.click(screen.getByText("Cancelar"));
  });

  it("opens edit modal and updates an existing price rule", async () => {
    vi.spyOn(api, "getPriceRules").mockResolvedValue([mockRule]);
    vi.spyOn(api, "getPaymentMethods").mockResolvedValue(mockMethods);
    const updateSpy = vi.spyOn(api, "updatePriceRule").mockResolvedValue(mockRule);

    render(
      <ToastProvider>
        <PriceRulesPage />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Descuento Efectivo Ron")).toBeInTheDocument();
    });

    const editBtn = screen.getByLabelText("Editar regla");
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Editar Regla de Precio")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Descuento Efectivo Ron");
    fireEvent.change(nameInput, { target: { value: "Descuento Ron Actualizado" } });

    const submitBtn = screen.getByRole("button", { name: "Guardar Cambios" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          nombre: "Descuento Ron Actualizado",
        }),
      );
    });
  });

  it("deletes a price rule through confirmation dialog", async () => {
    vi.spyOn(api, "getPriceRules").mockResolvedValue([mockRule]);
    vi.spyOn(api, "getPaymentMethods").mockResolvedValue(mockMethods);
    const deleteSpy = vi.spyOn(api, "deletePriceRule").mockResolvedValue();

    render(
      <ToastProvider>
        <PriceRulesPage />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Descuento Efectivo Ron")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByLabelText("Eliminar regla");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Eliminar regla de precio")).toBeInTheDocument();
    });

    const confirmDeleteBtn = screen.getByRole("button", { name: "Eliminar" });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(1);
    });
  });
});
