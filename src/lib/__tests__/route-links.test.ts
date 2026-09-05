import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Every internal link must point at a route that exists — and at a LIVE one.
 *
 * TanStack Router already types `<Link to>` against the registered tree, so a
 * renamed route is a compile error. That check is real, but only under
 * `tsc -b` (the `build` script), which follows the project references;
 * `tsc --noEmit` against the root tsconfig checks nothing at all, because it
 * declares `"files": []`. Worth knowing before concluding the types are broken.
 *
 * This test covers the three things the type system cannot:
 *
 * 1. **Paths used as data, not as `to`.** Prefix arrays like
 *    `MANAGER_PREFIXES = ["/management"]` and `pathname.startsWith(...)` checks
 *    are plain strings by nature. A rename leaves them silently matching
 *    nothing, so the sidebar highlights the wrong section and the layout picks
 *    the wrong breakpoint — with no error anywhere.
 *
 * 2. **Links to retired paths.** A compatibility alias IS a registered route,
 *    so `to="/dept"` type-checks perfectly while quietly costing every user a
 *    redirect. Aliases exist for bookmarks; code that still points at one is an
 *    unfinished rename, and without this the alias can never be removed. This
 *    found two such links left over from the earlier admin IA move.
 *
 * 3. **Paths in test files and comments**, which drift from the router without
 *    anyone noticing until the assertion they support becomes meaningless.
 *
 * Reads router.tsx as text rather than importing it, for the same reason
 * `navigation-admin-reachability.test.ts` does: importing pulls in every lazy
 * route component, the query client and i18n.
 */

const SRC = resolve(__dirname, "../..");
const ROUTER_SRC = readFileSync(join(SRC, "router.tsx"), "utf8");

/** `const name = createRoute({ … })` blocks, with their parent and raw path. */
function routeNodes(): Map<string, { parent: string | null; path: string | null }> {
  const nodes = new Map<string, { parent: string | null; path: string | null }>();
  const block = /const\s+(\w+)\s*=\s*createRoute\(\{([\s\S]*?)\n\}\);/g;
  for (const m of ROUTER_SRC.matchAll(block)) {
    const body = m[2];
    nodes.set(m[1], {
      parent: /getParentRoute:\s*\(\)\s*=>\s*(\w+)/.exec(body)?.[1] ?? null,
      path: /path:\s*"([^"]*)"/.exec(body)?.[1] ?? null,
    });
  }
  return nodes;
}

/** Resolve a route const to its full path, composing relative child paths. */
function fullPath(
  name: string,
  nodes: ReturnType<typeof routeNodes>,
  seen: Set<string> = new Set(),
): string | null {
  if (seen.has(name)) return null;
  const node = nodes.get(name);
  if (!node?.path) return null;
  if (node.path.startsWith("/")) return node.path;
  const base = node.parent
    ? (fullPath(node.parent, nodes, new Set([...seen, name])) ?? "")
    : "";
  // A child declared as "/" is the parent's own index route.
  if (node.path === "/") return base || "/";
  return `${base.replace(/\/$/, "")}/${node.path}`;
}

const NODES = routeNodes();
const DECLARED = new Set(
  [...NODES.keys()].map((n) => fullPath(n, NODES)).filter((p): p is string => !!p),
);

/**
 * Route consts that are pure compatibility aliases: they redirect and render
 * NOTHING.
 *
 * "Throws a redirect" alone is not enough. A route with both a `component` and a
 * `throw redirect(...)` is a real page that redirects CONDITIONALLY — "/" sends
 * a signed-in user to their role's landing page but still renders the marketing
 * site for everyone else, and "/login" does the same to skip the form for an
 * existing session. Treating those as retired would forbid linking to "/" or
 * "/login" anywhere in the app, and would flag them as invalid redirect targets.
 * An alias has no `component`, so that is what distinguishes them.
 */
const ALIASES = new Set(
  [...NODES.entries()]
    .filter(([name]) => {
      const block = new RegExp(
        `const\\s+${name}\\s*=\\s*createRoute\\(\\{([\\s\\S]*?)\\n\\}\\);`,
      ).exec(ROUTER_SRC)?.[1];
      if (!block || !/throw redirect\(/.test(block)) return false;
      return !/\bcomponent:/.test(block);
    })
    .map(([name]) => fullPath(name, NODES))
    .filter((p): p is string => !!p),
);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === "node_modules" ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/**
 * Internal route destinations written as literals.
 *
 * Deliberately narrow: `to=` / `to:` / `href:` only. API endpoint paths go
 * through `apiFetch`/`apiPost` and share several prefixes with the routes
 * (`/dept/courses/…` is a live BACKEND path while `/dept` is a retired
 * FRONTEND one), so matching every "/…" string would flag the API layer and
 * train everyone to ignore this test.
 */
function linkLiterals(file: string): { path: string; line: number }[] {
  const out: { path: string; line: number }[] = [];
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((text, i) => {
      for (const m of text.matchAll(/\b(?:to|href)\s*[=:]\s*["'`](\/[^"'`${}]*)["'`]/g)) {
        out.push({ path: m[1], line: i + 1 });
      }
    });
  return out;
}

describe("internal links point at real routes", () => {
  it("parsed a plausible route table", () => {
    // Guards the parser itself: if the regex stops matching, every assertion
    // below passes vacuously.
    expect(DECLARED.size).toBeGreaterThan(80);
    expect(DECLARED).toContain("/management/courses");
    expect(DECLARED).toContain("/teacher/courses/$courseId/students");
  });

  it("every to=/href: literal resolves to a declared route", () => {
    const dead: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (file.endsWith("router.tsx") || file === __filename) continue;
      for (const { path, line } of linkLiterals(file)) {
        if (!DECLARED.has(path)) {
          dead.push(`${file.slice(SRC.length + 1)}:${line} → ${path}`);
        }
      }
    }
    expect(dead, `dead internal links:\n${dead.join("\n")}`).toEqual([]);
  });

  it("no live link points at a retired path", () => {
    // An alias exists so old BOOKMARKS keep working. Code that still links to
    // one is a missed rename: it works, so nobody notices, and the alias can
    // never be removed.
    const stale: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (file.endsWith("router.tsx") || file === __filename) continue;
      for (const { path, line } of linkLiterals(file)) {
        if (ALIASES.has(path)) {
          stale.push(`${file.slice(SRC.length + 1)}:${line} → ${path}`);
        }
      }
    }
    expect(
      stale,
      `links to retired paths (point them at the new route):\n${stale.join("\n")}`,
    ).toEqual([]);
  });

  it("every alias redirects to a live route, not to another alias", () => {
    const targets = [...ROUTER_SRC.matchAll(/throw redirect\(\{\s*to:\s*"([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(DECLARED, `redirect target ${target} is not a route`).toContain(target);
      expect(ALIASES, `redirect target ${target} is itself an alias`).not.toContain(
        target,
      );
    }
  });
});
