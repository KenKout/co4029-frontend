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

/**
 * Admin route paths declared in the router that represent a real page.
 *
 * Excluded:
 * - param routes (`/admin/users/$userId`) — reached by drilling into a list
 *   page, not from the sidebar.
 * - redirect-only routes — compatibility aliases for paths the IA has moved
 *   (the Operations merge left three behind). They render nothing, so linking
 *   one from the sidebar would just bounce the operator elsewhere; the
 *   destination is what belongs in the nav.
 */
function declaredAdminRoutes(): string[] {
  // Split on the route factory so each path is judged against its own body.
  const blocks = ROUTER_SRC.split("createRoute({").slice(1);
  return blocks.flatMap((block) => {
    const path = /path:\s*"([^"]+)"/.exec(block)?.[1];
    if (!path?.startsWith("/admin/") || path.includes("$")) return [];
    // `throw redirect({...})` inside beforeLoad marks an alias, not a page.
    return /throw redirect\(/.test(block) ? [] : [path];
  });
}

// Widened to `string` on purpose. `NavItem.href` is now typed against the
// router, so these Sets would otherwise carry the literal path union and
// refuse to be compared with the plain strings parsed out of router.tsx.
const flatHrefs = new Set<string>(adminNavItems.map((i) => i.href as string));
const groupedHrefs = new Set<string>(
  adminNavGroups.flatMap((g) => g.items.map((i) => i.href as string)),
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
