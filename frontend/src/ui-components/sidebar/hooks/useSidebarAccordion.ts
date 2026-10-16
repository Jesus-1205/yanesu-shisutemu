import { useState, useCallback } from "react";

export interface UseSidebarAccordionOptions {
  itemCount: number;
  expandAll?: boolean;
}

export function useSidebarAccordion({
  itemCount,
  expandAll = false,
}: UseSidebarAccordionOptions) {
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(() => {
    if (expandAll) {
      return new Set(Array.from({ length: itemCount }, (_, i) => i));
    }
    return new Set<number>();
  });

  const toggleSubmenu = useCallback(
    (index: number) => {
      if (expandAll) return;
      setExpandedMenus((prev) => {
        const next = new Set<number>();
        if (!prev.has(index)) {
          next.add(index);
        }
        return next;
      });
    },
    [expandAll]
  );

  const isExpanded = useCallback(
    (index: number) => {
      if (expandAll) return true;
      return expandedMenus.has(index);
    },
    [expandAll, expandedMenus]
  );

  return {
    isExpanded,
    toggleSubmenu,
    expandedMenus,
  };
}
