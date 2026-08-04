import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * The processing page's status tabs.
 *
 * The load-bearing case is the deep link: the admin dashboard's "Job failure
 * rate" tile navigates to /admin/processing?status=failed, so the Failed tab
 * must come up pre-selected and the jobs query must be issued with that status.
 * Simplifying the page must not quietly break that.
 *
 * Counts are derived from the SAME jobs list the table renders (the old
 * queue-depth source counted every job ever while the table silently only
 * fetched 7 days — the bug this screen was rebuilt around), so the assertions
 * below derive the expected badge numbers from the mocked job rows.
 */

let mockSearch: { status?: string } = {};
const jobsCalls: (unknown | undefined)[] = [];

const JOBS = [
  { id: "j1", status: "completed", job_type: "a", entity_type: "x", entity_id: "1", progress_percent: 100, retry_count: 0, updated_at: "2026-08-04T00:00:00Z" },
  { id: "j2", status: "completed", job_type: "b", entity_type: "x", entity_id: "2", progress_percent: 100, retry_count: 0, updated_at: "2026-08-03T00:00:00Z" },
  { id: "j3", status: "failed", job_type: "c", entity_type: "y", entity_id: "3", progress_percent: 50, retry_count: 1, updated_at: "2026-08-02T00:00:00Z" },
  { id: "j4", status: "pending", job_type: "d", entity_type: "y", entity_id: "4", progress_percent: 0, retry_count: 0, updated_at: "2026-08-01T00:00:00Z" },
];

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
  useProcessingJobs: (arg?: object) => {
    jobsCalls.push(arg);
    return { data: JOBS, isLoading: false, isError: false };
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
  it("renders one tab per status with counts derived from the jobs list", () => {
    mockSearch = {};
    render(<Harness />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(6);
    // counts come from the same list the table shows (4 rows: 2 completed,
    // 1 failed, 1 pending) — never from a separate all-time tally
    expect(tabs[0].textContent).toContain("4"); // all / total
    expect(tabs[3].textContent).toContain("2"); // completed
    expect(tabs[4].textContent).toContain("1"); // failed
    expect(tabs[1].textContent).toContain("1"); // pending
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
    expect(jobsCalls[0]).toEqual(
      expect.objectContaining({ status: "failed" }),
    );
    // the toolbar time range (default week) supplies the required `since`
    expect(jobsCalls[0]).toHaveProperty("since", expect.any(String));
  });

  it("switching tabs changes the applied status filter", () => {
    mockSearch = {};
    render(<Harness />);
    fireEvent.click(screen.getAllByRole("tab")[4]);
    expect(screen.getByTestId("filter").textContent).toBe("failed");
  });

  it("omits count badges while the jobs list is still loading", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api/hooks/admin", () => ({
      useProcessingJobs: () => ({
        data: undefined,
        isLoading: true,
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
