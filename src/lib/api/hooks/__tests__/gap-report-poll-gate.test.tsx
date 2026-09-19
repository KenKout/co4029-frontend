import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isEvaluationUnresolved,
  useGapReport,
} from "@/lib/api/hooks/interviews";
import { createQueryWrapper } from "@/test/react-query-wrapper";
import type { ReactNode } from "react";

const apiFetchMock = vi.hoisted(() => vi.fn());

const MockedApiError = vi.hoisted(() => {
  class ApiError extends Error {
    status: number;
    constructor(status = 500) {
      super(`api error ${status}`);
      this.status = status;
    }
  }
  return ApiError;
});

vi.mock("@/lib/api/client", () => ({
  ApiError: MockedApiError,
  apiDelete: vi.fn(),
  apiFetch: apiFetchMock,
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

const SESSION_ID = "00000000-0000-0000-0000-0000000000c1";

/**
 * Audit P1 (result page polls missing gap report forever): when evaluation is
 * EXHAUSTED the gap report can never appear — the query must go inert (no
 * 404 retries, no refetch interval) instead of hammering the endpoint every
 * 3 seconds for eternity. While evaluation is genuinely pending, the old
 * bounded-poll contract is preserved.
 */
describe("useGapReport polling gate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiFetchMock.mockReset();
    apiFetchMock.mockRejectedValue(new MockedApiError(404));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isEvaluationUnresolved: pending true, exhausted false", () => {
    expect(
      isEvaluationUnresolved({ status: "completed", evaluation_state: "pending" }),
    ).toBe(true);
    expect(
      isEvaluationUnresolved({ status: "completed", evaluation_state: "exhausted" }),
    ).toBe(false);
  });

  it("pollWhilePending=false performs no 404 retries", async () => {
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => useGapReport(SESSION_ID, { pollWhilePending: false }),
      { wrapper: ({ children }: { children: ReactNode }) => <Wrapper>{children}</Wrapper> },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const callsAfterFirst = apiFetchMock.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThanOrEqual(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    // No retry storm: exactly the initial attempt, zero 404 retries.
    expect(apiFetchMock.mock.calls.length).toBe(callsAfterFirst);
    expect(result.current.data).toBeUndefined();
  });

  it("pollWhilePending=true keeps the bounded 404 retry contract", async () => {
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useGapReport(SESSION_ID), {
      wrapper: ({ children }: { children: ReactNode }) => <Wrapper>{children}</Wrapper>,
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const callsAfterFirst = apiFetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_000);
    });
    // Retries continued past the first attempt (bounded at 60 — a handful of
    // retries within 7s proves the poll is alive).
    expect(apiFetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    expect(result.current.data).toBeUndefined();
  });
});
