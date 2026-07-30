import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

import {
  useUnreadCount,
  useNotificationInboxSync,
} from "@/lib/api/hooks/notifications";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * The unread badge used to require a page reload to pick up new notifications:
 * `useUnreadCount` had no refetchInterval, so it only refetched on mount or
 * window focus. These tests pin the polling behaviour that replaced that.
 */

const apiFetchMock = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client },
      children as React.ReactElement,
    );
  };
}

beforeEach(() => {
  apiFetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useUnreadCount polling", () => {
  it("refetches on an interval so the badge climbs without a reload", async () => {
    let count = 0;
    apiFetchMock.mockImplementation(() => Promise.resolve({ unread: count }));

    const client = makeClient();
    const { result } = renderHook(() => useUnreadCount({ pollMs: 150 }), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.data).toEqual({ unread: 0 }));
    const callsAfterMount = apiFetchMock.mock.calls.length;

    // A notification arrives server-side. No reload, no user interaction.
    count = 3;

    // The polled refetch must pick it up on its own.
    await waitFor(
      () => {
        expect(result.current.data).toEqual({ unread: 3 });
      },
      { timeout: 4_000, interval: 25 },
    );

    expect(apiFetchMock.mock.calls.length).toBeGreaterThan(callsAfterMount);
    expect(apiFetchMock).toHaveBeenCalledWith("/me/notifications/unread-count");
  });

  it("does not poll when disabled (unauthenticated)", async () => {
    apiFetchMock.mockResolvedValue({ unread: 7 });
    const client = makeClient();
    renderHook(() => useUnreadCount({ enabled: false, pollMs: 150 }), {
      wrapper: wrapper(client),
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});

describe("useNotificationInboxSync", () => {
  it("invalidates the inbox list when the unread count changes", async () => {
    let count = 0;
    apiFetchMock.mockImplementation(() => Promise.resolve({ unread: count }));

    const client = makeClient();
    // Seed an inbox cache entry so we can observe it being invalidated.
    client.setQueryData(queryKeys.notifications.inbox(), {
      pages: [{ items: [], next_cursor: null }],
      pageParams: [undefined],
    });
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    renderHook(() => useNotificationInboxSync({ pollMs: 150 }), {
      wrapper: wrapper(client),
    });

    // First observation must NOT invalidate — the list just mounted/fetched.
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    const inboxInvalidations = () =>
      invalidateSpy.mock.calls.filter(
        (c) =>
          JSON.stringify((c[0] as { queryKey?: unknown })?.queryKey) ===
          JSON.stringify(queryKeys.notifications.inbox()),
      ).length;
    expect(inboxInvalidations()).toBe(0);

    // Count changes -> the list is now stale and must be refetched.
    count = 2;
    await waitFor(
      () => {
        expect(inboxInvalidations()).toBeGreaterThan(0);
      },
      { timeout: 4_000, interval: 25 },
    );
  });
});
