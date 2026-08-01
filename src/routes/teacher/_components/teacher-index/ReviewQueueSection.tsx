import { CheckCircle } from "lucide-react";

import { SectionHeader } from "@/components/ui/section-header";
import { ReviewQueueRow } from "@/routes/teacher/_components/ReviewQueueRow";

import type { ReviewCandidate, TranslateFn } from "./types";

/**
 * The Human-in-the-Loop queue: the teacher-facing equivalent of the
 * admin's processing queue. Zero-count rows are omitted (same rule as the
 * admin needs-attention list) so this never shows resolved work.
 */
export function ReviewQueueSection({
  reviewItems,
  t,
}: {
  reviewItems: ReviewCandidate[];
  t: TranslateFn;
}) {
  return (
    <div>
      <SectionHeader
        title={t("teacher_dashboard.review.title")}
        subtitle={t("teacher_dashboard.review.subtitle")}
      />
      {reviewItems.length > 0 ? (
        <div className="mt-4 divide-y divide-m3-outline-variant/20 overflow-hidden rounded-xl bg-card shadow-editorial ghost-border">
          {reviewItems.map((item) => (
            <ReviewQueueRow
              key={item.key}
              label={item.label}
              count={item.count}
              hint={item.hint}
              icon={item.icon}
              to={item.to}
              tone={item.tone}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-card px-5 py-4 shadow-editorial ghost-border">
          <CheckCircle
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-emerald-600"
          />
          <p className="text-sm text-m3-on-surface-variant">
            {t("teacher_dashboard.review.all_clear")}
          </p>
        </div>
      )}
    </div>
  );
}
