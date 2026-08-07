import { useState, useEffect } from "react";

type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

const queries: Record<Breakpoint, string> = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
};

function getBreakpoint(width: number): Breakpoint {
  if (width >= 1536) return "2xl";
  if (width >= 1280) return "xl";
  if (width >= 1024) return "lg";
  if (width >= 768) return "md";
  if (width >= 640) return "sm";
  return "sm";
}

function getMatches(): Record<Breakpoint, boolean> {
  if (typeof window === "undefined") {
    return { sm: false, md: false, lg: false, xl: false, "2xl": false };
  }
  return {
    sm: window.matchMedia(queries.sm).matches,
    md: window.matchMedia(queries.md).matches,
    lg: window.matchMedia(queries.lg).matches,
    xl: window.matchMedia(queries.xl).matches,
    "2xl": window.matchMedia(queries["2xl"]).matches,
  };
}

export function useBreakpoint() {
  const [matches, setMatches] = useState<Record<Breakpoint, boolean>>(getMatches);
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const mqls = (Object.keys(queries) as Breakpoint[]).map((key) => {
      const mql = window.matchMedia(queries[key]);
      const handler = () => {
        setMatches((prev) => ({ ...prev, [key]: mql.matches }));
        setWidth(window.innerWidth);
      };
      mql.addEventListener("change", handler);
      return { mql, handler };
    });

    setWidth(window.innerWidth);

    return () => {
      mqls.forEach(({ mql, handler }) =>
        mql.removeEventListener("change", handler)
      );
    };
  }, []);

  const current = getBreakpoint(width);

  return {
    current,
    width,
    matches,
    isMobile: !matches.md,
    isTablet: matches.md && !matches.lg,
    isDesktop: matches.lg,
    isWide: matches.xl,
    isUltrawide: matches["2xl"],
  };
}

export type { Breakpoint };
