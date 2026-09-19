import { describe, expect, it } from "vitest";

import { resolveQuizAttemptTabGuardId } from "../use-quiz-attempt-session";

describe("resolveQuizAttemptTabGuardId", () => {
  it("uses the canonical quiz UUID after a legacy item-slug route loads", () => {
    expect(
      resolveQuizAttemptTabGuardId(
        "quiz-1-0",
        "fcce0c53-6fdd-4c1c-b724-24146aae34d3",
      ),
    ).toBe("fcce0c53-6fdd-4c1c-b724-24146aae34d3");
  });

  it("keeps the route value while the quiz payload is loading", () => {
    expect(resolveQuizAttemptTabGuardId("quiz-1-0", undefined)).toBe("quiz-1-0");
    expect(resolveQuizAttemptTabGuardId("quiz-1-0", null)).toBe("quiz-1-0");
  });
});
