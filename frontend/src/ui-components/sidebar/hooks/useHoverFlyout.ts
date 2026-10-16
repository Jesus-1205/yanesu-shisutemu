import { useState, useRef, useCallback, useEffect } from "react";

export interface UseHoverFlyoutOptions {
  collapsed: boolean;
  offset?: number;
}

export function useHoverFlyout({
  collapsed,
  offset = 8,
}: UseHoverFlyoutOptions) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showHoverMenu = useCallback(() => {
    if (!collapsed) return;
    clearTimeout(hoverTimeoutRef.current);
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setHoverPos({ top: rect.top, left: rect.right + offset });
    }
    setIsHovering(true);
  }, [collapsed, offset]);

  const hideHoverMenu = useCallback(() => {
    if (!collapsed) return;
    hoverTimeoutRef.current = setTimeout(() => setIsHovering(false), 120);
  }, [collapsed]);

  const keepHoverMenu = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
  }, []);

  const closeHoverMenu = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
    setIsHovering(false);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!collapsed) {
      setIsHovering(false);
    }
  }, [collapsed]);

  return {
    btnRef,
    isHovering,
    hoverPos,
    showHoverMenu,
    hideHoverMenu,
    keepHoverMenu,
    closeHoverMenu,
  };
}
