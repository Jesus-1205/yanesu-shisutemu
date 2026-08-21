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

  it("renders search input", () => {
    renderWithRouter(<Sidebar items={items} />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("filters items by search", async () => {
    renderWithRouter(<Sidebar items={items} />);
    const search = screen.getByPlaceholderText("Search...");
    await userEvent.type(search, "Product");
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
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

  it("renders user initial when no avatar", () => {
    renderWithRouter(
      <Sidebar items={items} user={{ name: "Ana Lopez", email: "ana@test.com" }} />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("uses h-dvh on the aside element instead of h-screen", () => {
    const { container } = renderWithRouter(<Sidebar items={items} />);
    const aside = container.querySelector("aside");
    expect(aside).toBeInTheDocument();
    expect(aside!.className).toMatch(/\bh-dvh\b/);
    expect(aside!.className).not.toMatch(/\bh-screen\b/);
  });
});
