import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReportsLayout from "@/features/reports/components/ReportsLayout";

function renderLayout(initialEntry = "/reports/sales") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/reports" element={<ReportsLayout />}>
          <Route path="sales" element={<div data-testid="sales-content">Ventas View</div>} />
          <Route path="products" element={<div data-testid="products-content">Productos View</div>} />
          <Route path="payments" element={<div data-testid="payments-content">Pagos View</div>} />
          <Route path="categories" element={<div data-testid="categories-content">Categorías View</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ReportsLayout", () => {
  it("renders page header, currency toggle, and domain nav tabs", () => {
    renderLayout();

    expect(screen.getByText("Panel de Reportes")).toBeInTheDocument();
    expect(screen.getByText("USD ($)")).toBeInTheDocument();
    expect(screen.getByText("VES (Bs)")).toBeInTheDocument();
    expect(screen.getByText("Ventas y Rentabilidad")).toBeInTheDocument();
    expect(screen.getByText("Inventario y Productos")).toBeInTheDocument();
    expect(screen.getByText("Métodos de Pago")).toBeInTheDocument();
    expect(screen.getByText("Categorías")).toBeInTheDocument();
  });

  it("toggles currency buttons and updates view", async () => {
    renderLayout();

    const vesBtn = screen.getByText("VES (Bs)");
    await userEvent.click(vesBtn);

    expect(vesBtn).toHaveClass("bg-white text-brand-blue");
  });

  it("opens custom date range inputs when clicking Personalizado", async () => {
    renderLayout();

    expect(screen.queryByText("Rango personalizado:")).not.toBeInTheDocument();

    const customBtn = screen.getByRole("button", { name: /personalizado/i });
    await userEvent.click(customBtn);

    expect(screen.getByText("Rango personalizado:")).toBeInTheDocument();
  });

  it("navigates to Categorías when clicking the Categorías nav link", async () => {
    renderLayout();

    const catLink = screen.getByRole("link", { name: "Categorías" });
    await userEvent.click(catLink);

    expect(screen.getByTestId("categories-content")).toBeInTheDocument();
  });
});
