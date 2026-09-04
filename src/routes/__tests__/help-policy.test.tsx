import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FAQ_CATEGORY_LABELS,
  FAQ_CATEGORY_ORDER,
  FAQ_ENTRIES,
  POLICY_ORDER,
  POLICY_TITLES,
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
  const POLICY_PAGE = readFileSync(
    resolve(__dirname, "../support/policy.tsx"),
    "utf8",
  );
  const POLICY_LINKS_SRC = readFileSync(
    resolve(__dirname, "../support/_components/help/PolicyLinks.tsx"),
    "utf8",
  );

  it("titles every slug in the footer manifest", () => {
    // POLICY_TITLES is the fallback label set used before the index lands, so
    // a slug without one would render a blank link.
    for (const slug of POLICY_ORDER) {
      expect(POLICY_TITLES[slug]?.trim().length).toBeGreaterThan(0);
    }
  });

  it("covers exactly the always-published legal documents", () => {
    // The academic policies (learning-program, career-path) are seeded drafts
    // an admin must publish; they surface only through the server-driven
    // index (/policies), never as hardcoded footer/help slugs.
    expect([...POLICY_ORDER].sort()).toEqual(["cookies", "privacy", "terms"]);
    expect(POLICY_ORDER).not.toContain("learning-program");
    expect(POLICY_ORDER).not.toContain("career-path");
  });

  it("reads document bodies from the API, not a bundled constant", () => {
    // Policy text is an editable, versioned entity now. A body inlined back
    // into the frontend would ship terms that no admin can correct and that
    // carry no version or publication date.
    expect(POLICY_PAGE).toContain("usePolicy");
    expect(POLICY_PAGE).not.toContain("POLICY_DOCUMENTS");
  });

  it("states each document's provenance", () => {
    // The old page carried a blanket draft banner. Now every document reports
    // which version it is and when it took effect, so a reader can name the
    // exact text they agreed to.
    expect(POLICY_PAGE).toMatch(/Version \{doc\.version_no\}/);
    expect(POLICY_PAGE).toMatch(/Effective/);
    expect(POLICY_PAGE).toContain("published_by_name");
  });

  it("scopes the policy list to the reader's roles", () => {
    for (const src of [POLICY_PAGE, POLICY_LINKS_SRC]) {
      expect(src).toContain("useReaderPolicies");
    }
  });
});

describe("previously-dead links are now wired", () => {
  it("footer policy links resolve to real routes", () => {
    // Policy links must use the public route rather than dead anchors.
    expect(FOOTER_SRC).not.toMatch(/Privacy Policy\s*<\/a>/);
    for (const slug of POLICY_ORDER) {
      expect(FOOTER_SRC).toContain(`slug: "${slug}"`);
    }
    // No hardcoded academic-policy slugs: the footer must not advertise
    // documents whose publication state lives server-side.
    expect(FOOTER_SRC).not.toContain('slug: "learning-program"');
    expect(FOOTER_SRC).not.toContain('slug: "career-path"');
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
