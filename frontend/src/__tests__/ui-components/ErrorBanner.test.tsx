import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBanner from "../../ui-components/ErrorBanner";

describe("ErrorBanner", () => {
  it("renders children message", () => {
    render(<ErrorBanner>Error de conexión</ErrorBanner>);
    expect(screen.getByText("Error de conexión")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<ErrorBanner title="Algo salió mal">Error de conexión</ErrorBanner>);
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
  });

  it("renders retry button and calls onRetry", async () => {
    const onRetry = vi.fn();
    render(<ErrorBanner onRetry={onRetry}>Error</ErrorBanner>);
    await userEvent.click(screen.getByText("Reintentar"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("hides on dismiss when dismissible", async () => {
    render(<ErrorBanner>Error</ErrorBanner>);
    await userEvent.click(screen.getByLabelText("Descartar"));
    expect(screen.queryByText("Error")).not.toBeInTheDocument();
  });

  it("does not show dismiss button when dismissible=false", () => {
    render(<ErrorBanner dismissible={false}>Error</ErrorBanner>);
    expect(screen.queryByLabelText("Descartar")).not.toBeInTheDocument();
  });

  it("applies variant styles", () => {
    render(<ErrorBanner variant="warning">Advertencia</ErrorBanner>);
    const banner = screen.getByText("Advertencia").closest("[role='alert']");
    expect(banner?.className).toMatch(/bg-orange-50/);
  });
});
