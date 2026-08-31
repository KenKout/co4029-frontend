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
 * - `"grading"` — at least one gradeable terminal attempt has no verdict yet.
 *   Evaluation is an ARQ job, so `attempts_awaiting_grade > 0` means "being
 *   marked". Abandoned and system-failed rows are excluded because no verdict
 *   will arrive for them.
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

  if (progress.attempts_awaiting_grade > 0) {
    return { kind: "grading", attemptCount: progress.attempts_awaiting_grade };
  }
  if (progress.attempts_graded <= 0) return null;
  return { kind: "not_passed", attemptCount: progress.attempts_graded };
}
