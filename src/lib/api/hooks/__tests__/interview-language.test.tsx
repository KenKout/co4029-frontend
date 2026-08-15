import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useStartInterviewSession } from "@/lib/api/hooks/interviews";
import type { InterviewSessionStartRequest } from "@/lib/api/types";
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

// The invariant used to be pinned on `useInterviewRespond` (the /respond turn
// hook). Turns now ride `lk.chat`, so the last REST surface that must honour the
// UI language — not the browser header — is session start (and onboarding,
// which shares the pattern).
describe("useStartInterviewSession language", () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    apiPostMock.mockResolvedValue({
      session_id: "00000000-0000-0000-0000-000000000001",
    });
  });

  it("sends the active UI language instead of relying on the browser header", async () => {
    const configId = "00000000-0000-0000-0000-00000000000a";
    const body: InterviewSessionStartRequest = { input_mode: "hybrid" };
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useStartInterviewSession(configId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(body);
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      `/interview-configs/${configId}/sessions`,
      body,
      { "Accept-Language": "en" },
    );
  });
});
