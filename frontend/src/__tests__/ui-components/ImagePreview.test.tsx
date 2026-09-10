import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ImagePreview from "@/ui-components/ImagePreview";

beforeEach(() => {
  vi.restoreAllMocks();
  // Mock createObjectURL & revokeObjectURL
  window.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-uuid");
  window.URL.revokeObjectURL = vi.fn();
});

describe("ImagePreview", () => {
  it("renderiza la vista previa con el src correcto y alt", () => {
    const file = new File(["dummy content"], "factura.png", { type: "image/png" });
    render(<ImagePreview file={file} alt="Factura de proveedor" />);

    const img = screen.getByRole("img", { name: "Factura de proveedor" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "blob:http://localhost/mock-uuid");
  });

  it("permite expandir la imagen en modal al hacer clic", () => {
    const file = new File(["dummy content"], "factura.png", { type: "image/png" });
    render(<ImagePreview file={file} alt="Factura" />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    // Modal abierto: hay botón de cerrar con icono X
    const closeButtons = screen.getAllByRole("button");
    expect(closeButtons.length).toBeGreaterThan(1);
  });

  it("permite cerrar el modal al hacer clic en el botón de cerrar", () => {
    const file = new File(["dummy content"], "factura.png", { type: "image/png" });
    render(<ImagePreview file={file} alt="Factura" />);

    // Abrir
    fireEvent.click(screen.getByRole("button"));

    // Cerrar vía botón
    const closeBtn = screen.getAllByRole("button")[1];
    fireEvent.click(closeBtn);

    // Vuelve a haber solo 1 botón
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("limpia el objectURL al desmontar el componente", () => {
    const file = new File(["dummy content"], "factura.png", { type: "image/png" });
    const { unmount } = render(<ImagePreview file={file} />);

    unmount();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/mock-uuid");
  });
});
