import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useInterviewSession,
  useMyInterviewSessions,
} from "@/lib/api/hooks/interviews";
import type { InterviewSessionPublic } from "@/lib/api/types";
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
    constructor(status = 500) {
      super(`api error ${status}`);
      this.status = status;
    }
  },
  apiDelete: vi.fn(),
  apiFetch: apiFetchMock,
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

const SESSION_ID = "00000000-0000-0000-0000-0000000000a1";

function session(
  overrides: Partial<InterviewSessionPublic>,
): InterviewSessionPublic {
  return {
    session_id: SESSION_ID,
    interview_config_id: "00000000-0000-0000-0000-0000000000b1",
    status: "completed",
    input_mode: "hybrid",
    attempt_number: 1,
    started_at: "2026-09-05T00:00:00Z",
    onboarding_stage: "completed",
    interview_language: "en",
    pass_verdict: null,
    evaluation_state: "pending",
    ...overrides,
  } as InterviewSessionPublic;
}

/**
 * The polling contract, pinned on the server-derived `evaluation_state` rather
 * than on the frontend re-deriving it from `status` + `pass_verdict`.
 *
 * Two bugs this replaces:
 *
 *  - `status: "failed"` was read as terminal, so the history badge froze on an
 *    error and stopped polling. But `failed` only means ARQ ran out of retries;
 *    the recovery sweep re-drives exactly those rows and a verdict lands
 *    seconds later. The student saw a permanent error for a graded interview.
 *  - the result page never polled at all, so a verdict that arrived while the
 *    page was open stayed invisible until some unrelated refetch.
 *
 * The complement matters just as much: `exhausted` (recovery budget spent) and
 * `not_required` (abandoned / still live) must NOT poll, or a dead session
 * hammers the API forever.
 */
describe("interview evaluation polling", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps polling the history list while a grader failure can still be recovered", async () => {
    apiFetchMock.mockResolvedValue([
      session({ status: "failed", evaluation_state: "pending" }),
    ]);
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useMyInterviewSessions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    const callsAfterLoad = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    expect(apiFetchMock.mock.calls.length).toBeGreaterThan(callsAfterLoad);
  });

  it("stops polling the history list once the recovery budget is exhausted", async () => {
    apiFetchMock.mockResolvedValue([
      session({ status: "failed", evaluation_state: "exhausted" }),
    ]);
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useMyInterviewSessions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    const callsAfterLoad = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(apiFetchMock.mock.calls.length).toBe(callsAfterLoad);
  });

  it("stops polling the history list once a verdict is published", async () => {
    apiFetchMock.mockResolvedValue([
      session({ pass_verdict: false, evaluation_state: "succeeded" }),
    ]);
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useMyInterviewSessions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    const callsAfterLoad = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(apiFetchMock.mock.calls.length).toBe(callsAfterLoad);
  });

  it("polls a single session while its evaluation is pending", async () => {
    apiFetchMock.mockResolvedValue(session({ evaluation_state: "pending" }));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useInterviewSession(SESSION_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    const callsAfterLoad = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    expect(apiFetchMock.mock.calls.length).toBeGreaterThan(callsAfterLoad);
  });

  it("picks up the verdict that lands while the result page is open", async () => {
    apiFetchMock.mockResolvedValueOnce(
      session({ status: "failed", evaluation_state: "pending" }),
    );
    apiFetchMock.mockResolvedValue(
      session({ status: "completed", pass_verdict: true, evaluation_state: "succeeded" }),
    );
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useInterviewSession(SESSION_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.pass_verdict).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    await waitFor(() => expect(result.current.data?.pass_verdict).toBe(true));
  });

  it("stops polling a single session once its evaluation resolves", async () => {
    apiFetchMock.mockResolvedValue(
      session({ pass_verdict: true, evaluation_state: "succeeded" }),
    );
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useInterviewSession(SESSION_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    const callsAfterLoad = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(apiFetchMock.mock.calls.length).toBe(callsAfterLoad);
  });

  it("does not poll a session that will never be graded", async () => {
    apiFetchMock.mockResolvedValue(
      session({ status: "abandoned", evaluation_state: "not_required" }),
    );
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useInterviewSession(SESSION_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    const callsAfterLoad = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(apiFetchMock.mock.calls.length).toBe(callsAfterLoad);
  });

  it("honours an explicit refetchInterval from the voice-completion flow", async () => {
    apiFetchMock.mockResolvedValue(
      session({ pass_verdict: true, evaluation_state: "succeeded" }),
    );
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => useInterviewSession(SESSION_ID, { refetchInterval: 1000 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    const callsAfterLoad = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(apiFetchMock.mock.calls.length).toBeGreaterThan(callsAfterLoad);
  });
});
