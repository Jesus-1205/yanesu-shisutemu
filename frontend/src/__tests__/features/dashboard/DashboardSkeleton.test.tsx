import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardSkeleton from "@/features/dashboard/components/DashboardSkeleton";

describe("DashboardSkeleton", () => {
  it("renders with data-testid='dashboard-skeleton' and aria-busy='true'", () => {
    render(<DashboardSkeleton />);
    const skeleton = screen.getByTestId("dashboard-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });

  it("renders shortcuts skeleton with 4 child cards", () => {
    render(<DashboardSkeleton />);
    const shortcuts = screen.getByTestId("skeleton-shortcuts");
    expect(shortcuts).toBeInTheDocument();
    expect(shortcuts.children.length).toBe(4);
  });

  it("renders kpis skeleton with 5 child cards", () => {
    render(<DashboardSkeleton />);
    const kpis = screen.getByTestId("skeleton-kpis");
    expect(kpis).toBeInTheDocument();
    expect(kpis.children.length).toBe(5);
  });

  it("renders pending invoices skeleton", () => {
    render(<DashboardSkeleton />);
    const pendingInvoices = screen.getByTestId("skeleton-pending-invoices");
    expect(pendingInvoices).toBeInTheDocument();
  });

  it("renders charts skeleton with 2 child containers", () => {
    render(<DashboardSkeleton />);
    const charts = screen.getByTestId("skeleton-charts");
    expect(charts).toBeInTheDocument();
    expect(charts.children.length).toBe(2);
  });

  it("renders at least 10 elements with animate-pulse", () => {
    const { container } = render(<DashboardSkeleton />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThanOrEqual(10);
  });
});
