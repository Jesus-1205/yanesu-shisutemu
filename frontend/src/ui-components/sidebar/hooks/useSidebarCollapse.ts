import { useState, useCallback } from "react";

interface UseSidebarCollapseOptions {
  controlledCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  forceExpanded?: boolean;
}

export function useSidebarCollapse({
  controlledCollapsed,
  onCollapsedChange,
  forceExpanded = false,
}: UseSidebarCollapseOptions) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed = forceExpanded
    ? false
    : (controlledCollapsed ?? internalCollapsed);

  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed,
  };
}
