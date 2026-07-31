import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LogoutButton from "../../ui-components/LogoutButton";

describe("LogoutButton", () => {
  it("renders with default label", () => {
    render(<LogoutButton />);
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("renders custom label", () => {
    render(<LogoutButton label="Cerrar sesión" />);
    expect(screen.getByText("Cerrar sesión")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<LogoutButton onClick={onClick} />);
    await userEvent.click(screen.getByText("Logout"));
    expect(onClick).toHaveBeenCalled();
  });
});
