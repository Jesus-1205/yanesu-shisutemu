import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InvoiceImageViewer from "@/features/invoices/components/InvoiceImageViewer";
import { api } from "@/services/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getInvoiceImageUrl: (id: number) => `http://localhost/api/invoices/${id}/image`,
    downloadInvoiceImage: vi.fn(),
  },
}));

describe("InvoiceImageViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when imagePath is null", () => {
    const { container } = render(
      <InvoiceImageViewer invoiceId={1} numeroFactura="FAC-001" imagePath={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders image section when imagePath is provided", () => {
    render(
      <InvoiceImageViewer invoiceId={10} numeroFactura="FAC-010" imagePath="uploads/factura.png" />,
    );

    expect(screen.getByText("Imagen de Factura")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar/i })).toBeInTheDocument();
    const img = screen.getByAltText("Factura #FAC-010");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "http://localhost/api/invoices/10/image");
  });

  it("triggers download and shows toast on success", async () => {
    vi.mocked(api.downloadInvoiceImage).mockResolvedValue("factura_010.jpg");

    render(
      <InvoiceImageViewer invoiceId={10} numeroFactura="FAC-010" imagePath="uploads/factura.png" />,
    );

    const downloadBtn = screen.getByRole("button", { name: /Descargar/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.downloadInvoiceImage).toHaveBeenCalledWith(10);
      expect(mockToast).toHaveBeenCalledWith("Imagen descargada: factura_010.jpg", "success");
    });
  });

  it("shows error toast when download fails", async () => {
    vi.mocked(api.downloadInvoiceImage).mockRejectedValue(new Error("Error al descargar"));

    render(
      <InvoiceImageViewer invoiceId={10} numeroFactura="FAC-010" imagePath="uploads/factura.png" />,
    );

    const downloadBtn = screen.getByRole("button", { name: /Descargar/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.downloadInvoiceImage).toHaveBeenCalledWith(10);
      expect(mockToast).toHaveBeenCalledWith("Error al descargar", "error");
    });
  });

  it("opens modal on thumbnail click", () => {
    render(
      <InvoiceImageViewer invoiceId={10} numeroFactura="FAC-010" imagePath="uploads/factura.png" />,
    );

    const thumbnail = screen.getByAltText("Factura #FAC-010");
    fireEvent.click(thumbnail.parentElement!);

    const allImages = screen.getAllByAltText("Factura #FAC-010");
    expect(allImages.length).toBeGreaterThanOrEqual(2);
  });
});
