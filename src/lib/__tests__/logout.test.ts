import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTH_STORAGE_KEYS,
  clearAuthSession,
  logout,
  logoutAndRedirect,
  storeAuthSession,
  type TokenResponse,
} from "../auth";

const SESSION: TokenResponse = {
  access_token: "access-token-1",
  refresh_token: "refresh-token-1",
  token_type: "bearer",
  expires_in: 900,
  user: {
    id: "u1",
    primary_email: "u1@example.com",
    profile: { user_id: "u1", display_name: "U One", locale: "vi" },
  },
  requires_mfa: false,
} as unknown as TokenResponse;

function storedSession() {
  return {
    access: localStorage.getItem(AUTH_STORAGE_KEYS.accessToken),
    refresh: localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken),
  };
}

describe("logout()", () => {
  beforeEach(() => {
    localStorage.clear();
    storeAuthSession(SESSION);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("keeps the session in storage until the revoke settles", async () => {
    // THE ordering regression test. clearAuthSession() fires the auth-changed
    // listeners synchronously; running it before the request flips
    // AuthProvider and navigates the app mid-flight, which deadlocks the main
    // thread (a frozen tab with no console or network trace). Merge c169448
    // silently reverted that ordering and the suite stayed green, because
    // every other case here only inspects storage AFTER awaiting logout() —
    // by which point both orderings look identical. This one looks DURING.
    let resolveRevoke: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveRevoke = resolve;
          }),
      ),
    );

    const pending = logout();
    await Promise.resolve(); // let logout() reach the in-flight request

    expect(
      storedSession(),
      "session must survive until the revoke settles — clearing first freezes the tab",
    ).toEqual({ access: "access-token-1", refresh: "refresh-token-1" });

    resolveRevoke!(new Response(null, { status: 204 }));
    await pending;

    expect(storedSession()).toEqual({ access: null, refresh: null });
  });

  it("clears the local session after the revoke settles, with captured tokens", async () => {
    let resolveRevoke: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRevoke = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = logout();

    resolveRevoke!(new Response(null, { status: 204 }));
    await pending;

    // Cleared by the time sign-out completes.
    expect(storedSession()).toEqual({ access: null, refresh: null });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect((init.headers as Headers).get("Authorization")).toBe(
      "Bearer access-token-1",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      refresh_token: "refresh-token-1",
    });
  });

  it("still signs out locally when the revoke hangs (bounded by the 5s abort)", async () => {
    // Never settles on its own — the abort signal is the bound. Reject when
    // the request's signal fires (that is how AbortSignal.timeout unbinds).
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "TimeoutError")),
            );
          }),
      ),
    );

    await logout(); // resolves via the abort instead of hanging forever

    expect(storedSession()).toEqual({ access: null, refresh: null });
  }, 10_000);

  it("does not send a revoke when there is no session to revoke", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    clearAuthSession();

    await logout();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(storedSession()).toEqual({ access: null, refresh: null });
  });

  it("swallows revoke failures (offline / 5xx) — sign-out still completes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("network dead"))),
    );

    await expect(logout()).resolves.toBeUndefined();
    expect(storedSession()).toEqual({ access: null, refresh: null });
  });
});

describe("logoutAndRedirect()", () => {
  beforeEach(() => {
    localStorage.clear();
    storeAuthSession(SESSION);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("clears and redirects synchronously, without awaiting the revoke", () => {
    // THE invariant. An await here is a yield, and React uses it: AppShell
    // re-renders into its "Redirecting…" branch and unmounts the open confirm
    // dialog while the handler is suspended, which locks the main thread —
    // no console output, no network entry, no history mutation, and the
    // queued redirect never runs. Everything must happen in ONE tick.
    const replace = vi.fn();
    vi.stubGlobal("location", { replace, href: "http://localhost/" });
    // Never settles: the redirect must not depend on it in any way.
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));

    logoutAndRedirect();

    // No `await` between the call and these assertions, on purpose.
    expect(replace).toHaveBeenCalledWith("/login");
    expect(storedSession()).toEqual({ access: null, refresh: null });
  });

  it("fires the revoke with keepalive so it outlives the page", () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("location", { replace: vi.fn(), href: "http://localhost/" });
    vi.stubGlobal("fetch", fetchMock);

    logoutAndRedirect();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(init.body as string)).toEqual({
      refresh_token: "refresh-token-1",
    });
  });

  it("still redirects when there is no session to revoke", () => {
    const replace = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("location", { replace, href: "http://localhost/" });
    vi.stubGlobal("fetch", fetchMock);
    clearAuthSession();

    logoutAndRedirect();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
