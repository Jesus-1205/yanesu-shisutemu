import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import RateTrendChart from "@/features/exchange-rates/components/RateTrendChart";
import type { RateTrendPoint } from "@/features/exchange-rates/types";

const empty: RateTrendPoint[] = [];

describe("RateTrendChart", () => {
  it("renderiza el selector de intervalos", () => {
    render(
      <RateTrendChart data={empty} interval="30D" onIntervalChange={vi.fn()} loading={false} />,
    );
    for (const iv of ["7D", "30D", "90D", "6M", "1A"]) {
      expect(screen.getByRole("tab", { name: iv })).toBeInTheDocument();
    }
  });

  it("muestra mensaje cuando no hay datos", () => {
    render(
      <RateTrendChart data={empty} interval="30D" onIntervalChange={vi.fn()} loading={false} />,
    );
    expect(screen.getByText("Sin registros de tasas en este período")).toBeInTheDocument();
  });

  it("notifica el cambio de intervalo", async () => {
    const onChange = vi.fn();
    render(
      <RateTrendChart data={empty} interval="30D" onIntervalChange={onChange} loading={false} />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "90D" }));
    expect(onChange).toHaveBeenCalledWith("90D");
  });
});
