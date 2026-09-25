import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { parseLessonLockRequirements } from "../use-lesson-content";

describe("parseLessonLockRequirements", () => {
  it("returns the server unlock requirements for lesson_locked", () => {
    const error = new ApiError(
      403,
      JSON.stringify({
        detail: {
          error: "lesson_locked",
          current_ratio: 0.5,
          required_ratio: 0.8,
          total_cards: 10,
          passing_cards: 5,
          prerequisites_met: false,
          interview_pass_required: true,
          interview_passed: false,
          next_unlock_estimate: "Review 3 more cards",
        },
      }),
      "Forbidden",
    );

    expect(parseLessonLockRequirements(error)).toEqual({
      currentRatio: 0.5,
      requiredRatio: 0.8,
      totalCards: 10,
      passingCards: 5,
      prerequisitesMet: false,
      interviewPassRequired: true,
      interviewPassed: false,
      nextUnlockEstimate: "Review 3 more cards",
    });
  });

  it("does not classify unrelated forbidden or missing errors as locked", () => {
    expect(parseLessonLockRequirements(new ApiError(403, "{}", "Forbidden"))).toBeNull();
    expect(parseLessonLockRequirements(new ApiError(404, "{}", "Not Found"))).toBeNull();
  });
});
