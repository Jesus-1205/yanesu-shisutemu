import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarBrand } from "../../../ui-components/sidebar/components/SidebarBrand";
import { SidebarToggleButton } from "../../../ui-components/sidebar/components/SidebarToggleButton";
import { SidebarUserFooter } from "../../../ui-components/sidebar/components/SidebarUserFooter";
import { DefaultIcon } from "../../../ui-components/sidebar/components/DefaultIcon";

describe("Sidebar Presentational Components", () => {
  it("DefaultIcon renders svg", () => {
    const { container } = render(<DefaultIcon />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  describe("SidebarBrand", () => {
    it("renders brand name and logo when not collapsed", () => {
      render(
        <SidebarBrand
          brand="Sistema POS"
          logo={<span data-testid="logo">Logo</span>}
          collapsed={false}
        />
      );
      expect(screen.getByText("Sistema POS")).toBeInTheDocument();
      expect(screen.getByTestId("logo")).toBeInTheDocument();
    });

    it("hides brand text when collapsed", () => {
      render(
        <SidebarBrand
          brand="Sistema POS"
          logo={<span data-testid="logo">Logo</span>}
          collapsed={true}
        />
      );
      const brandSpan = screen.getByText("Sistema POS");
      expect(brandSpan.className).toContain("opacity-0");
    });
  });

  describe("SidebarToggleButton", () => {
    it("triggers onToggle and has appropriate aria-label", async () => {
      const onToggle = vi.fn();
      render(<SidebarToggleButton collapsed={false} onToggle={onToggle} />);
      const btn = screen.getByLabelText("Collapse sidebar");
      await userEvent.click(btn);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("displays Expand sidebar aria-label when collapsed", () => {
      render(<SidebarToggleButton collapsed={true} onToggle={vi.fn()} />);
      expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
    });
  });

  describe("SidebarUserFooter", () => {
    it("renders user information and triggers onLogout", async () => {
      const onLogout = vi.fn();
      render(
        <SidebarUserFooter
          user={{ name: "Carlos Perez", email: "carlos@test.com" }}
          collapsed={false}
          onLogout={onLogout}
        />
      );

      expect(screen.getByText("Carlos Perez")).toBeInTheDocument();
      expect(screen.getByText("carlos@test.com")).toBeInTheDocument();
      expect(screen.getByText("C")).toBeInTheDocument();

      const logoutBtn = screen.getByLabelText("Cerrar sesión");
      await userEvent.click(logoutBtn);
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it("renders avatar image if available", () => {
      render(
        <SidebarUserFooter
          user={{
            name: "Maria Ruiz",
            email: "maria@test.com",
            avatar: "https://test.com/avatar.png",
          }}
          collapsed={false}
        />
      );
      const img = screen.getByAltText("Maria Ruiz");
      expect(img).toHaveAttribute("src", "https://test.com/avatar.png");
    });
  });
});
