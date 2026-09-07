import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTH_STORAGE_KEYS,
  clearAuthSession,
  logout,
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
