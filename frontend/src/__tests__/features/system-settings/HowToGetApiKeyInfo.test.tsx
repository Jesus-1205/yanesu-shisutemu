import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HowToGetApiKeyInfo } from "@/features/system-settings/components/HowToGetApiKeyInfo";

describe("HowToGetApiKeyInfo", () => {
  it("renderiza el título y pasos para obtener una API key", () => {
    render(<HowToGetApiKeyInfo />);
    expect(screen.getByText("¿Cómo obtener una API Key?")).toBeInTheDocument();
    expect(screen.getByText("https://aistudio.google.com/apikey")).toBeInTheDocument();
  });
});
