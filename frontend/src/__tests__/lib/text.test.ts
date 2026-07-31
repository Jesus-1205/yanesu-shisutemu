import { describe, it, expect } from "vitest";
import { toTitleCase, formatBs, formatUsd } from "../../lib/text";

describe("toTitleCase", () => {
  it("converts basic text", () => {
    expect(toTitleCase("hola mundo")).toBe("Hola Mundo");
  });

  it("preserves C.A.", () => {
    expect(toTitleCase("DISTRIBUIDORA CAMACHO MIRANDA, C.A.")).toBe(
      "Distribuidora Camacho Miranda, C.A."
    );
  });

  it("preserves S.A.", () => {
    expect(toTitleCase("EMPRESA S.A.")).toBe("Empresa S.A.");
  });

  it("preserves R.L.", () => {
    expect(toTitleCase("COMERCIAL R.L.")).toBe("Comercial R.L.");
  });

  it("preserves product codes with numbers", () => {
    expect(toTitleCase("MEDIA ANIS CARTUJO 350ML")).toBe(
      "Media Anis Cartujo 350ML"
    );
  });

  it("preserves short uppercase abbreviations", () => {
    expect(toTitleCase("L/R CARTA ROJA 1L")).toBe("L/R Carta Roja 1L");
  });

  it("preserves UNID suffix", () => {
    expect(toTitleCase("MEDIA ANIS CARTUJO 350ML 24UNID.")).toBe(
      "Media Anis Cartujo 350ML 24UNID."
    );
  });

  it("handles empty string", () => {
    expect(toTitleCase("")).toBe("");
  });

  it("handles already title case", () => {
    expect(toTitleCase("Hello World")).toBe("Hello World");
  });

  it("handles mixed case", () => {
    expect(toTitleCase("sANGRiA cARAQUEÑA 1.75L")).toBe(
      "Sangria Caraqueña 1.75L"
    );
  });
});

describe("formatBs", () => {
  it("formats with dots for thousands and comma for decimals", () => {
    expect(formatBs(14991.77)).toBe("14.991,77");
  });

  it("formats small numbers", () => {
    expect(formatBs(582)).toBe("582,00");
  });

  it("formats zero", () => {
    expect(formatBs(0)).toBe("0,00");
  });

  it("formats large numbers", () => {
    expect(formatBs(436500)).toBe("436.500,00");
  });

  it("formats with existing decimals", () => {
    expect(formatBs(12726.15)).toBe("12.726,15");
  });
});

describe("formatUsd", () => {
  it("formats with $ prefix", () => {
    expect(formatUsd(582)).toBe("$582,00");
  });

  it("formats with thousands", () => {
    expect(formatUsd(14991.77)).toBe("$14.991,77");
  });

  it("formats zero", () => {
    expect(formatUsd(0)).toBe("$0,00");
  });

  it("formats large numbers", () => {
    expect(formatUsd(67018)).toBe("$67.018,00");
  });
});
