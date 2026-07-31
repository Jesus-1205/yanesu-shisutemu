import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileUpload from "../../ui-components/FileUpload";

function createFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

function uploadFile(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("FileUpload", () => {
  it("renders drop zone with default text", () => {
    render(<FileUpload />);
    expect(screen.getByText(/Arrastra imágenes o haz clic/)).toBeInTheDocument();
  });

  it("shows file type and size info", () => {
    render(<FileUpload accept=".pdf" />);
    expect(screen.getByText(/PDF/)).toBeInTheDocument();
    expect(screen.getByText(/5\.0 MB/)).toBeInTheDocument();
  });

  it("adds file on change", async () => {
    const onChange = vi.fn();
    const { container } = render(<FileUpload onFilesChange={onChange} />);
    uploadFile(container, createFile("test.png", "image/png", 1024));
    expect(onChange).toHaveBeenCalled();
  });

  it("shows added file name", async () => {
    const { container } = render(<FileUpload />);
    uploadFile(container, createFile("factura.pdf", "application/pdf", 2048));
    expect(screen.getByText("factura.pdf")).toBeInTheDocument();
  });

  it("calls removeFile when remove button clicked", async () => {
    const onChange = vi.fn();
    const { container } = render(<FileUpload onFilesChange={onChange} />);
    uploadFile(container, createFile("test.jpg", "image/jpeg", 512));
    await userEvent.click(screen.getByLabelText(/Eliminar/));
    expect(screen.queryByText("test.jpg")).not.toBeInTheDocument();
  });
});