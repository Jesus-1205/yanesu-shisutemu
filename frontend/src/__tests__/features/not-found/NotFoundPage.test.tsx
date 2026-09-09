import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFoundPage from "../../../features/not-found/pages/NotFoundPage";

describe("NotFoundPage", () => {
  it("renders 404 message", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Pagina no encontrada")).toBeInTheDocument();
  });
});