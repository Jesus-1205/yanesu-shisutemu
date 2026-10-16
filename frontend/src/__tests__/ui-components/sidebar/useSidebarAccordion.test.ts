import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSidebarAccordion } from "../../../ui-components/sidebar/hooks/useSidebarAccordion";

describe("useSidebarAccordion", () => {
  it("initializes with no expanded menus when expandAll is false", () => {
    const { result } = renderHook(() =>
      useSidebarAccordion({ itemCount: 3, expandAll: false })
    );
    expect(result.current.isExpanded(0)).toBe(false);
    expect(result.current.isExpanded(1)).toBe(false);
  });

  it("initializes with all menus expanded when expandAll is true", () => {
    const { result } = renderHook(() =>
      useSidebarAccordion({ itemCount: 3, expandAll: true })
    );
    expect(result.current.isExpanded(0)).toBe(true);
    expect(result.current.isExpanded(1)).toBe(true);
    expect(result.current.isExpanded(2)).toBe(true);
  });

  it("toggles one submenu open and closes other open submenus", () => {
    const { result } = renderHook(() =>
      useSidebarAccordion({ itemCount: 3, expandAll: false })
    );

    act(() => {
      result.current.toggleSubmenu(0);
    });
    expect(result.current.isExpanded(0)).toBe(true);
    expect(result.current.isExpanded(1)).toBe(false);

    // Opening index 1 closes index 0
    act(() => {
      result.current.toggleSubmenu(1);
    });
    expect(result.current.isExpanded(0)).toBe(false);
    expect(result.current.isExpanded(1)).toBe(true);

    // Clicking index 1 again closes index 1
    act(() => {
      result.current.toggleSubmenu(1);
    });
    expect(result.current.isExpanded(1)).toBe(false);
  });

  it("does not change expanded state when expandAll is true", () => {
    const { result } = renderHook(() =>
      useSidebarAccordion({ itemCount: 3, expandAll: true })
    );

    act(() => {
      result.current.toggleSubmenu(0);
    });
    expect(result.current.isExpanded(0)).toBe(true);
  });
});
