import { formatRelativeInterviewTime } from "@/lib/interview/format";
import type { InterviewHeaderProps } from "./types";

/** Everything the header needs to draw its progress row, derived at render
 * time. `Date.now()` is read on every call on purpose: the header already
 * re-renders every second via the `elapsed` string. */
export type HeaderProgress = {
  safeCurrent: number;
  safeTotal: number | null;
  progress: number | null;
  expected: string | null;
};

export function resolveHeaderProgress({
  timerActive,
  assessmentStartedAtMs,
  expectedDurationMinutes,
  currentQuestion,
  totalQuestions,
}: Pick<
  InterviewHeaderProps,
  | "timerActive"
  | "assessmentStartedAtMs"
  | "expectedDurationMinutes"
  | "currentQuestion"
  | "totalQuestions"
>): HeaderProgress {
  const safeCurrent = Math.max(1, currentQuestion ?? 1);
  const safeTotal = totalQuestions
    ? Math.max(safeCurrent, totalQuestions)
    : null;
  // The learner API intentionally reveals questions one at a time and never
  // exposes a question total, so `safeTotal` is effectively always null and the
  // question-count progress below never applies. Without a fallback the bar sat
  // frozen on the indeterminate 1/3 pulse for the WHOLE session. When the
  // interview has a time limit and the assessed timer is running, drive the bar
  // off elapsed/limit instead so it actually advances. Derived at render time;
  // the header already re-renders every second via the `elapsed` string.
  const timeProgress =
    timerActive &&
    assessmentStartedAtMs != null &&
    expectedDurationMinutes != null &&
    expectedDurationMinutes > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((Date.now() - assessmentStartedAtMs) /
              (expectedDurationMinutes * 60_000)) *
              100,
          ),
        )
      : null;
  const progress = safeTotal
    ? Math.min(100, (safeCurrent / safeTotal) * 100)
    : timeProgress;
  const expected = expectedDurationMinutes
    ? formatRelativeInterviewTime(expectedDurationMinutes * 60)
    : null;

  return { safeCurrent, safeTotal, progress, expected };
}
