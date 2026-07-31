import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DropdownMenu from "../../ui-components/DropdownMenu";
import { User } from "lucide-react";

const sections = [
  {
    items: [
      { label: "Perfil", icon: <User />, onClick: vi.fn() },
      { label: "Eliminar", variant: "danger" as const, onClick: vi.fn() },
      { label: "Deshabilitado", disabled: true, onClick: vi.fn() },
    ],
  },
];

describe("DropdownMenu", () => {
  it("renders items", () => {
    render(<DropdownMenu sections={sections} />);
    expect(screen.getByText("Perfil")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

  it("calls onClick when item clicked", async () => {
    render(<DropdownMenu sections={sections} />);
    await userEvent.click(screen.getByText("Perfil"));
    expect(sections[0].items[0].onClick).toHaveBeenCalled();
  });

  it("does not call onClick when disabled", async () => {
    render(<DropdownMenu sections={sections} />);
    await userEvent.click(screen.getByText("Deshabilitado"));
    expect(sections[0].items[2].onClick).not.toHaveBeenCalled();
  });
});
