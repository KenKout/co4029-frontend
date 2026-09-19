import { describe, expect, it } from "vitest";

import { getQuizAttemptTabGuardScope } from "../use-quiz-attempt-session";

describe("getQuizAttemptTabGuardScope", () => {
  it("uses the canonical quiz UUID for a live taking attempt", () => {
    expect(
      getQuizAttemptTabGuardScope(
        "quiz-1-0",
        "fcce0c53-6fdd-4c1c-b724-24146aae34d3",
        "attempt-1",
        true,
      ),
    ).toEqual({
      quizId: "fcce0c53-6fdd-4c1c-b724-24146aae34d3",
      attemptId: "attempt-1",
    });
  });

  it("completely bypasses the browser guard without a live taking attempt", () => {
    expect(
      getQuizAttemptTabGuardScope("quiz-1-0", "quiz-uuid", null, false),
    ).toBeNull();
    expect(
      getQuizAttemptTabGuardScope("quiz-1-0", "quiz-uuid", "attempt-1", false),
    ).toBeNull();
    expect(
      getQuizAttemptTabGuardScope("quiz-1-0", undefined, "attempt-1", true),
    ).toEqual({ quizId: "quiz-1-0", attemptId: "attempt-1" });
  });
});
