import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTeacherInterviewRecording } from "@/lib/api/hooks/interviews";
import type { InterviewRecordingRead } from "@/lib/api/types";
import { createQueryWrapper } from "@/test/react-query-wrapper";

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  apiDelete: vi.fn(),
  apiFetch: apiFetchMock,
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

const SESSION_ID = "00000000-0000-0000-0000-0000000000a1";

function recording(
  overrides: Partial<InterviewRecordingRead> = {},
): InterviewRecordingRead {
  return {
    session_id: SESSION_ID,
    state: "not_recorded",
    media_kind: null,
    stream_url: null,
    expires_at: null,
    duration_seconds: null,
    recorded_at: null,
    ...overrides,
  };
}

describe("teacher interview recording hook", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiFetchMock.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("uses the teacher recording endpoint and polls while processing", async () => {
    apiFetchMock.mockResolvedValue(recording({ state: "processing" }));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeacherInterviewRecording(SESSION_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data?.state).toBe("processing"));
    expect(apiFetchMock).toHaveBeenCalledWith(
      `/teacher/interview-sessions/${SESSION_ID}/recording`,
    );
    const callsAfterLoad = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(apiFetchMock.mock.calls.length).toBeGreaterThan(callsAfterLoad);
  });

  it("refreshes an available signed URL shortly before expiry", async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    apiFetchMock.mockResolvedValue(
      recording({
        state: "available",
        media_kind: "audio",
        stream_url: "https://s3.test/signed-1",
        expires_at: expiresAt,
        duration_seconds: 42,
      }),
    );
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeacherInterviewRecording(SESSION_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data?.state).toBe("available"));
    const callsAfterLoad = apiFetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });
    expect(apiFetchMock.mock.calls.length).toBeGreaterThan(callsAfterLoad);
  });

  it("does not poll terminal unavailable states", async () => {
    apiFetchMock.mockResolvedValue(recording({ state: "expired" }));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeacherInterviewRecording(SESSION_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data?.state).toBe("expired"));
    const callsAfterLoad = apiFetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(apiFetchMock.mock.calls.length).toBe(callsAfterLoad);
  });
});
