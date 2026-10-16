import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSidebarCollapse } from "../../../ui-components/sidebar/hooks/useSidebarCollapse";

describe("useSidebarCollapse", () => {
  it("defaults to uncollapsed when no props are provided", () => {
    const { result } = renderHook(() => useSidebarCollapse({}));
    expect(result.current.collapsed).toBe(false);
  });

  it("toggles internal collapsed state when uncontrolled", () => {
    const { result } = renderHook(() => useSidebarCollapse({}));
    act(() => {
      result.current.toggleCollapsed();
    });
    expect(result.current.collapsed).toBe(true);
    act(() => {
      result.current.toggleCollapsed();
    });
    expect(result.current.collapsed).toBe(false);
  });

  it("honors controlled collapsed prop and calls onCollapsedChange", () => {
    const onCollapsedChange = vi.fn();
    const { result, rerender } = renderHook(
      (props) => useSidebarCollapse(props),
      {
        initialProps: {
          controlledCollapsed: false,
          onCollapsedChange,
        },
      }
    );

    expect(result.current.collapsed).toBe(false);

    act(() => {
      result.current.toggleCollapsed();
    });
    expect(onCollapsedChange).toHaveBeenCalledWith(true);

    rerender({ controlledCollapsed: true, onCollapsedChange });
    expect(result.current.collapsed).toBe(true);
  });

  it("forceExpanded forces collapsed to false regardless of controlled value", () => {
    const { result } = renderHook(() =>
      useSidebarCollapse({ controlledCollapsed: true, forceExpanded: true })
    );
    expect(result.current.collapsed).toBe(false);
  });
});
