import { describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import { reportPersistFailure } from "../attempt-answer-actions";
import type { AttemptSessionState } from "../use-attempt-session-state";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

function makeState() {
  return {
    setPerQuestionCooldown: vi.fn(),
  } as unknown as AttemptSessionState;
}

const t = ((key: string) => key) as unknown as TFunction;

describe("reportPersistFailure", () => {
  it("routes a replaced session to conflict handling without a toast", () => {
    const onSessionConflict = vi.fn();
    reportPersistFailure({
      t,
      state: makeState(),
      questionId: "question-1",
      err: new ApiError(
        409,
        JSON.stringify({ detail: { error: "quiz_session_replaced" } }),
        "Conflict",
      ),
      onSessionConflict,
    });

    expect(onSessionConflict).toHaveBeenCalledWith("quiz_session_replaced");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not expose the raw API envelope in a toast", () => {
    reportPersistFailure({
      t,
      state: makeState(),
      questionId: "question-1",
      err: new ApiError(
        409,
        JSON.stringify({ detail: { message: "The answer could not be saved." } }),
        "Conflict",
      ),
    });

    expect(toast.error).toHaveBeenCalledWith("The answer could not be saved.");
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringContaining('API 409: {"detail"'),
    );
  });
});
