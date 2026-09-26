import type { useReviewQueue } from "@/lib/api/hooks/spaced-repetition";

/**
 * Derived counters for the review session, lifted verbatim out of
 * study-review.tsx. Pure — same expressions, same comments.
 */
export type ReviewQueueData = ReturnType<typeof useReviewQueue>["data"];

/**
 * Daily-cap accounting. dailyCap 0 = unlimited. cappedOut = the queue is
 * empty specifically because today's cap is used up (not because the student
 * is genuinely caught up), so we show "come back tomorrow" instead of a
 * misleading "all done".
 */
export function deriveQueueStats(data: ReviewQueueData) {
  // Full due backlog across everything (unscoped by the server), so the done
  // screen can say how many cards remain beyond the ones in this batch.
  const totalDue = data?.total_due ?? 0;
  const dailyCap = data?.daily_cap ?? 0;
  const reviewedToday = data?.reviewed_today ?? 0;
  const dailyRemaining = data?.daily_remaining ?? 0;
  const cappedOut = dailyCap > 0 && dailyRemaining === 0 && totalDue > 0;
  return { totalDue, dailyCap, reviewedToday, dailyRemaining, cappedOut };
}

export type ReviewQueueStats = ReturnType<typeof deriveQueueStats>;

/**
 * total_due was the full backlog when the queue loaded, before this
 * session's answers. Passing cards leave the backlog; failing ones stay
 * due — but either way the student cleared `answeredCount` from the top of
 * the queue, so the honest "still waiting" figure is total_due minus what
 * they just worked through, floored at zero.
 */
export function deriveDoneStats(
  stats: ReviewQueueStats,
  answeredCount: number,
) {
  const remaining = Math.max(0, stats.totalDue - answeredCount);
  // With a daily cap, "Keep reviewing" only helps if today's allowance still
  // has room after this batch. dailyRemaining was the allowance at load; the
  // student just spent `answeredCount` of it.
  const capRemainingNow =
    stats.dailyCap > 0
      ? Math.max(0, stats.dailyRemaining - answeredCount)
      : remaining;
  const moreToday = remaining > 0 && capRemainingNow > 0;
  const cappedForToday =
    remaining > 0 && stats.dailyCap > 0 && capRemainingNow === 0;
  return { remaining, moreToday, cappedForToday };
}

export type ReviewIntervalDisplay =
  | { unit: "seconds" | "minutes" | "hours" | "days"; value: number }
  | { unit: "retired" };

/**
 * Convert the server's due timestamp into a human-readable interval. The
 * server applies the configurable interval-unit setting when it creates
 * `due_at`, so this remains correct for both production days and fast demo
 * seconds without exposing that setting to the client.
 */
export function describeReviewInterval(
  dueAt: string | null,
  nowMs = Date.now(),
): ReviewIntervalDisplay {
  if (!dueAt) return { unit: "retired" };

  const dueMs = Date.parse(dueAt);
  if (!Number.isFinite(dueMs)) return { unit: "seconds", value: 1 };

  const seconds = Math.max(1, Math.round((dueMs - nowMs) / 1000));
  if (seconds < 60) return { unit: "seconds", value: seconds };
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return { unit: "minutes", value: minutes };
  const hours = Math.round(seconds / 3600);
  if (hours < 24) return { unit: "hours", value: hours };
  return { unit: "days", value: Math.round(seconds / 86400) };
}
