import { describe, it, expect } from "vitest";
import { extractUnidadesFromNombre } from "../../../features/shared/components/CreateProductModal";

describe("extractUnidadesFromNombre", () => {
  it("extracts 24UNID.", () => {
    expect(extractUnidadesFromNombre("MEDIA ANIS CARTUJO 350ML 24UNID.")).toEqual({
      cleanName: "MEDIA ANIS CARTUJO 350ML",
      unidades: 24,
    });
  });

  it("extracts 12 UNID", () => {
    expect(extractUnidadesFromNombre("L/R CARTA ROJA 1L 12 UNID")).toEqual({
      cleanName: "L/R CARTA ROJA 1L",
      unidades: 12,
    });
  });

  it("extracts 12UND", () => {
    expect(extractUnidadesFromNombre("CANELITA 1L 12UND")).toEqual({
      cleanName: "CANELITA 1L",
      unidades: 12,
    });
  });

  it("extracts 6 UNIDADES", () => {
    expect(extractUnidadesFromNombre("SANGRIA 1.5L 6 UNIDADES")).toEqual({
      cleanName: "SANGRIA 1.5L",
      unidades: 6,
    });
  });

  it("extracts 12 uds.", () => {
    expect(extractUnidadesFromNombre("DRAGON 1L 12 uds.")).toEqual({
      cleanName: "DRAGON 1L",
      unidades: 12,
    });
  });

  it("returns unidades 0 when no pattern found", () => {
    expect(extractUnidadesFromNombre("MEDIA ANIS CARTUJO 350ML")).toEqual({
      cleanName: "MEDIA ANIS CARTUJO 350ML",
      unidades: 0,
    });
  });

  it("handles empty string", () => {
    expect(extractUnidadesFromNombre("")).toEqual({
      cleanName: "",
      unidades: 0,
    });
  });
});
