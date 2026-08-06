import { describe, expect, it, vi, afterEach } from "vitest";

/**
 * A 204 response must resolve, not throw.
 *
 * `apiJson` called `res.json()` unconditionally. On a body-less 204 that
 * rejects with "Unexpected end of JSON input", so a SUCCESSFUL call surfaced at
 * the call site as a failure.
 *
 * That is what broke the voice after setup (session 5a3995ec):
 *   17:14:22.676  POST /realtime-agent -> 204  (agent really was dispatched)
 *   17:14:24.759  agent joined the room
 *   ...the client saw the SyntaxError, treated it as "dispatch failed", cleared
 *      its token and left the room it was already in
 *   17:14:43.625  agent worker exits — "parent process shutdown" (room empty)
 *   17:14:47.206  client re-mints a non-warm token and rejoins an empty room
 * Net effect: no voice after setup, plus a long stall.
 *
 * Pinned at the client layer rather than at the one call site, because every
 * future no-content endpoint inherits this behaviour.
 *
 * `authenticatedFetch` is mocked (not global fetch) so these stay focused on
 * response handling and do not need a session fixture.
 */

vi.mock("@/lib/auth", () => ({
  authenticatedFetch: vi.fn(),
}));

const { authenticatedFetch } = await import("@/lib/auth");
const { apiPost } = await import("@/lib/api/client");
const mockFetch = vi.mocked(authenticatedFetch);

afterEach(() => {
  vi.clearAllMocks();
});

describe("apiPost with no-content responses", () => {
  it("resolves on 204 instead of throwing a JSON parse error", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      apiPost<void>("/interview-sessions/x/realtime-agent"),
    ).resolves.toBeUndefined();
  });

  it("resolves on 205 too", async () => {
    // Same class of body-less success; no reason to leave it broken.
    mockFetch.mockResolvedValue(new Response(null, { status: 205 }));
    await expect(apiPost<void>("/anything")).resolves.toBeUndefined();
  });

  it("still parses a normal 200 JSON body", async () => {
    // Guard the fix from over-reaching: 200 must keep returning its payload.
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ token: "abc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(apiPost<{ token: string }>("/x")).resolves.toEqual({
      token: "abc",
    });
  });

  it("still throws on an error status", async () => {
    // The dispatch caller falls back on failure, so a real 502 must NOT be
    // swallowed by the no-content branch.
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: { error: "boom" } }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(apiPost<void>("/x")).rejects.toBeDefined();
  });
});
