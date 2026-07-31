import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "../../ui-components/Input";

describe("Input", () => {
  it("renders with label and placeholder", () => {
    render(<Input label="Name" placeholder="Enter name" />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<Input label="Name" error="Required field" />);
    expect(screen.getByText("Required field")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders hint when no error", () => {
    render(<Input label="Name" hint="Optional" />);
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("does not render hint when error is present", () => {
    render(<Input label="Name" error="Error" hint="Hint" />);
    expect(screen.queryByText("Hint")).not.toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("disables input when disabled", () => {
    render(<Input label="Name" disabled />);
    expect(screen.getByLabelText("Name")).toBeDisabled();
  });

  it("accepts user input", async () => {
    const onChange = vi.fn();
    render(<Input label="Name" onChange={onChange} />);
    const input = screen.getByLabelText("Name");
    await userEvent.type(input, "hello");
    expect(onChange).toHaveBeenCalled();
  });

  it("uses custom id when provided", () => {
    render(<Input label="Name" id="custom-id" />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("id", "custom-id");
  });
});