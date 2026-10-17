import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LayoutHeader } from "../../layout/components/LayoutHeader";

vi.mock("../../ui-components/TasaBcvIndicator", () => ({
  default: () => <div data-testid="tasa-bcv-indicator">BCV 45.00</div>,
}));

vi.mock("../../layout/hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: () => [{ label: "Inventario", href: "/products" }, { label: "Productos" }],
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LayoutHeader", () => {
  it("renders menu open/close toggle and handles clicks", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <LayoutHeader onMenuToggle={onToggle} menuOpen={false} isOperator={false} />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByLabelText("Abrir menú");
    expect(toggleBtn).toBeInTheDocument();
    await userEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <LayoutHeader onMenuToggle={onToggle} menuOpen={true} isOperator={false} />
      </MemoryRouter>
    );
    expect(screen.getByLabelText("Cerrar menú")).toBeInTheDocument();
  });

  it("renders breadcrumbs and TasaBcvIndicator", () => {
    render(
      <MemoryRouter>
        <LayoutHeader onMenuToggle={vi.fn()} menuOpen={false} isOperator={false} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("tasa-bcv-indicator")).toBeInTheDocument();
    expect(screen.getAllByText("Productos").length).toBeGreaterThan(0);
  });

  it("renders settings button for administrator and triggers navigation", async () => {
    render(
      <MemoryRouter>
        <LayoutHeader onMenuToggle={vi.fn()} menuOpen={false} isOperator={false} />
      </MemoryRouter>
    );

    const settingsBtn = screen.getByTitle("Configuración");
    expect(settingsBtn).toBeInTheDocument();
    await userEvent.click(settingsBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  it("does not render settings button for operator", () => {
    render(
      <MemoryRouter>
        <LayoutHeader onMenuToggle={vi.fn()} menuOpen={false} isOperator={true} />
      </MemoryRouter>
    );

    expect(screen.queryByTitle("Configuración")).not.toBeInTheDocument();
  });
});
