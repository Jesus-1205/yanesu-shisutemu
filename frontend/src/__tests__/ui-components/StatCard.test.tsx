import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatCard from "../../ui-components/StatCard";
import { User } from "lucide-react";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Total Ventas" value="$1,000" />);
    expect(screen.getByText("Total Ventas")).toBeInTheDocument();
    expect(screen.getByText("$1,000")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    render(<StatCard label="Usuarios" value="5" icon={<User data-testid="icon" />} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders trend with up direction", () => {
    render(<StatCard label="Ventas" value="$500" trend={{ direction: "up", value: "+12%" }} />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });

  it("renders trend with down direction", () => {
    render(<StatCard label="Ventas" value="$500" trend={{ direction: "down", value: "-5%" }} />);
    expect(screen.getByText("-5%")).toBeInTheDocument();
  });

  it("applies variant styles", () => {
    render(<StatCard label="Alerta" value="3" variant="danger" />);
    const card = screen.getByText("Alerta").closest("div")?.parentElement;
    expect(card?.className).toMatch(/bg-red-50/);
  });
});
