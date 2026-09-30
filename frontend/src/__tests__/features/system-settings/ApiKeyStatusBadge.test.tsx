import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ApiKeyStatusBadge } from "@/features/system-settings/components/ApiKeyStatusBadge";

describe("ApiKeyStatusBadge", () => {
  it("muestra 'Configurada' cuando configured es true", () => {
    render(<ApiKeyStatusBadge configured={true} />);
    expect(screen.getByText("Configurada")).toBeInTheDocument();
  });

  it("muestra 'No configurada' cuando configured es false", () => {
    render(<ApiKeyStatusBadge configured={false} />);
    expect(screen.getByText("No configurada")).toBeInTheDocument();
  });
});
