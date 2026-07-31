import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFoundPage from "../../../features/not-found/pages/NotFoundPage";

describe("NotFoundPage", () => {
  it("renders 404 message", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("404 - Pagina no encontrada")).toBeInTheDocument();
  });
});