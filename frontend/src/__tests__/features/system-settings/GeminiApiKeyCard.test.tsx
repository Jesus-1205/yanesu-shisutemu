import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GeminiApiKeyCard } from "@/features/system-settings/components/GeminiApiKeyCard";

describe("GeminiApiKeyCard", () => {
  const defaultProps = {
    geminiKey: "",
    onKeyChange: vi.fn(),
    showKey: false,
    onToggleShowKey: vi.fn(),
    configured: false,
    loading: false,
    saving: false,
    testing: false,
    testResult: null,
    onSave: vi.fn(),
    onTest: vi.fn(),
    onDelete: vi.fn(),
  };

  it("renderiza el estado de carga cuando loading es true", () => {
    render(<GeminiApiKeyCard {...defaultProps} loading={true} />);
    expect(screen.getByText("Verificando estado...")).toBeInTheDocument();
  });

  it("renderiza el formulario y llama a onKeyChange al tipear", () => {
    render(<GeminiApiKeyCard {...defaultProps} geminiKey="AIza..." />);

    const input = screen.getByDisplayValue("AIza...");
    fireEvent.change(input, { target: { value: "NuevaClave" } });

    expect(defaultProps.onKeyChange).toHaveBeenCalledWith("NuevaClave");
  });

  it("permite alternar visibilidad de la API key", () => {
    const onToggleShowKey = vi.fn();
    render(<GeminiApiKeyCard {...defaultProps} onToggleShowKey={onToggleShowKey} />);

    const toggleBtn = screen.getByRole("button", { name: /mostrar api key/i });
    fireEvent.click(toggleBtn);

    expect(onToggleShowKey).toHaveBeenCalledTimes(1);
  });

  it("renderiza botón de eliminar solo cuando está configurado", () => {
    const { rerender } = render(<GeminiApiKeyCard {...defaultProps} configured={false} />);
    expect(screen.queryByRole("button", { name: /Eliminar/i })).not.toBeInTheDocument();

    rerender(<GeminiApiKeyCard {...defaultProps} configured={true} />);
    expect(screen.getByRole("button", { name: /Eliminar/i })).toBeInTheDocument();
  });

  it("muestra el mensaje de prueba exitosa o con error", () => {
    const { rerender } = render(
      <GeminiApiKeyCard
        {...defaultProps}
        testResult={{ success: true, message: "Conexión exitosa", models: ["gemini-1.5-flash"] }}
      />,
    );
    expect(screen.getByText("Conexión exitosa")).toBeInTheDocument();

    rerender(
      <GeminiApiKeyCard
        {...defaultProps}
        testResult={{ success: false, message: "Error de autenticación", models: null }}
      />,
    );
    expect(screen.getByText("Error de autenticación")).toBeInTheDocument();
  });
});
