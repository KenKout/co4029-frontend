import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  isActionableDuplicate,
  useCheckInterviewQuestionDuplicate,
} from "@/lib/api/hooks/interviews";
import type { InterviewQuestionDuplicateCheck } from "@/lib/api/types";
import { createQueryWrapper } from "@/test/react-query-wrapper";

const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: "en", language: "en" },
  }),
}));

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  apiDelete: vi.fn(),
  apiFetch: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: apiPostMock,
}));

const configId = "00000000-0000-0000-0000-0000000000c1";
const questionId = "00000000-0000-0000-0000-0000000000q1";

/** A "no duplicate found" verdict; each test overrides the flags it cares about. */
function verdict(
  over: Partial<InterviewQuestionDuplicateCheck> = {},
): InterviewQuestionDuplicateCheck {
  return {
    enabled: true,
    is_duplicate: false,
    duplicate_of_id: null,
    duplicate_of_text: "",
    rationale: "",
    error: "",
    ...over,
  };
}

describe("useCheckInterviewQuestionDuplicate", () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    apiPostMock.mockResolvedValue(verdict());
  });

  // The backend declares this route before /questions/{question_id}; if the
  // frontend ever posts to a differently-shaped path it lands on the UUID route
  // and gets a 422 from a URL that looks correct. Pin the exact path.
  it("posts to the literal check-duplicate path under the config", async () => {
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => useCheckInterviewQuestionDuplicate(configId),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({ prompt_text: "What is a closure?" });
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      `/teacher/interview-configs/${configId}/questions/check-duplicate`,
      { prompt_text: "What is a closure?" },
    );
  });

  it("passes exclude_question_id through when editing an existing question", async () => {
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => useCheckInterviewQuestionDuplicate(configId),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({
        prompt_text: "What is a closure?",
        exclude_question_id: questionId,
      });
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      expect.stringContaining("check-duplicate"),
      expect.objectContaining({ exclude_question_id: questionId }),
    );
  });
});

describe("isActionableDuplicate", () => {
  it("is true only for a real duplicate on a working, enabled check", () => {
    expect(
      isActionableDuplicate(
        verdict({ is_duplicate: true, duplicate_of_text: "Explain closures." }),
      ),
    ).toBe(true);
  });

  it("is false when dedup is switched off", () => {
    // The backend reports is_duplicate:false when disabled. Trusting that flag
    // alone would tell the teacher the question is unique without checking.
    expect(isActionableDuplicate(verdict({ enabled: false }))).toBe(false);
  });

  it("is false when the check itself errored", () => {
    expect(
      isActionableDuplicate(verdict({ error: "embedding backend unavailable" })),
    ).toBe(false);
  });

  // An errored check can still arrive with is_duplicate set; the error wins,
  // because a verdict we could not compute is not one to interrupt a save with.
  it("treats an error as decisive even alongside is_duplicate", () => {
    expect(
      isActionableDuplicate(verdict({ is_duplicate: true, error: "timeout" })),
    ).toBe(false);
  });

  it("is false when the question is genuinely unique", () => {
    expect(isActionableDuplicate(verdict())).toBe(false);
  });
});
