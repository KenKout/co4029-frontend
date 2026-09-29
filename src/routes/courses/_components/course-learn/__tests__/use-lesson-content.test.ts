import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  cardsNeededToUnlock,
  parseLessonLockRequirements,
} from "../use-lesson-content";

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
          blocking_quiz_ids: ["quiz-a", "quiz-b"],
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
      blockingQuizIds: ["quiz-a", "quiz-b"],
    });
  });

  it("tolerates a payload with no blocking quizzes", () => {
    // Older servers, and the prerequisite-only lock, send no quiz ids. The
    // locked screen then falls back to text with no call to action, which is
    // what it always did — it must not crash on the missing field.
    const error = new ApiError(
      403,
      JSON.stringify({ detail: { error: "lesson_locked" } }),
      "Forbidden",
    );

    expect(parseLessonLockRequirements(error)?.blockingQuizIds).toEqual([]);
  });

  it("does not classify unrelated forbidden or missing errors as locked", () => {
    expect(parseLessonLockRequirements(new ApiError(403, "{}", "Forbidden"))).toBeNull();
    expect(parseLessonLockRequirements(new ApiError(404, "{}", "Not Found"))).toBeNull();
  });
});

/**
 * The count the locked screen shows instead of the backend's
 * `next_unlock_estimate`, which is hardcoded English.
 */
describe("cardsNeededToUnlock", () => {
  function lock(
    totalCards: number,
    passingCards: number,
    requiredRatio: number,
  ) {
    return {
      currentRatio: totalCards ? passingCards / totalCards : 0,
      requiredRatio,
      totalCards,
      passingCards,
      prerequisitesMet: true,
      interviewPassRequired: false,
      interviewPassed: false,
      nextUnlockEstimate: null,
      blockingQuizIds: [],
    };
  }

  it("rounds a fractional requirement up", () => {
    // The reported case: 5 cards at 80% needs 4 passing, and none pass yet.
    expect(cardsNeededToUnlock(lock(5, 0, 0.8))).toBe(4);
  });

  it("counts only the shortfall once some cards pass", () => {
    expect(cardsNeededToUnlock(lock(5, 3, 0.8))).toBe(1);
  });

  it("never goes negative when the student is already over the line", () => {
    expect(cardsNeededToUnlock(lock(5, 5, 0.8))).toBe(0);
  });

  it("is zero for a lesson with no cards", () => {
    // A cardless lesson bypasses the EF gate server-side; showing "0 more
    // cards" would be noise, so the caller hides the line on 0.
    expect(cardsNeededToUnlock(lock(0, 0, 0.8))).toBe(0);
  });
});
