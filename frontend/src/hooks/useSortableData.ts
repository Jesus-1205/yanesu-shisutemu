import { useMemo, useState, useCallback } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

export function useSortableData<T extends Record<string, unknown>>(
  items: T[],
  defaultSortKey?: keyof T,
  defaultDirection: SortDirection = "asc",
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(
    defaultSortKey ? { key: defaultSortKey, direction: defaultDirection } : null,
  );

  const requestSort = useCallback(
    (key: keyof T) => {
      setSortConfig((prev) => {
        if (prev?.key === key) {
          if (prev.direction === "asc") return { key, direction: "desc" };
          if (prev.direction === "desc") return null;
          return { key, direction: "asc" };
        }
        return { key, direction: "asc" };
      });
    },
    [],
  );

  const sorted = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) return items;
    const { key, direction } = sortConfig;
    return [...items].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return direction === "asc" ? av - bv : bv - av;
      }
      const nv = Number(av);
      const nbv = Number(bv);
      if (!isNaN(nv) && !isNaN(nbv)) {
        return direction === "asc" ? nv - nbv : nbv - nv;
      }
      const cmp = String(av).localeCompare(String(bv), "es-VE");
      return direction === "asc" ? cmp : -cmp;
    });
  }, [items, sortConfig]);

  return { sorted, sortConfig, requestSort };
}
