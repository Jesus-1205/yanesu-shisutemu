import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToastProvider } from "@/ui-components/Toast";
import DesignSystemPage from "../../../features/design-system/pages/DesignSystemPage";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe("DesignSystemPage", () => {
  it("renders design system page", () => {
    render(<DesignSystemPage />, { wrapper });
    expect(screen.getByText("Sistema de Diseño")).toBeInTheDocument();
  });
});