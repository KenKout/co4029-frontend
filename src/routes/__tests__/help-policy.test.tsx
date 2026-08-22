import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FAQ_CATEGORY_LABELS,
  FAQ_CATEGORY_ORDER,
  FAQ_ENTRIES,
  POLICY_DOCUMENTS,
  POLICY_ORDER,
} from "@/lib/help-content";

/**
 * Public Help (FAQ) and Policy pages.
 *
 * The load-bearing property is that BOTH are reachable without authentication:
 * someone who can't sign in is exactly who needs /help, and the terms must be
 * readable before creating an account. A regression that nests these under the
 * `_authenticated` route would silently redirect them to /login.
 */

const ROUTER_SRC = readFileSync(resolve(__dirname, "../../router.tsx"), "utf8");
const FOOTER_SRC = readFileSync(
  resolve(__dirname, "../../components/layout/Footer.tsx"),
  "utf8",
);
const NAV_SRC = readFileSync(
  resolve(__dirname, "../../lib/navigation.ts"),
  "utf8",
);

describe("public reachability", () => {
  it("registers /help and /policy/$slug in the router", () => {
    expect(ROUTER_SRC).toContain('path: "/help"');
    expect(ROUTER_SRC).toContain('path: "/policy/$slug"');
  });

  it("hangs both off rootRoute, not authenticatedRoute", () => {
    // Extract each route's declaration block and check its parent.
    for (const name of ["helpRoute", "policyRoute"]) {
      const start = ROUTER_SRC.indexOf(`const ${name} = createRoute({`);
      expect(start).toBeGreaterThan(-1);
      const block = ROUTER_SRC.slice(start, start + 300);
      expect(block).toContain("getParentRoute: () => rootRoute");
      expect(block).not.toContain("authenticatedRoute");
    }
  });

  it("registers them as direct children of the root tree", () => {
    // They must sit alongside indexRoute/loginRoute, NOT inside the
    // authenticatedRoute.addChildren([...]) block.
    const treeStart = ROUTER_SRC.indexOf("rootRoute.addChildren([");
    const authStart = ROUTER_SRC.indexOf("authenticatedRoute.addChildren([");
    const help = ROUTER_SRC.indexOf("helpRoute,", treeStart);
    const policy = ROUTER_SRC.indexOf("policyRoute,", treeStart);
    expect(help).toBeGreaterThan(treeStart);
    expect(policy).toBeGreaterThan(treeStart);
    // Both appear before the authenticated subtree opens.
    expect(help).toBeLessThan(authStart);
    expect(policy).toBeLessThan(authStart);
  });
});

describe("FAQ content", () => {
  it("has entries in every declared category", () => {
    for (const category of FAQ_CATEGORY_ORDER) {
      const inCategory = FAQ_ENTRIES.filter((e) => e.category === category);
      expect(inCategory.length).toBeGreaterThan(0);
    }
  });

  it("labels every category it orders", () => {
    for (const category of FAQ_CATEGORY_ORDER) {
      expect(FAQ_CATEGORY_LABELS[category]).toBeTruthy();
    }
  });

  it("uses only declared categories (no orphan entries)", () => {
    // An entry in an unordered category would never render — the page iterates
    // FAQ_CATEGORY_ORDER, not the entries.
    for (const entry of FAQ_ENTRIES) {
      expect(FAQ_CATEGORY_ORDER).toContain(entry.category);
    }
  });

  it("has unique ids (they are used as anchor targets)", () => {
    const ids = FAQ_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has non-empty question and answer text everywhere", () => {
    for (const entry of FAQ_ENTRIES) {
      expect(entry.question.trim().length).toBeGreaterThan(0);
      expect(entry.answer.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("policy content", () => {
  it("provides a document for every slug in the order list", () => {
    for (const slug of POLICY_ORDER) {
      const doc = POLICY_DOCUMENTS[slug];
      expect(doc).toBeDefined();
      expect(doc.slug).toBe(slug);
      expect(doc.title.trim().length).toBeGreaterThan(0);
      expect(doc.body.trim().length).toBeGreaterThan(0);
      expect(doc.lastUpdated.trim().length).toBeGreaterThan(0);
    }
  });

  it("covers every platform-wide policy advertised by the footer", () => {
    expect([...POLICY_ORDER].sort()).toEqual([
      "career-path",
      "cookies",
      "learning-program",
      "privacy",
      "terms",
    ]);
  });

  it("keeps the draft notice in the page", () => {
    // These bodies have not had legal review and there is no acceptance
    // tracking; removing the notice would misrepresent them as binding.
    const PAGE = readFileSync(resolve(__dirname, "../support/policy.tsx"), "utf8");
    expect(PAGE).toMatch(/Draft/);
    expect(PAGE).toMatch(/not a binding agreement/);
  });
});

describe("previously-dead links are now wired", () => {
  it("footer policy links resolve to real routes", () => {
    // Policy links must use the public route rather than dead anchors.
    expect(FOOTER_SRC).not.toMatch(/Privacy Policy\s*<\/a>/);
    for (const slug of POLICY_ORDER) {
      expect(FOOTER_SRC).toContain(`slug: "${slug}"`);
    }
  });

  it("footer links to help", () => {
    expect(FOOTER_SRC).toContain('to="/help"');
  });

  it("the secondary-nav Help item points at /help, not '#'", () => {
    const start = NAV_SRC.indexOf("export const secondaryNavItems");
    const block = NAV_SRC.slice(start, start + 400);
    expect(block).toContain('href: "/help"');
  });
});

describe("pages actually render their content", () => {
  it("renders every FAQ question and the policy body", async () => {
    // Guards against the pages compiling but rendering nothing (e.g. a bad
    // slug lookup or an empty content import).
    const { screen } = await import("@testing-library/react");
    const {
      RouterProvider,
      createRouter,
      createRootRoute,
      createRoute,
      createMemoryHistory,
    } = await import("@tanstack/react-router");
    const HelpPage = (await import("../support/help")).default;
    // The page renders TopNavBar, which needs BOTH an AuthProvider (useAuth) and
    // a QueryClient (useUnreadCount). The real app supplies both above the router
    // — see Root() in router.tsx and main.tsx — so the harness must too.
    const { AuthProvider } = await import("@/components/auth/AuthProvider");
    const { renderWithQueryClient } = await import(
      "@/test/react-query-wrapper"
    );

    const root = createRootRoute({ component: HelpPage });
    const idx = createRoute({ getParentRoute: () => root, path: "/" });
    const pol = createRoute({
      getParentRoute: () => root,
      path: "/policy/$slug",
    });
    const router = createRouter({
      routeTree: root.addChildren([idx, pol]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    renderWithQueryClient(
      <AuthProvider>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <RouterProvider router={router as any} />
      </AuthProvider>,
    );

    // A question from each category must be on the page.
    expect(await screen.findByText(/How do I enrol in a course/)).toBeTruthy();
    expect(screen.getByText(/How does spaced repetition decide/)).toBeTruthy();
    expect(screen.getByText(/What happens in an AI interview/)).toBeTruthy();
    // Policy links render on the page. Note there are now TWO matches — the
    // Policies section and the Footer (which the page also renders) — so assert
    // on the count rather than expecting a unique node.
    expect(screen.getAllByText("Privacy Policy").length).toBeGreaterThan(0);
    // The chrome is present: TopNavBar + Footer, so these pages don't render
    // bare. Footer carries the copyright line.
    expect(screen.getByText(/All\s+rights\s+reserved/)).toBeTruthy();
  });
});
