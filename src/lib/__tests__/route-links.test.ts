import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Every internal link must point at a route that exists.
 *
 * TanStack Router is supposed to give this for free: `<Link to>` is typed
 * against the registered route tree, so a renamed route is a compile error.
 * In this app it does not. `declare module … Register` IS present in
 * router.tsx, but the inference collapses somewhere in the 90-path tree and
 * both `RegisteredRouter["routesById"]` and the concrete `typeof router`
 * widen to `string` — verified by compiling `<Link to="/definitely-not-a-route">`
 * and a `keyof routesById` probe, neither of which errors. Two components
 * carry comments claiming the opposite; they are wrong.
 *
 * Until that is fixed (it likely means restructuring the route tree, not a
 * one-line change), this test is the only thing standing between a route
 * rename and a dead link. It caught nothing when written because the
 * `/dept` → `/management/courses` migration had just been swept by hand —
 * which is exactly the point: the sweep is not repeatable, and this is.
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

/** Route consts whose body throws a redirect — compatibility aliases. */
const ALIASES = new Set(
  [...NODES.entries()]
    .filter(([name]) => {
      const block = new RegExp(
        `const\\s+${name}\\s*=\\s*createRoute\\(\\{([\\s\\S]*?)\\n\\}\\);`,
      ).exec(ROUTER_SRC)?.[1];
      return !!block && /throw redirect\(/.test(block);
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
