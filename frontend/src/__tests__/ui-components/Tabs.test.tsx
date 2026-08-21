import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Tabs from "../../ui-components/Tabs";
import { Package } from "lucide-react";

const tabs = [
  { value: "products", label: "Productos" },
  { value: "users", label: "Usuarios", badge: 3 },
  { value: "settings", label: "Settings", icon: <Package className="w-4 h-4" /> },
];

describe("Tabs", () => {
  it("renders all tabs", () => {
    render(<Tabs tabs={tabs} value="products" onChange={vi.fn()} />);
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("highlights active tab", () => {
    render(<Tabs tabs={tabs} value="users" onChange={vi.fn()} />);
    const active = screen.getByText("Usuarios");
    expect(active.className).toMatch(/text-brand-blue/);
    expect(screen.getByText("Productos").className).not.toMatch(/text-brand-blue/);
  });

  it("shows badge count", () => {
    render(<Tabs tabs={tabs} value="products" onChange={vi.fn()} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onChange when tab clicked", async () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} value="products" onChange={onChange} />);
    await userEvent.click(screen.getByText("Usuarios"));
    expect(onChange).toHaveBeenCalledWith("users");
  });

  it("applies overflow-x-auto to the container for horizontal scrolling", () => {
    const { container } = render(<Tabs tabs={tabs} value="products" onChange={vi.fn()} />);
    // The container div is the first child element
    const containerDiv = container.firstElementChild as HTMLElement;
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv.className).toMatch(/\boverflow-x-auto\b/);
  });

  it("applies shrink-0 to tab labels to prevent wrapping", () => {
    render(<Tabs tabs={tabs} value="products" onChange={vi.fn()} />);
    const labels = screen.getAllByRole("radio");
    // Each label wrapping a radio input should have shrink-0
    labels.forEach((radio) => {
      const label = radio.closest("label");
      expect(label).toBeInTheDocument();
      expect(label!.className).toMatch(/\bshrink-0\b/);
    });
  });
});
