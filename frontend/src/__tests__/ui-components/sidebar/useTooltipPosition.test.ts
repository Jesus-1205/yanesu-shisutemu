import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTooltipPosition } from "../../../ui-components/sidebar/hooks/useTooltipPosition";

describe("useTooltipPosition", () => {
  it("initializes with showTooltip false", () => {
    const { result } = renderHook(() => useTooltipPosition({ collapsed: true }));
    expect(result.current.showTooltip).toBe(false);
    expect(result.current.pos).toEqual({ top: 0, left: 0 });
  });

  it("does not show tooltip if collapsed is false", () => {
    const { result } = renderHook(() => useTooltipPosition({ collapsed: false }));
    act(() => {
      result.current.handleMouseEnter();
    });
    expect(result.current.showTooltip).toBe(false);
  });

  it("shows tooltip and computes coordinates when collapsed is true", () => {
    const { result } = renderHook(() => useTooltipPosition({ collapsed: true, offset: 8 }));

    const fakeLink = document.createElement("a");
    fakeLink.getBoundingClientRect = () => ({
      top: 50,
      right: 70,
      left: 10,
      bottom: 90,
      width: 60,
      height: 40,
      x: 10,
      y: 50,
      toJSON: () => {},
    });
    result.current.linkRef.current = fakeLink;

    act(() => {
      result.current.handleMouseEnter();
    });

    expect(result.current.showTooltip).toBe(true);
    // top = rect.top + rect.height / 2 = 50 + 20 = 70; left = rect.right + 8 = 78
    expect(result.current.pos).toEqual({ top: 70, left: 78 });

    act(() => {
      result.current.handleMouseLeave();
    });
    expect(result.current.showTooltip).toBe(false);
  });

  it("hideTooltip closes tooltip", () => {
    const { result } = renderHook(() => useTooltipPosition({ collapsed: true }));
    act(() => {
      result.current.handleMouseEnter();
    });
    act(() => {
      result.current.hideTooltip();
    });
    expect(result.current.showTooltip).toBe(false);
  });

  it("resets showTooltip when collapsed changes to false", () => {
    const { result, rerender } = renderHook(
      (props) => useTooltipPosition(props),
      { initialProps: { collapsed: true } }
    );
    act(() => {
      result.current.handleMouseEnter();
    });
    expect(result.current.showTooltip).toBe(true);

    rerender({ collapsed: false });
    expect(result.current.showTooltip).toBe(false);
  });
});
