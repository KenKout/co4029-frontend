import type { InterviewProgressRead } from "@/lib/api/types";

/**
 * The badge a PENDING interview row shows, or `null` for no badge.
 *
 * Problem this solves: under the interview completion rule a student who has
 * attempted an interview and not passed it stays `pending` forever (failing
 * never completes it, unlike a quiz running out of attempts). So the row looked
 * identical whether they had never opened it or had already sat it three times
 * and missed. The badge restores that distinction without inventing a fourth
 * `LessonState` — completion still means passed, and the row styling is
 * untouched.
 *
 * Three outcomes:
 *
 * - `"grading"` — at least one attempt has finished but the verdict has not
 *   landed. Evaluation is an ARQ job, so `attempts_used > attempts_graded`
 *   means "being marked", which must NOT read as a failure.
 * - `"not_passed"` — every finished attempt has been graded and none passed.
 *   Only then is it honest to say the student has not met the bar.
 * - `null` — never attempted (nothing to say), currently mid-session (the
 *   in-progress card already owns that state), or passed (the row shows the
 *   completed check instead).
 *
 * `attemptCount` is the graded count for `"not_passed"` (the number of real,
 * marked tries) and the used count for `"grading"`.
 */
export type InterviewRowBadge =
  | { kind: "grading"; attemptCount: number }
  | { kind: "not_passed"; attemptCount: number }
  | null;

export function interviewRowBadge(
  progress: InterviewProgressRead | undefined,
): InterviewRowBadge {
  if (!progress) return null;
  // Passed rows render the completed check; nothing to add.
  if (progress.completed || progress.passed) return null;
  // A live session is already surfaced by InterviewInProgressCard — two
  // competing "state" affordances on one row would just be noise.
  if (progress.attempts_in_flight > 0) return null;

  // Attempts that are finished, i.e. not the one still running.
  const settled = progress.attempts_used - progress.attempts_in_flight;
  if (settled <= 0) return null;

  if (progress.attempts_graded < settled) {
    return { kind: "grading", attemptCount: settled };
  }
  return { kind: "not_passed", attemptCount: progress.attempts_graded };
}
