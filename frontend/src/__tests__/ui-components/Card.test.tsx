import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Card from "../../ui-components/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card><p>Contenido</p></Card>);
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("applies padding by default", () => {
    const { container } = render(<Card><p>Contenido</p></Card>);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/p-6/);
  });

  it("removes padding when padding=false", () => {
    const { container } = render(<Card padding={false}><p>Contenido</p></Card>);
    expect((container.firstChild as HTMLElement)?.className).not.toMatch(/p-6/);
  });
});
