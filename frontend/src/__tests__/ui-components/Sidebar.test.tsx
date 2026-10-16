import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "../../ui-components/Sidebar";

const items = [
  { label: "Dashboard", to: "/" },
  { label: "Products", to: "/products" },
  {
    label: "Settings",
    items: [
      { label: "Profile", to: "/settings/profile" },
      { label: "Security", to: "/settings/security" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Users", to: "/admin/users" },
      { label: "Roles", to: "/admin/roles" },
    ],
  },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Sidebar", () => {
  it("renders navigation items", () => {
    renderWithRouter(<Sidebar items={items} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("renders brand when provided", () => {
    renderWithRouter(<Sidebar items={items} brand="MiApp" />);
    expect(screen.getByText("MiApp")).toBeInTheDocument();
  });

  it("renders user section when user provided", () => {
    renderWithRouter(
      <Sidebar items={items} user={{ name: "Juan Perez", email: "juan@test.com" }} />,
    );
    expect(screen.getByText("Juan Perez")).toBeInTheDocument();
    expect(screen.getByText("juan@test.com")).toBeInTheDocument();
  });

  it("toggles submenu when clicking dropdown item", async () => {
    renderWithRouter(<Sidebar items={items} />);
    const settings = screen.getByText("Settings");
    await userEvent.click(settings);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("accordion: closes other dropdown when opening a new one", async () => {
    renderWithRouter(<Sidebar items={items} />);
    const settings = screen.getByText("Settings");
    const admin = screen.getByText("Admin");

    await userEvent.click(settings);
    expect(screen.getByText("Profile")).toBeInTheDocument();

    await userEvent.click(admin);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });

  it("toggles collapsed state", async () => {
    const onCollapsedChange = vi.fn();
    renderWithRouter(
      <Sidebar items={items} collapsed={false} onCollapsedChange={onCollapsedChange} />,
    );
    await userEvent.click(screen.getByLabelText("Collapse sidebar"));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("uses h-dvh on the aside element", () => {
    const { container } = renderWithRouter(<Sidebar items={items} />);
    const aside = container.querySelector("aside");
    expect(aside).toBeInTheDocument();
    expect(aside!.className).toMatch(/\bh-dvh\b/);
  });

  it("renders user initial when no avatar", () => {
    renderWithRouter(
      <Sidebar items={items} user={{ name: "Ana Lopez", email: "ana@test.com" }} />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("does not render native title attribute on navigation links or dropdown buttons", () => {
    renderWithRouter(<Sidebar items={items} collapsed={true} />);
    const link = screen.getByText("Dashboard").closest("a");
    expect(link).not.toHaveAttribute("title");
    const button = screen.getByText("Settings").closest("button");
    expect(button).not.toHaveAttribute("title");
  });

  it("shows flyout menu when hovering dropdown in collapsed mode", async () => {
    renderWithRouter(<Sidebar items={items} collapsed={true} />);
    const settingsBtn = screen.getByText("Settings").closest("div");
    expect(settingsBtn).toBeInTheDocument();
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();

    await userEvent.hover(settingsBtn!);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("shows styled tooltip when hovering direct link in collapsed mode", async () => {
    renderWithRouter(<Sidebar items={items} collapsed={true} />);
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toBeInTheDocument();

    await userEvent.hover(dashboardLink!);
    const elements = screen.getAllByText("Dashboard");
    expect(elements.length).toBeGreaterThan(1);
    const tooltip = elements.find((el) => el.className.includes("bg-slate-900"));
    expect(tooltip).toBeInTheDocument();
  });
});
