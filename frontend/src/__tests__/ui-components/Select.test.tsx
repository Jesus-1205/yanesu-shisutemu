import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Select from "../../ui-components/Select";

const options = [
  { value: "1", label: "Option A" },
  { value: "2", label: "Option B" },
  { value: "3", label: "Option C" },
];

describe("Select", () => {
  it("renders label and options", () => {
    render(<Select label="Choose" options={options} />);
    expect(screen.getByText("Choose")).toBeInTheDocument();
    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
  });

  it("renders placeholder when provided", () => {
    render(<Select label="Choose" options={options} placeholder="Select..." />);
    expect(screen.getByText("Select...")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<Select label="Choose" options={options} error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("disables select when disabled", () => {
    render(<Select label="Choose" options={options} disabled />);
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toBeDisabled();
  });

  it("calls onChange when selection changes", async () => {
    const onChange = vi.fn();
    render(<Select label="Choose" options={options} onChange={onChange} />);
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "2");
    expect(onChange).toHaveBeenCalled();
  });

  it("applies size sm classes", () => {
    const { container } = render(<Select options={options} size="sm" />);
    const select = container.querySelector("select");
    expect(select?.className).toContain("text-xs");
    expect(select?.className).toContain("rounded-md");
  });

  it("applies size md classes by default", () => {
    const { container } = render(<Select options={options} />);
    const select = container.querySelector("select");
    expect(select?.className).toContain("text-sm");
    expect(select?.className).toContain("rounded-lg");
  });

  it("renders without label wrapper when no label", () => {
    const { container } = render(<Select options={options} />);
    const label = container.querySelector("label");
    expect(label).not.toBeInTheDocument();
  });
});
