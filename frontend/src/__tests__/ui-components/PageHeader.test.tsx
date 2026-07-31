import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PageHeader from "../../ui-components/PageHeader";
import Button from "../../ui-components/Button";

describe("PageHeader", () => {
  it("renders title", () => {
    render(<PageHeader title="Productos" />);
    expect(screen.getByText("Productos")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<PageHeader title="Productos" description="Lista de productos" />);
    expect(screen.getByText("Lista de productos")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(<PageHeader title="Productos" actions={<Button>Nuevo</Button>} />);
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });
});
