import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "../../ui-components/Toast";

function TestButton() {
  const { toast } = useToast();
  return <button onClick={() => toast("Hello", "success")}>Show Toast</button>;
}

describe("Toast - useToast throws outside provider", () => {
  it("throws when useToast is called without ToastProvider", () => {
    expect(() => render(<TestButton />)).toThrow(
      "useToast debe usarse dentro de ToastProvider",
    );
  });
});

describe("ToastProvider", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <div>child</div>
      </ToastProvider>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("shows toast when toast() is called", () => {
    render(
      <ToastProvider>
        <TestButton />
      </ToastProvider>,
    );
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
    act(() => {
      screen.getByText("Show Toast").click();
    });
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("removes toast when close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestButton />
      </ToastProvider>,
    );
    await user.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Hello")).toBeInTheDocument();

    await user.click(screen.getAllByLabelText("Cerrar")[0]);
    await waitFor(() => {
      expect(screen.queryByText("Hello")).not.toBeInTheDocument();
    });
  });
});

describe("Toast - auto-dismiss with fake timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes toast after 4000ms", () => {
    render(
      <ToastProvider>
        <TestButton />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Show Toast").click();
    });
    expect(screen.getByText("Hello")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });
});