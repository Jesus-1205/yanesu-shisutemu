import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { Crumb } from "../../ui-components/Breadcrumbs";
import { api } from "../../services/api";
import { breadcrumbMap } from "../config/navigation";

export function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  const isProductEdit = segments[0] === "products" && segments.length === 3 && segments[2] === "edit";
  const productId = isProductEdit ? segments[1] : null;

  useEffect(() => {
    if (productId && !entityNames[productId] && !requestedRef.current.has(productId)) {
      requestedRef.current.add(productId);
      api.getProduct(Number(productId))
        .then((p) => setEntityNames((prev) => ({ ...prev, [productId]: p.nombre })))
        .catch(() => setEntityNames((prev) => ({ ...prev, [productId]: `#${productId}` })));
    }
  }, [productId, entityNames]);

  const crumbs = useMemo<Crumb[]>(() => {
    const result: Crumb[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (i === 1 && isProductEdit && productId) {
        const name = entityNames[productId] || `Producto #${productId}`;
        result.push({ label: name });
        continue;
      }

      const label = breadcrumbMap[segment] ?? segment;
      if (i < segments.length - 1) {
        result.push({ label, href: `/${segments.slice(0, i + 1).join("/")}` });
      } else {
        result.push({ label });
      }
    }
    return result;
  }, [segments, isProductEdit, productId, entityNames]);

  return crumbs;
}
