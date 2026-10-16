import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarLink } from "../../../ui-components/sidebar/components/SidebarLink";
import { SidebarDropdown } from "../../../ui-components/sidebar/components/SidebarDropdown";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Sidebar Navigation Components", () => {
  describe("SidebarLink", () => {
    it("renders link with label and active style when active", () => {
      renderWithRouter(
        <SidebarLink item={{ label: "Dashboard", to: "/" }} collapsed={false} />
      );
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("shows tooltip on hover when collapsed is true", async () => {
      renderWithRouter(
        <SidebarLink item={{ label: "Dashboard", to: "/" }} collapsed={true} />
      );
      const link = screen.getByText("Dashboard").closest("a");
      expect(link).toBeInTheDocument();

      await userEvent.hover(link!);
      const elements = screen.getAllByText("Dashboard");
      expect(elements.length).toBeGreaterThan(1);
    });
  });

  describe("SidebarDropdown", () => {
    const item = {
      label: "Settings",
      items: [
        { label: "Profile", to: "/settings/profile" },
        { label: "Security", to: "/settings/security" },
      ],
    };

    it("renders dropdown button and expands submenu items when expanded", () => {
      renderWithRouter(
        <SidebarDropdown
          item={item}
          collapsed={false}
          expanded={true}
          expandAll={false}
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Security")).toBeInTheDocument();
    });

    it("calls onToggle when clicking dropdown button in expanded mode", async () => {
      const onToggle = vi.fn();
      renderWithRouter(
        <SidebarDropdown
          item={item}
          collapsed={false}
          expanded={false}
          expandAll={false}
          onToggle={onToggle}
        />
      );
      await userEvent.click(screen.getByText("Settings"));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("shows flyout menu on hover when collapsed is true", async () => {
      renderWithRouter(
        <SidebarDropdown
          item={item}
          collapsed={true}
          expanded={false}
          expandAll={false}
          onToggle={vi.fn()}
        />
      );
      const container = screen.getByText("Settings").closest("div");
      expect(container).toBeInTheDocument();
      expect(screen.queryByText("Profile")).not.toBeInTheDocument();

      await userEvent.hover(container!);
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Security")).toBeInTheDocument();
    });
  });
});
