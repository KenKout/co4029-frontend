import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * The processing page's status tabs.
 *
 * The load-bearing case is the deep link: the admin dashboard's "Job failure
 * rate" tile navigates to the Operations Failures tab, so the Failed tab
 * must come up pre-selected and the jobs query must be issued with that status.
 * Simplifying the page must not quietly break that.
 *
 * Counts come from the dedicated SUMMARY endpoint over the same window as the
 * jobs list — NOT from the (status-filtered) jobs query itself, whose badges
 * collapsed every other tab to zero when one status was selected. The mocked
 * summary below mirrors the 4-row JOBS fixture (2 completed, 1 failed,
 * 1 pending) so the badge assertions encode the window-wide numbers.
 */

let mockSearch: { status?: string } = {};
const jobsCalls: unknown[] = [];

const SUMMARY = {
  total: 4,
  pending: 1,
  running: 0,
  completed: 2,
  failed: 1,
  cancelled: 0,
};

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
  useProcessingSummary: () => ({
    data: SUMMARY,
    isLoading: false,
    isError: false,
  }),
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
  it("renders one tab per status with counts from the summary endpoint", () => {
    mockSearch = {};
    render(<Harness />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(6);
    // counts mirror the mocked window-wide summary (4 jobs: 2 completed,
    // 1 failed, 1 pending) — never a collapse onto the selected status
    expect(tabs[0].textContent).toContain("4"); // all / total
    expect(tabs[3].textContent).toContain("2"); // completed
    expect(tabs[4].textContent).toContain("1"); // failed
    expect(tabs[1].textContent).toContain("1"); // pending
  });

  it("REGRESSION: selecting a status tab keeps every other tab's count (summary is not the filtered list)", () => {
    mockSearch = { status: "failed" };
    render(<Harness />);
    // The jobs query IS filtered (asserted separately below); the badges
    // must NOT follow it — completed stays 2, pending stays 1, total 4.
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0].textContent).toContain("4"); // total
    expect(tabs[3].textContent).toContain("2"); // completed — was 0 when derived from the filtered list
    expect(tabs[4].textContent).toContain("1"); // failed
    expect(tabs[1].textContent).toContain("1"); // pending — was 0
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

  it("omits count badges while the summary is still loading", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api/hooks/admin", () => ({
      useProcessingJobs: () => ({
        data: undefined,
        isLoading: true,
        isError: false,
      }),
      useProcessingSummary: () => ({
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
