import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * The processing page's status tabs.
 *
 * The load-bearing case is the deep link: the admin dashboard's "Job failure
 * rate" tile navigates to /admin/processing?status=failed, so the Failed tab
 * must come up pre-selected and the jobs query must be issued with that status.
 * Simplifying the page must not quietly break that.
 */

let mockSearch: { status?: string } = {};
const jobsCalls: (unknown | undefined)[] = [];

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mockSearch,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k.split(".").pop(),
    i18n: { resolvedLanguage: "en", language: "en" },
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/auth/use-permissions", () => ({
  usePermissions: () => ({ isLoading: false, has: () => true }),
  useRequirePermission: () => ({ isLoading: false, allowed: true }),
}));
vi.mock("@/lib/api/hooks/admin", () => ({
  useProcessingQueue: () => ({
    data: {
      total: 197,
      pending: 0,
      running: 0,
      completed: 143,
      failed: 54,
      cancelled: 0,
    },
    isLoading: false,
    isError: false,
  }),
  useProcessingJobs: (arg?: unknown) => {
    jobsCalls.push(arg);
    return { data: [], isLoading: false, isError: false };
  },
  useRetryProcessingJob: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { JobsTabs } from "../JobsTabs";
import { useAdminProcessing } from "../use-admin-processing";

function Harness() {
  const c = useAdminProcessing();
  return (
    <>
      <JobsTabs c={c} />
      <span data-testid="filter">{c.statusFilter || "(all)"}</span>
    </>
  );
}

describe("processing JobsTabs", () => {
  it("renders one tab per status with counts from the queue payload", () => {
    mockSearch = {};
    render(<Harness />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(6);
    // counts ride on the tabs; these were the six StatCards before
    expect(tabs[0].textContent).toContain("197"); // all / total
    expect(tabs[3].textContent).toContain("143"); // completed
    expect(tabs[4].textContent).toContain("54"); // failed
  });

  it("defaults to the All tab with no ?status=", () => {
    mockSearch = {};
    render(<Harness />);
    expect(screen.getByTestId("filter").textContent).toBe("(all)");
    expect(screen.getAllByRole("tab")[0].getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("DEEP LINK: ?status=failed preselects the Failed tab", () => {
    mockSearch = { status: "failed" };
    render(<Harness />);
    expect(screen.getByTestId("filter").textContent).toBe("failed");
    const tabs = screen.getAllByRole("tab");
    expect(tabs[4].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].getAttribute("aria-selected")).toBe("false");
  });

  it("DEEP LINK: ?status=failed filters the jobs query, not just the UI", () => {
    mockSearch = { status: "failed" };
    jobsCalls.length = 0;
    render(<Harness />);
    expect(jobsCalls[0]).toEqual({ status: "failed" });
  });

  it("switching tabs changes the applied status filter", () => {
    mockSearch = {};
    render(<Harness />);
    fireEvent.click(screen.getAllByRole("tab")[4]);
    expect(screen.getByTestId("filter").textContent).toBe("failed");
  });

  it("omits count badges while the queue is still loading", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api/hooks/admin", () => ({
      useProcessingQueue: () => ({
        data: undefined,
        isLoading: true,
        isError: false,
      }),
      useProcessingJobs: () => ({
        data: [],
        isLoading: false,
        isError: false,
      }),
      useRetryProcessingJob: () => ({ mutate: vi.fn(), isPending: false }),
    }));
    const { JobsTabs: FreshTabs } = await import("../JobsTabs");
    const { useAdminProcessing: freshHook } = await import(
      "../use-admin-processing"
    );
    mockSearch = {};
    function L() {
      return <FreshTabs c={freshHook()} />;
    }
    const { container } = render(<L />);
    // a placeholder "0" would read as a real "no jobs" answer
    expect(container.textContent).not.toContain("0");
  });
});
