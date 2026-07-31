import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table from "../../ui-components/Table";
import type { Column } from "../../ui-components/Table";

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

import { exportToExcel } from "@/lib/exportToExcel";

interface Item {
  id: number;
  name: string;
}

const columns: Column<Item>[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Name" },
];

const data: Item[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Table", () => {
  it("renders headers and data", () => {
    render(<Table columns={columns} data={data} keyExtractor={(item) => item.id} />);
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows empty message when no data", () => {
    render(<Table columns={columns} data={[]} keyExtractor={(item) => item.id} />);
    expect(screen.getByText("No hay registros")).toBeInTheDocument();
  });

  it("shows custom empty message", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
        emptyMessage="Sin datos"
      />,
    );
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });

  it("renders skeleton rows when loading", () => {
    const { container } = render(
      <Table columns={columns} data={[]} keyExtractor={(item) => item.id} loading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders sortable columns", () => {
    const onSort = vi.fn();
    const sortCol: Column<Item>[] = [
      { key: "name", header: "Name", sortable: true, onSort },
    ];
    render(<Table columns={sortCol} data={data} keyExtractor={(item) => item.id} />);
    const sortBtn = screen.getByText("Name");
    expect(sortBtn).toBeInTheDocument();
  });

  it("uses custom render function", () => {
    const customCol: Column<Item>[] = [
      {
        key: "name",
        header: "Name",
        render: (item) => <span data-testid="custom">{item.name.toUpperCase()}</span>,
      },
    ];
    render(<Table columns={customCol} data={data} keyExtractor={(item) => item.id} />);
    expect(screen.getByText("ALICE")).toBeInTheDocument();
  });

  describe("headerLeft", () => {
    it("renders headerLeft in the export bar", () => {
      render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          exportable
          headerLeft={<span data-testid="header-left">Custom Control</span>}
        />,
      );
      expect(screen.getByTestId("header-left")).toBeInTheDocument();
      expect(screen.getByText("Custom Control")).toBeInTheDocument();
    });

    it("renders headerLeft without export button when not exportable", () => {
      render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          headerLeft={<span data-testid="header-left">Control</span>}
        />,
      );
      expect(screen.getByTestId("header-left")).toBeInTheDocument();
    });
  });

  describe("export", () => {
    it("shows export button when exportable and has data", () => {
      render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          exportable
          exportFilename="test"
        />,
      );
      expect(screen.getByTitle("Exportar a Excel")).toBeInTheDocument();
    });

    it("does not show export button when no data", () => {
      render(
        <Table
          columns={columns}
          data={[]}
          keyExtractor={(item) => item.id}
          exportable
          exportFilename="test"
        />,
      );
      expect(screen.queryByTitle("Exportar a Excel")).not.toBeInTheDocument();
    });

    it("opens dropdown on click", async () => {
      render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          exportable
          exportFilename="test"
        />,
      );
      await userEvent.click(screen.getByTitle("Exportar a Excel"));
      expect(screen.getByText("Datos visibles")).toBeInTheDocument();
    });

    it("exports visible data when clicking Datos visibles", async () => {
      render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          exportable
          exportFilename="test"
        />,
      );
      await userEvent.click(screen.getByTitle("Exportar a Excel"));
      await userEvent.click(screen.getByText("Datos visibles"));
      expect(exportToExcel).toHaveBeenCalledWith({
        data: data,
        columns,
        filename: "test",
      });
    });

    it("exports allData when clicking Todos los datos", async () => {
      const allData = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ];
      render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          exportable
          exportFilename="test"
          allData={allData}
        />,
      );
      await userEvent.click(screen.getByTitle("Exportar a Excel"));
      await userEvent.click(screen.getByText("Todos los datos"));
      expect(exportToExcel).toHaveBeenCalledWith({
        data: allData,
        columns,
        filename: "test_completo",
      });
    });

    it("calls fetchAllData and exports result", async () => {
      const fetchAllData = vi.fn().mockResolvedValue([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ]);
      render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          exportable
          exportFilename="test"
          fetchAllData={fetchAllData}
        />,
      );
      await userEvent.click(screen.getByTitle("Exportar a Excel"));
      await userEvent.click(screen.getByText("Todos los datos"));
      await waitFor(() => {
        expect(fetchAllData).toHaveBeenCalled();
      });
      expect(exportToExcel).toHaveBeenCalledWith({
        data: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
          { id: 3, name: "Charlie" },
        ],
        columns,
        filename: "test_completo",
      });
    });

    it("shows loading state during fetchAllData", async () => {
      let resolveFetch: (value: Item[]) => void;
      const fetchAllData = vi.fn().mockImplementation(
        () => new Promise<Item[]>((resolve) => { resolveFetch = resolve; }),
      );
      render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          exportable
          exportFilename="test"
          fetchAllData={fetchAllData}
        />,
      );
      await userEvent.click(screen.getByTitle("Exportar a Excel"));
      await userEvent.click(screen.getByText("Todos los datos"));
      await waitFor(() => {
        expect(screen.getByText("Exportando...")).toBeInTheDocument();
      });
      resolveFetch!([]);
      await waitFor(() => {
        expect(screen.queryByText("Exportando...")).not.toBeInTheDocument();
      });
    });
  });
});
