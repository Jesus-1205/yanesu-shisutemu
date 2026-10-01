import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import FilterField from "@/features/sales/components/FilterField";

describe("FilterField", () => {
  it("renders label and value correctly", () => {
    const handleChange = vi.fn();
    render(
      <FilterField
        label="Desde"
        type="date"
        value="2025-01-01"
        onChange={handleChange}
        id="date-desde"
      />
    );

    expect(screen.getByLabelText("Desde")).toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toHaveValue("2025-01-01");
  });

  it("calls onChange when the input changes", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <FilterField
        label="Hora desde"
        type="time"
        value="10:00"
        onChange={handleChange}
        id="time-desde"
      />
    );

    const input = screen.getByLabelText("Hora desde");
    await user.clear(input);
    await user.type(input, "12:30");

    expect(handleChange).toHaveBeenCalled();
  });
});
