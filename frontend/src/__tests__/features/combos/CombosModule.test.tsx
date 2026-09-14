import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCombos } from "../../../features/combos/hooks/useCombos";
import { useComboForm } from "../../../features/combos/hooks/useComboForm";
import CombosTable from "../../../features/combos/components/CombosTable";
import ComboFormModal from "../../../features/combos/components/ComboFormModal";
import CombosPage from "../../../features/combos/pages/CombosPage";
import { ToastProvider } from "../../../ui-components/Toast";
import { api } from "../../../services/api";
import React from "react";
import type { ComboOut, PaymentMethodOut } from "../../../types/api";

const mockPaymentMethods: PaymentMethodOut[] = [
  { id: 1, nombre: "Efectivo USD", moneda_default: "USD", acepta_referencia: false, activo: true },
  { id: 2, nombre: "Punto de Venta", moneda_default: "VES", acepta_referencia: true, activo: true },
];

const mockCombo1: ComboOut = {
  id: 1,
  nombre: "Combo Parrillero",
  descripcion: "Ideal para fin de semana",
  precio_total_usd: 25.0,
  metodo_pago_ids: [1],
  activo: true,
  groups: [
    {
      id: 10,
      nombre: "Bebidas",
      min_cantidad: 2,
      max_cantidad: 4,
      products: [
        { id: 101, producto_id: 1, producto_nombre: "Cerveza Polar" },
        { id: 102, producto_id: 2, producto_nombre: "Refresco" },
      ],
    },
  ],
};

const toastWrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(ToastProvider, null, children)
);

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useCombos hook", () => {
  it("fetches combos and payment methods and manages create, update, delete", async () => {
    vi.spyOn(api, "getCombos").mockResolvedValue([mockCombo1]);
    vi.spyOn(api, "getPaymentMethods").mockResolvedValue(mockPaymentMethods);
    vi.spyOn(api, "createCombo").mockResolvedValue(mockCombo1);
    vi.spyOn(api, "updateCombo").mockResolvedValue(mockCombo1);
    vi.spyOn(api, "deleteCombo").mockResolvedValue();

    const { result } = renderHook(() => useCombos(), { wrapper: toastWrapper });

    await act(async () => {
      await result.current.fetchCombos();
      await result.current.loadPaymentMethods();
    });

    expect(result.current.combos).toHaveLength(1);
    expect(result.current.paymentMethods).toHaveLength(2);
    expect(result.current.loading).toBe(false);

    let ok = false;
    await act(async () => {
      ok = await result.current.createCombo({
        nombre: "Nuevo",
        precio_total_usd: 10,
        grupos: [],
        metodo_pago_ids: [1],
      });
    });
    expect(ok).toBe(true);

    await act(async () => {
      ok = await result.current.updateCombo(1, {
        nombre: "Editado",
        precio_total_usd: 15,
        grupos: [],
        metodo_pago_ids: [1],
      });
    });
    expect(ok).toBe(true);

    await act(async () => {
      ok = await result.current.deleteCombo(1);
    });
    expect(ok).toBe(true);
  });

  it("handles errors gracefully on fetch, create, update, and delete", async () => {
    vi.spyOn(api, "getCombos").mockRejectedValue(new Error("Fetch failed"));
    vi.spyOn(api, "createCombo").mockRejectedValue(new Error("Create failed"));
    vi.spyOn(api, "updateCombo").mockRejectedValue(new Error("Update failed"));
    vi.spyOn(api, "deleteCombo").mockRejectedValue(new Error("Delete failed"));

    const { result } = renderHook(() => useCombos(), { wrapper: toastWrapper });

    await act(async () => {
      await result.current.fetchCombos();
    });

    expect(result.current.error).toBe("Fetch failed");

    let ok = true;
    await act(async () => {
      ok = await result.current.createCombo({
        nombre: "Test",
        precio_total_usd: 10,
        grupos: [],
        metodo_pago_ids: [1],
      });
    });
    expect(ok).toBe(false);

    await act(async () => {
      ok = await result.current.updateCombo(1, {
        nombre: "Test",
        precio_total_usd: 10,
        grupos: [],
        metodo_pago_ids: [1],
      });
    });
    expect(ok).toBe(false);

    await act(async () => {
      ok = await result.current.deleteCombo(1);
    });
    expect(ok).toBe(false);
  });
});

describe("useComboForm hook", () => {
  it("initializes empty and populates with resetForm", () => {
    const { result } = renderHook(() => useComboForm());

    act(() => {
      result.current.resetForm(mockCombo1);
    });

    expect(result.current.formName).toBe("Combo Parrillero");
    expect(result.current.formPrecio).toBe("25");
    expect(result.current.formGroups).toHaveLength(1);
    expect(result.current.formMethodIds).toEqual([1]);

    act(() => {
      result.current.resetForm(null);
    });

    expect(result.current.formName).toBe("");
    expect(result.current.formGroups).toHaveLength(0);
  });

  it("manages groups, products in group, toggle methods, and builds valid payload", () => {
    const { result } = renderHook(() => useComboForm());

    act(() => {
      result.current.setFormName("Super Pack");
      result.current.setFormPrecio("30.50");
      result.current.addGroup();
    });

    expect(result.current.formGroups).toHaveLength(1);

    act(() => {
      result.current.updateGroup(0, "nombre", "Bebidas");
      result.current.addProductToGroup(0);
    });

    expect(result.current.formGroups[0].productos).toHaveLength(1);

    act(() => {
      result.current.updateProductInGroup(0, 0, 99);
      result.current.toggleMethod(1);
      result.current.toggleMethod(2);
    });

    expect(result.current.formMethodIds).toEqual([1, 2]);

    const { valid, payload } = result.current.validateAndBuildPayload();
    expect(valid).toBe(true);
    expect(payload.nombre).toBe("Super Pack");
    expect(payload.precio_total_usd).toBe(30.5);
    expect(payload.grupos[0].productos[0].producto_id).toBe(99);

    act(() => {
      result.current.removeProductFromGroup(0, 0);
      result.current.removeGroup(0);
      result.current.toggleMethod(1);
    });

    expect(result.current.formGroups).toHaveLength(0);
    expect(result.current.formMethodIds).toEqual([2]);
  });
});

describe("CombosTable component", () => {
  it("renders combo items and triggers onEdit and onDelete", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <CombosTable
        combos={[mockCombo1]}
        loading={false}
        paymentMethods={mockPaymentMethods}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("Combo Parrillero")).toBeInTheDocument();
    expect(screen.getByText("Ideal para fin de semana")).toBeInTheDocument();
    expect(screen.getByText("Bebidas")).toBeInTheDocument();
    expect(screen.getByText("Efectivo USD")).toBeInTheDocument();

    const editBtn = screen.getByLabelText("Editar combo");
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(mockCombo1);

    const deleteBtn = screen.getByLabelText("Eliminar combo");
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(mockCombo1);
  });
});

describe("ComboFormModal component", () => {
  it("renders modal form and saves combo with valid inputs", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ComboFormModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        editingCombo={null}
        paymentMethods={mockPaymentMethods}
      />,
    );

    expect(screen.getByText("Nuevo Combo")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("Ej: 8 Latas Mix x $5");
    const priceInput = screen.getByPlaceholderText("0.00");

    fireEvent.change(nameInput, { target: { value: "Mega Promo" } });
    fireEvent.change(priceInput, { target: { value: "19.99" } });

    const addOptionBtn = screen.getByText("Agregar Opción");
    fireEvent.click(addOptionBtn);

    const groupNameInput = screen.getByPlaceholderText("Nombre del grupo (Ej: Cervezas)");
    fireEvent.change(groupNameInput, { target: { value: "Grupo 1" } });

    fireEvent.click(screen.getByText("Efectivo USD"));

    const submitBtn = screen.getByRole("button", { name: "Crear Combo" });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: "Mega Promo",
          precio_total_usd: 19.99,
        }),
        false,
      );
    });
  });
});

describe("CombosPage component", () => {
  it("renders full combos page, loads combos and opens modal", async () => {
    vi.spyOn(api, "getCombos").mockResolvedValue([mockCombo1]);
    vi.spyOn(api, "getPaymentMethods").mockResolvedValue(mockPaymentMethods);

    render(
      <ToastProvider>
        <CombosPage />
      </ToastProvider>,
    );

    expect(screen.getByText("Combos y Promociones")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Combo Parrillero")).toBeInTheDocument();
      expect(screen.getByText("1 combo activo")).toBeInTheDocument();
    });

    const newComboBtn = screen.getByRole("button", { name: /Nuevo Combo/i });
    fireEvent.click(newComboBtn);

    await waitFor(() => {
      expect(screen.getByText("Nuevo Combo")).toBeInTheDocument();
    });
  });
});
