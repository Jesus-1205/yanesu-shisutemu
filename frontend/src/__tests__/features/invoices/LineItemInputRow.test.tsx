import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LineItemInputRow from "@/features/invoices/components/LineItemInputRow";
import type { ProductOut } from "@/types/api";

// ─── Mock AsyncCombobox ─────────────────────────────────────────────────────
vi.mock("@/ui-components/AsyncCombobox", () => ({
  default: function AsyncComboboxMock({
    onChange,
    placeholder,
  }: {
    value: number | null;
    onChange: (v: number | null) => void;
    placeholder: string;
  }) {
    return (
      <div data-testid="combobox">
        <input
          placeholder={placeholder}
          data-testid="product-search"
          onChange={(e) => {
            const num = Number(e.target.value);
            onChange(num > 0 ? num : null);
          }}
        />
      </div>
    );
  },
}));

// ─── Mock Button ────────────────────────────────────────────────────────────
vi.mock("@/ui-components/Button", () => ({
  default: function ButtonMock({
    children,
    disabled,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) {
    return (
      <button disabled={disabled} onClick={onClick} {...props}>
        {children}
      </button>
    );
  },
}));

// ─── Mock useInvoiceFormStore ───────────────────────────────────────────────
const mockAddLineItem = vi.fn();
vi.mock("@/features/invoices/store/invoiceFormStore", () => ({
  useInvoiceFormStore: (selector: (s: { addLineItem: typeof mockAddLineItem }) => typeof mockAddLineItem) =>
    selector({ addLineItem: mockAddLineItem }),
}));

// ─── Imports after mocks ────────────────────────────────────────────────────
import { convertirCostos } from "@/lib/money";
import { formatUsd } from "@/lib/text";

// ─── Test Data ──────────────────────────────────────────────────────────────
const mockProduct: ProductOut = {
  id: 1,
  nombre: "Producto Test",
  codigo_barra: "123456",
  categories: [],
  unidades_por_caja: 36,
  stock_cajas: 10,
  stock_unidades: 360,
  stock_minimo: 5,
  precio_costo_caja_usd: 22,
  precio_costo_usd: 0.61,
  precio_unidad_usd: 1.5,
  precio_caja_usd: 54,
  precio_sugerido_unidad_usd: 2,
  precio_sugerido_caja_usd: 72,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

const defaultProps: {
  products: ProductOut[];
  onSearchProducts: () => Promise<Array<{ value: number; label: string; subtitle?: string }>>;
  esBs: boolean;
  moneda: "USD" | "BS";
  tasa: string;
  aplicaIva: boolean;
} = {
  products: [mockProduct],
  onSearchProducts: vi.fn().mockResolvedValue([]),
  esBs: false,
  moneda: "USD",
  tasa: "800",
  aplicaIva: true,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderRow(overrides: Partial<typeof defaultProps> = {}) {
  return render(<LineItemInputRow {...defaultProps} {...overrides} />);
}

function getCostInput() {
  // Cost input label includes "$/Caja" or "$/Unid" followed by "(USD)" or "(Bs)"
  return screen.getByRole("spinbutton", { name: /\$\/(Caja|Unid)/i });
}

function fillCost(value: string) {
  fireEvent.change(getCostInput(), { target: { value } });
}

function fillUnitsPerBox(value: string) {
  // The "Unds/Caja" input has placeholder "24"
  const inputs = screen.getAllByRole("spinbutton");
  const undsInput = inputs.find((el) => (el as HTMLInputElement).placeholder === "24");
  expect(undsInput).toBeTruthy();
  fireEvent.change(undsInput!, { target: { value } });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("LineItemInputRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Bug fix: unit price calculation in BS mode ────────────────────────────

  describe("Unit price helper text (=/und) — BS mode", () => {
    it("shows correct USD unit cost when cost is entered in Bolívares (bug fix)", () => {
      // Bug scenario: tasa=800, cost=15500 BS, 36 unds/caja
      // 15500 / 800 = 19.375 → toCents → 19.38 USD per box
      // 19.38 / 36 = 0.5383... → $0,54/und
      //
      // BEFORE fix it would show: 15500 / 36 = $430,56/und (wrong!)
      renderRow({ esBs: true, moneda: "BS", tasa: "800" });

      fillCost("15500");
      fillUnitsPerBox("36");

      // Verify conversion math
      const costos = convertirCostos(15500, "BS", 800);
      expect(costos.usd).toBe(19.38); // 15500/800 = 19.375 → 19.38

      const expectedUnitCost = costos.usd / 36; // 19.38 / 36 ≈ 0.5383
      const expectedText = `${formatUsd(expectedUnitCost)}/und`;

      // The helper text must NOT contain the inflated BS value
      expect(screen.queryByText(/430/)).not.toBeInTheDocument();

      // Must show the correct converted unit cost
      const helperText = screen.getByText(/unds\/caja/);
      expect(helperText.textContent).toContain(expectedText);
      expect(helperText.textContent).toContain("36 unds/caja");
    });

    it("displays correct format: = $X.XX/und (Y unds/caja)", () => {
      renderRow({ esBs: true, moneda: "BS", tasa: "800" });

      fillCost("15500");
      fillUnitsPerBox("36");

      // Match the full helper text pattern
      const helperEl = screen.getByText(/=\s*\$[\d.,]+\/und\s*\(\d+\s*unds\/caja\)/);
      expect(helperEl).toBeInTheDocument();
    });

    it("does not show helper text when units per box is not set", () => {
      renderRow({ esBs: true, moneda: "BS", tasa: "800" });

      fillCost("15500");
      // Leave units per box empty (default state)

      expect(screen.queryByText(/unds\/caja/)).not.toBeInTheDocument();
    });

    it("does not show helper text when cost is empty", () => {
      renderRow({ esBs: true, moneda: "BS", tasa: "800" });

      fillUnitsPerBox("36");
      // Leave cost empty (default state)

      expect(screen.queryByText(/unds\/caja/)).not.toBeInTheDocument();
    });
  });

  // ── Unit price calculation in USD mode ────────────────────────────────────

  describe("Unit price helper text (=/und) — USD mode", () => {
    it("shows correct unit cost when cost is entered in USD", () => {
      // USD mode: esBs=false, moneda="USD", tasa="800"
      // Cost = 22 USD per box, 36 unds/caja
      // In USD mode, nCostoPrim is used directly (line 131: esBs ? newCostoSecundario : nCostoPrim)
      // 22 / 36 = 0.6111... → $0,61/und
      renderRow({ esBs: false, moneda: "USD", tasa: "800" });

      fillCost("22");
      fillUnitsPerBox("36");

      const expectedUnitCost = 22 / 36; // 0.6111...
      const expectedText = `${formatUsd(expectedUnitCost)}/und`;

      const helperText = screen.getByText(/unds\/caja/);
      expect(helperText.textContent).toContain(expectedText);
      expect(helperText.textContent).toContain("36 unds/caja");
    });

    it("updates helper text when cost changes", () => {
      renderRow({ esBs: false, moneda: "USD", tasa: "800" });

      fillUnitsPerBox("24");

      // First cost: 48 USD
      fillCost("48");
      let helperText = screen.getByText(/unds\/caja/);
      expect(helperText.textContent).toContain(formatUsd(48 / 24));

      // Change cost: 72 USD
      fillCost("72");
      helperText = screen.getByText(/unds\/caja/);
      expect(helperText.textContent).toContain(formatUsd(72 / 24));
    });

    it("updates helper text when units per box changes", () => {
      renderRow({ esBs: false, moneda: "USD", tasa: "800" });

      fillCost("24");

      // First: 36 units
      fillUnitsPerBox("36");
      let helperText = screen.getByText(/unds\/caja/);
      expect(helperText.textContent).toContain(formatUsd(24 / 36));

      // Change to 24 units
      fillUnitsPerBox("24");
      helperText = screen.getByText(/unds\/caja/);
      expect(helperText.textContent).toContain(formatUsd(24 / 24));
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("shows helper text with zero decimals when division is exact", () => {
      renderRow({ esBs: false, moneda: "USD", tasa: "800" });

      fillCost("72");
      fillUnitsPerBox("36");

      // 72 / 36 = 2.00 → "$2,00/und"
      const helperText = screen.getByText(/unds\/caja/);
      expect(helperText.textContent).toContain("$2,00/und");
    });

    it("shows correct result for BS mode with different tasa", () => {
      // tasa=750, cost=16500 BS, 24 unds/caja
      // 16500 / 750 = 22.00 USD per box
      // 22.00 / 24 = 0.9166... → $0,92/und
      renderRow({ esBs: true, moneda: "BS", tasa: "750" });

      fillCost("16500");
      fillUnitsPerBox("24");

      const costos = convertirCostos(16500, "BS", 750);
      expect(costos.usd).toBe(22.0);

      const expectedUnitCost = costos.usd / 24;
      const helperText = screen.getByText(/unds\/caja/);
      expect(helperText.textContent).toContain(formatUsd(expectedUnitCost));
    });
  });
});
