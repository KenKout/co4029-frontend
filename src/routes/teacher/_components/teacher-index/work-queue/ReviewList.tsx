import type { ReviewQueueKind } from "@/lib/api/hooks/teacher-courses";
import { ReviewQueueRow } from "@/routes/teacher/_components/ReviewQueueRow";

import { ExpandableReviewRow } from "./ExpandableReviewRow";

import type { ReviewCandidate, TranslateFn } from "../types";

/**
 * The "Content" view of the Work Queue: the Human-in-the-Loop backlog.
 * Zero-count rows are omitted (same rule as the admin needs-attention
 * list) so this never shows resolved work.
 *
 * A `focus` signal from the All tab expands the matching category, so
 * "Review 53 quiz questions" lands the teacher on the actual list of
 * items rather than on a count they have already read.
 */
export function ReviewList({
  reviewItems,
  focus,
  t,
}: {
  reviewItems: ReviewCandidate[];
  /** Auto-expand signal keyed by category (from the All tab). */
  focus: { kind: ReviewQueueKind; nonce: number } | null;
  t: TranslateFn;
}) {
  if (reviewItems.length === 0) return null;
  return (
    <div className="divide-y divide-m3-outline-variant/20">
      {reviewItems.map((item) =>
        item.kind ? (
          <ExpandableReviewRow
            key={item.key}
            label={item.label}
            count={item.count}
            hint={item.hint}
            icon={item.icon}
            kind={item.kind}
            tone={item.tone}
            autoOpenKey={
              focus && focus.kind === item.kind
                ? `${item.kind}:${focus.nonce}`
                : undefined
            }
          />
        ) : (
          <ReviewQueueRow
            key={item.key}
            label={item.label}
            count={item.count}
            hint={item.hint}
            icon={item.icon}
            to={item.to}
            tone={item.tone}
          />
        ),
      )}
    </div>
  );
}
