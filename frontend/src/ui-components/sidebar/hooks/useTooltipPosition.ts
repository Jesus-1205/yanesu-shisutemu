import { useState, useRef, useCallback, useEffect } from "react";

export interface UseTooltipPositionOptions {
  collapsed: boolean;
  offset?: number;
}

export function useTooltipPosition({
  collapsed,
  offset = 8,
}: UseTooltipPositionOptions) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const handleMouseEnter = useCallback(() => {
    if (!collapsed) return;
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setPos({
        top: rect.top + rect.height / 2,
        left: rect.right + offset,
      });
    }
    setShowTooltip(true);
  }, [collapsed, offset]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const hideTooltip = useCallback(() => {
    setShowTooltip(false);
  }, []);

  useEffect(() => {
    if (!collapsed) {
      setShowTooltip(false);
    }
  }, [collapsed]);

  return {
    linkRef,
    showTooltip,
    pos,
    handleMouseEnter,
    handleMouseLeave,
    hideTooltip,
  };
}
