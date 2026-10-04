import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

export interface UsePosSearchOptions {
  debounceMs?: number;
}

export function usePosSearch(options: UsePosSearchOptions = {}) {
  const { debounceMs = 300 } = options;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const resetSearch = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
  }, []);

  return {
    search,
    setSearch,
    debouncedSearch,
    searchRef,
    handleSearchChange,
    resetSearch,
  };
}
