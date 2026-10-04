import type { ChangeEvent } from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { usePosSearch } from "../../../../features/sales/hooks/usePosSearch";

describe("usePosSearch", () => {
  it("initializes with empty search and updates with debounce", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePosSearch({ debounceMs: 200 }));

    expect(result.current.search).toBe("");
    expect(result.current.debouncedSearch).toBe("");

    act(() => {
      result.current.handleSearchChange({
        target: { value: "cerveza" },
      } as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.search).toBe("cerveza");
    expect(result.current.debouncedSearch).toBe("");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.debouncedSearch).toBe("cerveza");
    vi.useRealTimers();
  });

  it("resets search properly", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePosSearch());

    act(() => {
      result.current.setSearch("ron");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedSearch).toBe("ron");

    act(() => {
      result.current.resetSearch();
    });

    expect(result.current.search).toBe("");
    expect(result.current.debouncedSearch).toBe("");
    vi.useRealTimers();
  });
});
