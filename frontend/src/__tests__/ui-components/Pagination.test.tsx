import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "../../ui-components/Pagination";

describe("Pagination", () => {
  it("renders nothing when totalPages <= 1", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders page buttons", () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText("Página anterior")).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText("Página siguiente")).toBeDisabled();
  });

  it("calls onPageChange when clicking next", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByLabelText("Página siguiente"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange when clicking a page number", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByLabelText("Ir a página 3"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("highlights current page", () => {
    render(<Pagination page={2} totalPages={3} onPageChange={vi.fn()} />);
    const current = screen.getByLabelText("Ir a página 2");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("shows ellipsis for large page ranges", () => {
    render(<Pagination page={5} totalPages={10} onPageChange={vi.fn()} />);
    expect(screen.getAllByText("…").length).toBeGreaterThanOrEqual(1);
  });
});