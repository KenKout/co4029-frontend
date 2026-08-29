import { useEffect, useRef } from "react";
import { CheckCircle } from "lucide-react";

import { SectionHeader } from "@/components/ui/section-header";
import type { ReviewQueueKind } from "@/lib/api/hooks/teacher-courses";
import { ReviewQueueRow } from "@/routes/teacher/_components/ReviewQueueRow";

import { ExpandableReviewRow } from "./ExpandableReviewRow";

import type { ReviewCandidate, TranslateFn } from "./types";

/**
 * The Human-in-the-Loop queue: the teacher-facing equivalent of the
 * admin's processing queue. Zero-count rows are omitted (same rule as the
 * admin needs-attention list) so this never shows resolved work.
 *
 * A `focus` signal from a Priority Today row scrolls the section into view
 * and expands the matching category, so "Review 53 quiz questions" lands
 * the teacher on the actual list of items.
 */
export function ReviewQueueSection({
  reviewItems,
  focus,
  t,
}: {
  reviewItems: ReviewCandidate[];
  /** Scroll-to + auto-expand signal keyed by category (from Priority Today). */
  focus: { kind: ReviewQueueKind; nonce: number } | null;
  t: TranslateFn;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const seenNonce = useRef(0);

  useEffect(() => {
    if (!focus || focus.nonce === seenNonce.current) return;
    seenNonce.current = focus.nonce;
    sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [focus]);

  return (
    <div ref={sectionRef} className="scroll-mt-24">
      <SectionHeader
        title={t("teacher_dashboard.review.title")}
        subtitle={t("teacher_dashboard.review.subtitle")}
      />
      {reviewItems.length > 0 ? (
        <div className="mt-4 divide-y divide-m3-outline-variant/20 overflow-hidden rounded-xl bg-card shadow-editorial ghost-border">
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