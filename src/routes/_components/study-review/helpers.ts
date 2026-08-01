import type { useReviewQueue } from "@/lib/api/hooks/spaced-repetition";

/**
 * Derived counters for the review session, lifted verbatim out of
 * study-review.tsx. Pure — same expressions, same comments.
 */
export type ReviewQueueData = ReturnType<typeof useReviewQueue>["data"];

/** The scope the session was entered with (lesson / course deep-link). */
export interface ReviewScope {
  lesson?: string;
  course?: string;
}

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
