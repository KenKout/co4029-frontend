import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({ apiFetch: apiFetchMock }));

import { useServerTable } from "@/lib/api/use-server-table";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    qc,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
  };
}

describe("useServerTable generic filters (admin courses)", () => {
  it("sends the status param exactly like the role/org params on the users page", async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 0,
      page_size: 25,
      total_pages: 0,
    });
    const { wrapper } = makeWrapper();

    const initialProps: { status: string | undefined } = { status: undefined };
    const { rerender } = renderHook(
      ({ status }: { status: string | undefined }) =>
        useServerTable({
          queryKey: ["admin", "courses", "search"],
          path: "/admin/courses/search",
          filters: { include_deleted: "true", status },
        }),
      {
        wrapper,
        initialProps,
      },
    );

    // Baseline: no filter → no `status` param.
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(String(apiFetchMock.mock.calls[0][0])).not.toContain("status=");

    // Picking a status → the very next request carries `status=draft` and
    // keeps `include_deleted`.
    rerender({ status: "draft" });
    await waitFor(() => {
      const urls = apiFetchMock.mock.calls.map((c) => String(c[0]));
      expect(
        urls.some(
          (u) => u.includes("status=draft") && u.includes("include_deleted=true"),
        ),
      ).toBe(true);
    });
  });
});
