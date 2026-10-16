import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHoverFlyout } from "../../../ui-components/sidebar/hooks/useHoverFlyout";

describe("useHoverFlyout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with isHovering false", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: true }));
    expect(result.current.isHovering).toBe(false);
    expect(result.current.hoverPos).toEqual({ top: 0, left: 0 });
  });

  it("does not show hover menu if collapsed is false", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: false }));
    act(() => {
      result.current.showHoverMenu();
    });
    expect(result.current.isHovering).toBe(false);
  });

  it("shows hover menu and computes position when collapsed is true", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: true, offset: 10 }));

    // Mock button ref getBoundingClientRect
    const fakeBtn = document.createElement("button");
    fakeBtn.getBoundingClientRect = () => ({
      top: 100,
      right: 50,
      left: 10,
      bottom: 140,
      width: 40,
      height: 40,
      x: 10,
      y: 100,
      toJSON: () => {},
    });
    result.current.btnRef.current = fakeBtn;

    act(() => {
      result.current.showHoverMenu();
    });

    expect(result.current.isHovering).toBe(true);
    expect(result.current.hoverPos).toEqual({ top: 100, left: 60 });
  });

  it("hides hover menu with delay on hideHoverMenu", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: true }));

    act(() => {
      result.current.showHoverMenu();
    });
    expect(result.current.isHovering).toBe(true);

    act(() => {
      result.current.hideHoverMenu();
    });
    // Not hidden immediately
    expect(result.current.isHovering).toBe(true);

    // Fast-forward timeout 120ms
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(result.current.isHovering).toBe(false);
  });

  it("keepHoverMenu cancels close timeout", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: true }));

    act(() => {
      result.current.showHoverMenu();
      result.current.hideHoverMenu();
      result.current.keepHoverMenu();
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isHovering).toBe(true);
  });

  it("closes hover menu immediately on closeHoverMenu", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: true }));

    act(() => {
      result.current.showHoverMenu();
    });
    expect(result.current.isHovering).toBe(true);

    act(() => {
      result.current.closeHoverMenu();
    });
    expect(result.current.isHovering).toBe(false);
  });

  it("resets isHovering when collapsed changes to false", () => {
    const { result, rerender } = renderHook(
      (props) => useHoverFlyout(props),
      { initialProps: { collapsed: true } }
    );

    act(() => {
      result.current.showHoverMenu();
    });
    expect(result.current.isHovering).toBe(true);

    rerender({ collapsed: false });
    expect(result.current.isHovering).toBe(false);
  });
});
