import type { QuizPublic } from "@/lib/api/types";
import type {
  ReviewOptions,
  ReviewWindowFlags,
} from "@/lib/api/hooks/quizzes/settings";

/**
 * Client-side mirror of the backend's review-visibility resolver
 * (`services/review_visibility.py`). The public quiz payload exposes the raw
 * `review_options` matrix so the FE can decide whether to show a "Review"
 * affordance without an extra round-trip; the resolved per-attempt flags still
 * govern what the review screen actually renders (server-masked).
 */

const IMMEDIATE_WINDOW_MS = 2 * 60 * 1000;

const ALL_TRUE: ReviewWindowFlags = {
  show_score: true,
  show_correctness: true,
  show_correct_answers: true,
  show_explanation: true,
  show_points: true,
};

function flagsFor(
  opts: ReviewOptions | null | undefined,
  window: keyof ReviewOptions,
): ReviewWindowFlags {
  return opts?.[window] ?? ALL_TRUE;
}

export function resolveReviewFlags(
  quiz: QuizPublic,
  submittedAt: string | null | undefined,
  now: number = Date.now(),
): ReviewWindowFlags {
  const opts = (quiz as unknown as { review_options?: ReviewOptions | null })
    .review_options;
  const closeAt = quiz.available_until
    ? new Date(quiz.available_until).getTime()
    : null;
  if (closeAt != null && now >= closeAt) {
    return flagsFor(opts, "after_close");
  }
  if (submittedAt) {
    const sub = new Date(submittedAt).getTime();
    if (Number.isFinite(sub) && now - sub <= IMMEDIATE_WINDOW_MS) {
      return flagsFor(opts, "immediately_after");
    }
  }
  return flagsFor(opts, "later_while_open");
}

/** True when the review screen would show anything useful for this attempt. */
export function reviewAllowed(
  quiz: QuizPublic,
  submittedAt: string | null | undefined,
  now?: number,
): boolean {
  const f = resolveReviewFlags(quiz, submittedAt, now);
  return (
    f.show_score ||
    f.show_correctness ||
    f.show_correct_answers ||
    f.show_explanation ||
    f.show_points
  );
}
