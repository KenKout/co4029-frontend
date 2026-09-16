import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTeacherGapReport } from "@/lib/api/hooks/interviews";
import { createQueryWrapper } from "@/test/react-query-wrapper";

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: "en", language: "en" },
  }),
}));

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number) {
      super(`api error ${status}`);
      this.status = status;
    }
  },
  apiDelete: vi.fn(),
  apiFetch: apiFetchMock,
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

const SESSION_ID = "00000000-0000-0000-0000-0000000000c1";

/** Test-side twin of the mocked ApiError shape ({@link status}). */
class TestApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`api error ${status}`);
    this.status = status;
  }
}

/**
 * The teacher GAP-report fetch contract, pinned on the availability gate.
 *
 * The hook used to fetch unconditionally with a 60-retry × 3s 404 loop, so an
 * `abandoned` attempt (never enqueued for evaluation — its report will never
 * exist) kept the page's spinner spinning for three minutes and hammered the
 * API for nothing. Now:
 *
 *  - `not_required` (abandoned / live) and `exhausted` DISABLE the query —
 *    zero requests, ever;
 *  - a 404 polls only while the session could still produce a report;
 *  - a real error (5xx) stops the poll — never explained away as pending.
 */
describe("useTeacherGapReport availability gating", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("never fires a request for an abandoned (not_required) session", async () => {
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () =>
        useTeacherGapReport(SESSION_ID, {
          session: { status: "abandoned", evaluation_state: "not_required" },
        }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("never fires a request for an exhausted session", async () => {
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () =>
        useTeacherGapReport(SESSION_ID, {
          session: { status: "failed", evaluation_state: "exhausted" },
        }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("falls back to status-only gating for a legacy backend", async () => {
    const { Wrapper } = createQueryWrapper();
    renderHook(
      () =>
        useTeacherGapReport(SESSION_ID, { session: { status: "abandoned" } }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("fetches for a pending session and keeps waiting on the 404", async () => {
    apiFetchMock.mockRejectedValue(new TestApiError(404));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () =>
        useTeacherGapReport(SESSION_ID, {
          session: { status: "failed", evaluation_state: "pending" },
        }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // The pending gate lets the request through (this is the whole point of
    // `shouldRequestGapReport` returning true for `failed + pending`).
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeDefined();
  });

  it("stops polling once the report arrives", async () => {
    apiFetchMock.mockResolvedValue({ id: "report-1", course_id: "course-1" });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () =>
        useTeacherGapReport(SESSION_ID, {
          session: { status: "completed", evaluation_state: "succeeded" },
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    const calls = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(apiFetchMock.mock.calls.length).toBe(calls);
  });

  it("stops polling on a 5xx instead of calling it pending", async () => {
    apiFetchMock.mockRejectedValue(new TestApiError(500));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () =>
        useTeacherGapReport(SESSION_ID, {
          session: { status: "completed", evaluation_state: "pending" },
        }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    const calls = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(apiFetchMock.mock.calls.length).toBe(calls);
    expect(result.current.error).toBeDefined();
  });

  it("stays enabled (and fetches) when no session is known yet", async () => {
    apiFetchMock.mockResolvedValue({ id: "report-1", course_id: "course-1" });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeacherGapReport(SESSION_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(apiFetchMock).toHaveBeenCalled();
  });
});
