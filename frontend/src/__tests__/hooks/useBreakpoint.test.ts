import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useBreakpoint } from "@/hooks/useBreakpoint";

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const match = query.match(/min-width:\s*(\d+)px/);
    const minWidth = match ? parseInt(match[1]) : 0;
    return {
      matches: window.innerWidth >= minWidth,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });
}

describe("useBreakpoint", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns sm for mobile widths", () => {
    setWidth(375);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.current).toBe("sm");
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it("returns md for tablet widths", () => {
    setWidth(768);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.current).toBe("md");
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it("returns lg for laptop widths", () => {
    setWidth(1024);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.current).toBe("lg");
    expect(result.current.isDesktop).toBe(true);
  });

  it("returns xl for wide widths", () => {
    setWidth(1280);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.current).toBe("xl");
    expect(result.current.isWide).toBe(true);
  });

  it("returns 2xl for ultrawide widths", () => {
    setWidth(1920);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.current).toBe("2xl");
    expect(result.current.isUltrawide).toBe(true);
  });

  it("returns correct width", () => {
    setWidth(1440);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.width).toBe(1440);
  });
});
