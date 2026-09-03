import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuizAttemptRead, QuizPublic } from "@/lib/api/types";
import { deriveIntroState } from "../helpers";

function quiz(overrides: Partial<QuizPublic> = {}): QuizPublic {
  return {
    id: "quiz-1",
    title: "Assessment",
    status: "published",
    passing_score_percent: 70,
    allow_retakes: true,
    max_attempts: null,
    cooldown_hours: null,
    ...overrides,
  } as QuizPublic;
}

function attempt(
  status: QuizAttemptRead["status"],
  overrides: Partial<QuizAttemptRead> = {},
): QuizAttemptRead {
  return {
    id: crypto.randomUUID(),
    quiz_id: "quiz-1",
    attempt_number: 1,
    status,
    started_at: "2026-09-03T08:00:00Z",
    ...overrides,
  } as QuizAttemptRead;
}

afterEach(() => vi.useRealTimers());

describe("deriveIntroState retake policy", () => {
  it("counts abandoned and expired attempts toward the effective maximum", () => {
    const state = deriveIntroState(quiz({ max_attempts: 2 }), [
      attempt("abandoned"),
      attempt("expired", { attempt_number: 2 }),
    ]);

    expect(state.attemptsUsed).toBe(2);
    expect(state.maxAttemptsReached).toBe(true);
    expect(state.blocked).toBe(true);
  });

  it("blocks a retake until the effective quiz cooldown expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T10:00:00Z"));
    const state = deriveIntroState(quiz({ cooldown_hours: 4 }), [
      attempt("submitted", { submitted_at: "2026-09-03T08:00:00Z" }),
    ]);

    expect(state.cooldownActive).toBe(true);
    expect(state.retryAvailableAt?.toISOString()).toBe(
      "2026-09-03T12:00:00.000Z",
    );
    expect(state.blocked).toBe(true);
  });
});
