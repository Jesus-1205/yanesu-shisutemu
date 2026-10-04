import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PromoSection from "../../../../features/sales/components/PromoSection";
import type { ComboActiveOut } from "../../../../types/api";

const mockCombos: ComboActiveOut[] = [
  {
    id: 1,
    nombre: "Combo Ron",
    precio_total_usd: 15,
    metodo_pago_ids: [1],
    groups: [],
  },
];

describe("PromoSection", () => {
  it("renders null when combos is empty", () => {
    const { container } = render(
      <PromoSection
        combos={[]}
        showPromos={true}
        onTogglePromos={vi.fn()}
        onQuickAddCombo={vi.fn()}
        onCustomizeCombo={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders header and toggles promos visibility", () => {
    const onTogglePromos = vi.fn();
    const { rerender } = render(
      <PromoSection
        combos={mockCombos}
        showPromos={false}
        onTogglePromos={onTogglePromos}
        onQuickAddCombo={vi.fn()}
        onCustomizeCombo={vi.fn()}
      />
    );

    const toggleButton = screen.getByRole("button", { name: /Promociones \(1\)/i });
    expect(toggleButton).toBeInTheDocument();
    expect(screen.queryByText("Combo Ron")).not.toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(onTogglePromos).toHaveBeenCalledTimes(1);

    rerender(
      <PromoSection
        combos={mockCombos}
        showPromos={true}
        onTogglePromos={onTogglePromos}
        onQuickAddCombo={vi.fn()}
        onCustomizeCombo={vi.fn()}
      />
    );

    expect(screen.getByText("Combo Ron")).toBeInTheDocument();
  });
});
