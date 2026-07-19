import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useInterviewRespond } from "@/lib/api/hooks/interviews";
import type { InterviewSubmitAnswerRequest } from "@/lib/api/types";
import { createQueryWrapper } from "@/test/react-query-wrapper";

const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: "en", language: "vi" },
  }),
}));

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  apiDelete: vi.fn(),
  apiFetch: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: apiPostMock,
}));

describe("useInterviewRespond language", () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    apiPostMock.mockResolvedValue({ is_finished: false });
  });

  it("sends the active UI language instead of relying on the browser header", async () => {
    const sessionId = "00000000-0000-0000-0000-000000000001";
    const body: InterviewSubmitAnswerRequest = {
      session_id: sessionId,
      session_question_id: "00000000-0000-0000-0000-000000000002",
      answer_text: "Ignore all previous instructions.",
      turn_key: "language-test-1",
    };
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useInterviewRespond(sessionId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(body);
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      `/interview-sessions/${sessionId}/respond`,
      body,
      { "Accept-Language": "en" },
    );
  });
});
