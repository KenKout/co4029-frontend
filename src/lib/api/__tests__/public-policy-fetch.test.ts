import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The reader policy endpoints must be callable with no session.
 *
 * `/help` and `/policy/$slug` are public for a reason that is easy to state
 * and easy to break: someone who cannot sign in is exactly who needs the
 * terms, and a user must be able to read them BEFORE creating an account.
 *
 * `help-policy.test.tsx` already pins the ROUTE — both hang off `rootRoute`,
 * not `authenticatedRoute`. That test kept passing while the pages were
 * unusable signed out, because the break was a layer below it: the hooks
 * called `apiFetch`, `apiFetch` calls `authenticatedFetch`, and
 * `authenticatedFetch` throws "Not authenticated" before it reaches the
 * network when there is no stored session. The route was reachable, the API
 * was open, and the request never left the browser.
 *
 * So this pins the transport rather than the routing. The two halves of the
 * guarantee now fail independently.
 */

/**
 * `useQuery` is mocked to hand back its own options object. The hooks are
 * thin, and the part that broke is which fetcher the query function reaches
 * for — asserting that through a real render would need a QueryClient and an
 * auth provider, neither of which is involved in the bug.
 */
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => options,
  useMutation: (options: unknown) => options,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  // What the real one does with no stored session: it rejects before it
  // reaches the network, which is the whole bug this file guards.
  authenticatedFetch: vi.fn(() =>
    Promise.reject(new Error("Not authenticated")),
  ),
  publicFetch: vi.fn(),
  setMfaRequired: vi.fn(),
}));

const { authenticatedFetch, publicFetch } = await import("@/lib/auth");
const { apiFetchPublic } = await import("@/lib/api/client");
const { usePolicies, usePolicy } = await import("@/lib/api/hooks/policies");

const authed = vi.mocked(authenticatedFetch);
const open = vi.mocked(publicFetch);

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/** Pull the query function off the options the hook returned. */
function queryFnOf(options: { queryFn?: unknown }) {
  const fn = options.queryFn;
  if (typeof fn !== "function") throw new Error("hook has no queryFn");
  return fn as () => Promise<unknown>;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("reader policy endpoints, signed out", () => {
  it("fetches one policy without a session", async () => {
    open.mockResolvedValue(ok({ slug: "terms", title: "Terms of Service" }));

    await expect(
      queryFnOf(usePolicy("terms") as { queryFn?: unknown })(),
    ).resolves.toMatchObject({ slug: "terms" });

    expect(open).toHaveBeenCalledTimes(1);
    expect(authed).not.toHaveBeenCalled();
  });

  it("fetches the index without a session", async () => {
    open.mockResolvedValue(ok([]));

    await expect(
      queryFnOf(usePolicies([]) as { queryFn?: unknown })(),
    ).resolves.toEqual([]);

    expect(open).toHaveBeenCalledTimes(1);
    expect(authed).not.toHaveBeenCalled();
  });

  it("asks for the slug and language it was given", async () => {
    // The slug is in the path and the language is a query param; swapping
    // either silently serves a different document than the URL promised.
    open.mockResolvedValue(ok({ slug: "privacy" }));

    await queryFnOf(usePolicy("privacy", "vi") as { queryFn?: unknown })();

    expect(open.mock.calls[0][0]).toBe("/policies/privacy?language=vi");
  });

  it("sends no role filter when the reader has no roles", async () => {
    // Signed out there are no roles to send, and the server reads an absent
    // filter as "the public set" — the documents with no audience at all.
    open.mockResolvedValue(ok([]));

    await queryFnOf(usePolicies([], "en") as { queryFn?: unknown })();

    expect(open.mock.calls[0][0]).toBe("/policies?language=en");
  });

  it("widens the index by role when the reader is signed in", async () => {
    // One `role` param per code. This is a courtesy filter over documents
    // that are public either way, not a gate.
    open.mockResolvedValue(ok([]));

    await queryFnOf(
      usePolicies(["student", "teacher"], "en") as { queryFn?: unknown },
    )();

    expect(open.mock.calls[0][0]).toBe(
      "/policies?role=student&role=teacher&language=en",
    );
  });

  it("still reports a real server error rather than swallowing it", async () => {
    // Dropping the session requirement must not also drop error handling: a
    // slug that does not exist has to surface as a 404 the page can render,
    // not as an empty document.
    open.mockResolvedValue(
      new Response(JSON.stringify({ detail: { error: "not_found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiFetchPublic("/policies/nope")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
  });
});

describe("the reader endpoints outlive the default cache window", () => {
  it("caches both reader queries well past the 60s global default", () => {
    // These are public, unauthenticated and unthrottled, and the document
    // behind them changes a handful of times a year. The publish mutation
    // invalidates the ["policies"] prefix, so a longer window costs the
    // admin who published nothing and costs a stranger's refresh nothing.
    for (const options of [
      usePolicy("terms") as { staleTime?: number; gcTime?: number },
      usePolicies([]) as { staleTime?: number; gcTime?: number },
    ]) {
      expect(options.staleTime).toBeGreaterThan(60_000);
      // gcTime is the one that actually saves the round trips: the default
      // drops the entry after 5 minutes, so navigating back refetches.
      expect(options.gcTime).toBeGreaterThan(5 * 60_000);
    }
  });
});

describe("the admin policy endpoints stay authenticated", () => {
  it("authoring reads go through the authenticated client", async () => {
    // The public transport is for the reader endpoints only. Authoring sees
    // unpublished drafts, so it must keep failing without a session.
    const { useAdminPolicies } = await import("@/lib/api/hooks/policies");

    await expect(
      queryFnOf(useAdminPolicies() as { queryFn?: unknown })(),
    ).rejects.toThrow("Not authenticated");

    expect(open).not.toHaveBeenCalled();
  });
});
