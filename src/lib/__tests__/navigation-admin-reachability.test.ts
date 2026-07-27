import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { adminNavItems, adminNavGroups } from "@/lib/navigation";

/**
 * Every admin page must be reachable from the sidebar.
 *
 * `/admin/settings` (runtime system config) shipped registered in the router but
 * absent from BOTH nav lists, so the only way to reach a fully-built page was to
 * type the URL. This test pins that class of bug: a route registered but never
 * linked is invisible to the operator it was built for.
 *
 * Deliberately reads router.tsx as text — importing it pulls in every lazy route
 * component, the query client and i18n.
 */

const ROUTER_SRC = readFileSync(resolve(__dirname, "../../router.tsx"), "utf8");

/** Admin route paths declared in the router, excluding detail/param routes. */
function declaredAdminRoutes(): string[] {
  const paths = [...ROUTER_SRC.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
  return paths.filter(
    (p) =>
      p.startsWith("/admin/") &&
      // Param routes (e.g. /admin/users/$userId) are reached by drilling in from
      // a list page, not from the sidebar.
      !p.includes("$"),
  );
}

const flatHrefs = new Set(adminNavItems.map((i) => i.href));
const groupedHrefs = new Set(
  adminNavGroups.flatMap((g) => g.items.map((i) => i.href)),
);

describe("admin sidebar reachability", () => {
  it("links every non-param admin route from the flat nav", () => {
    const missing = declaredAdminRoutes().filter((p) => !flatHrefs.has(p));
    expect(missing).toEqual([]);
  });

  it("links every non-param admin route from the grouped nav", () => {
    const missing = declaredAdminRoutes().filter((p) => !groupedHrefs.has(p));
    expect(missing).toEqual([]);
  });

  it("keeps the two nav shapes in sync", () => {
    // A page present in one list but not the other is reachable only for some
    // sidebar states — the exact inconsistency that hid /admin/settings.
    expect([...flatHrefs].sort()).toEqual([...groupedHrefs].sort());
  });

  it("includes the runtime system-config page specifically", () => {
    // Regression guard for the page that was orphaned.
    expect(flatHrefs.has("/admin/settings")).toBe(true);
    expect(groupedHrefs.has("/admin/settings")).toBe(true);
  });

  it("does not reuse the account-settings i18n key for system config", () => {
    // nav.settings is the signed-in user's own account settings; reusing it here
    // would label two different destinations identically.
    const item = adminNavItems.find((i) => i.href === "/admin/settings");
    expect(item).toBeDefined();
    expect(item?.i18nKey).toBe("nav.system_config");
    expect(item?.i18nKey).not.toBe("nav.settings");
  });

  it("points every admin nav href at a route that exists", () => {
    // The inverse failure: a sidebar link to a route nobody registered 404s.
    const declared = new Set(
      [...ROUTER_SRC.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]),
    );
    const dangling = [...flatHrefs].filter((h) => !declared.has(h));
    expect(dangling).toEqual([]);
  });
});
