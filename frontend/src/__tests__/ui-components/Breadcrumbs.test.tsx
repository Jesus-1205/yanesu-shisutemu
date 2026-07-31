import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Breadcrumbs from "../../ui-components/Breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders home link", () => {
    render(<Breadcrumbs items={[]} />);
    const homeLink = screen.getByText("Inicio");
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders breadcrumb items", () => {
    render(<Breadcrumbs items={[{ label: "Productos", href: "/products" }, { label: "Editar" }]} />);
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Editar")).toBeInTheDocument();
  });

  it("renders last item as current page", () => {
    render(<Breadcrumbs items={[{ label: "Productos" }]} />);
    const last = screen.getByText("Productos");
    expect(last).toHaveAttribute("aria-current", "page");
  });

  it("renders links with href", () => {
    render(<Breadcrumbs items={[{ label: "Categorías", href: "/categories" }]} />);
    const link = screen.getByText("Categorías").closest("a");
    expect(link).toHaveAttribute("href", "/categories");
  });
});