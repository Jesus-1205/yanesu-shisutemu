import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useExchangeRateStore } from "../../stores/exchangeRateStore";

vi.mock("../../services/api", () => ({ api: {} }));

import TasaBcvIndicator from "../../ui-components/TasaBcvIndicator";

beforeEach(() => {
  useExchangeRateStore.setState({ tasa: 0, tasaEUR: 0, loading: false });
});

describe("TasaBcvIndicator", () => {
  it("shows loading text when loading", () => {
    useExchangeRateStore.setState({ loading: true });
    render(<TasaBcvIndicator />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("renders nothing when both rates are 0", () => {
    const { container } = render(<TasaBcvIndicator />);
    expect(container.innerHTML).toBe("");
  });

  it("shows USD rate when tasa > 0", () => {
    useExchangeRateStore.setState({ tasa: 45.5, loading: false });
    render(<TasaBcvIndicator />);
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("45,50")).toBeInTheDocument();
  });

  it("shows EUR rate when tasaEUR > 0", () => {
    useExchangeRateStore.setState({ tasaEUR: 50.2, loading: false });
    render(<TasaBcvIndicator />);
    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.getByText("50,20")).toBeInTheDocument();
  });
});