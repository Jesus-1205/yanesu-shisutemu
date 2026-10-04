import { describe, it, expect } from "vitest";
import { router } from "@/router";

describe("router configuration", () => {
  it("defines core root routes", () => {
    const routes = router.routes;
    const paths = routes.map((r) => r.path);

    expect(paths).toContain("/login");
    expect(paths).toContain("/setup");
    expect(paths).toContain("/");
    expect(paths).toContain("*");
  });

  it("contains all feature routes inside the main layout", () => {
    const rootRoute = router.routes.find((r) => r.path === "/");
    expect(rootRoute).toBeDefined();
    expect(rootRoute?.children).toBeDefined();

    const appLayoutRoute = rootRoute?.children?.[0];
    expect(appLayoutRoute).toBeDefined();
    expect(appLayoutRoute?.children).toBeDefined();

    const childPaths = appLayoutRoute?.children?.map((c) => c.path || "index");
    expect(childPaths).toContain("index");
    expect(childPaths).toContain("dashboard");
    expect(childPaths).toContain("users");
    expect(childPaths).toContain("products");
    expect(childPaths).toContain("categories");
    expect(childPaths).toContain("suppliers");
    expect(childPaths).toContain("buys");
    expect(childPaths).toContain("invoices");
    expect(childPaths).toContain("sales");
    expect(childPaths).toContain("payment-methods");
    expect(childPaths).toContain("price-rules");
    expect(childPaths).toContain("combos");
    expect(childPaths).toContain("exchange-rates");
    expect(childPaths).toContain("reports");
    expect(childPaths).toContain("retornables");
    expect(childPaths).toContain("settings");
    expect(childPaths).toContain("ui-components");
  });

  it("has settings nested subroutes configured", () => {
    const rootRoute = router.routes.find((r) => r.path === "/");
    const appLayoutRoute = rootRoute?.children?.[0];
    const settingsRoute = appLayoutRoute?.children?.find(
      (c) => c.path === "settings",
    );

    expect(settingsRoute).toBeDefined();
    expect(settingsRoute?.children).toBeDefined();

    const settingsSubpaths = settingsRoute?.children?.map(
      (c) => c.path || "index",
    );
    expect(settingsSubpaths).toContain("index");
    expect(settingsSubpaths).toContain("users");
    expect(settingsSubpaths).toContain("payment-methods");
    expect(settingsSubpaths).toContain("system");
  });
});
