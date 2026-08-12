import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import { exportToExcel } from "../../lib/exportToExcel";
import type { Column } from "../../ui-components/Table";

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

interface Row {
  id: number;
  nombre: string;
  total_usd: number;
}

const baseColumns: Column<Row>[] = [
  { key: "id", header: "ID" },
  { key: "nombre", header: "Nombre" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("exportToExcel", () => {
  it("usa exportValue (número crudo) cuando la columna lo define", () => {
    const columns: Column<Row>[] = [
      { key: "id", header: "ID" },
      {
        key: "total_usd",
        header: "Total USD",
        render: () => "$1,234.56",
        exportValue: (r: Row) => Number(r.total_usd),
      },
    ];
    exportToExcel({ data: [{ id: 1, nombre: "A", total_usd: 1234.56 }], columns, filename: "Ventas" });
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      [{ ID: 1, "Total USD": 1234.56 }],
      { header: ["ID", "Total USD"] },
    );
  });

  it("sin exportValue usa el texto extraido de render", () => {
    const columns: Column<Row>[] = [
      { key: "id", header: "ID" },
      {
        key: "total_usd",
        header: "Total USD",
        render: () => "$1,234.56",
      },
    ];
    exportToExcel({ data: [{ id: 1, nombre: "A", total_usd: 1234.56 }], columns, filename: "Ventas" });
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      [{ ID: 1, "Total USD": "$1,234.56" }],
      { header: ["ID", "Total USD"] },
    );
  });

  it("sin render usa el valor directo de key", () => {
    exportToExcel({ data: [{ id: 7, nombre: "A", total_usd: 0 }], columns: baseColumns, filename: "X" });
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      [{ ID: 7, Nombre: "A" }],
      { header: ["ID", "Nombre"] },
    );
  });

  it("genera nombre con fecha local y conserva acentos/ñ del prefijo", () => {
    exportToExcel({ data: [], columns: baseColumns, filename: "Inventario proveedor José" });
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
    const filename = (XLSX.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(filename).toMatch(/^Inventario_proveedor_José_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("reemplaza caracteres invalidos del prefijo por guion bajo", () => {
    exportToExcel({ data: [], columns: baseColumns, filename: "R:/esumen*?&" });
    const filename = (XLSX.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(filename).toMatch(/^R__esumen____\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
