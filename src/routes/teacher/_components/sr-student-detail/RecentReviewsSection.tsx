import { CheckCircle2, Clock, Info, XCircle } from "lucide-react";

import type { StudentSrDetail } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { efMeta, type TranslateFn } from "./constants";

type RecentReview = NonNullable<StudentSrDetail["recent_reviews"]>[number];

function EfBadge({ ef, t }: { ef: number; t: TranslateFn }) {
  const meta = efMeta(ef);
  return (
    <span
      className={cn(
        "text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit inline-flex items-center gap-1.5",
        meta.cls,
      )}
      title={t("teacher_sr_cohort.ef_hint")}
    >
      {t(meta.labelKey)}
      <span className="font-mono font-medium opacity-70">
        EF {ef.toFixed(2)}
      </span>
    </span>
  );
}

function ReviewRow({
  review,
  formatRelative,
  t,
}: {
  review: RecentReview;
  formatRelative: (iso: string) => string;
  t: TranslateFn;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 hover:bg-m3-surface-container-low transition-colors">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          review.correct ? "bg-emerald-100" : "bg-red-100",
        )}
      >
        {review.correct ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium text-m3-on-surface truncate"
          title={review.prompt_text || undefined}
        >
          {review.prompt_text?.trim()
            ? review.prompt_text
            : review.correct
              ? t("teacher_sr_student_detail.review.answered_correct")
              : t("teacher_sr_student_detail.review.answered_incorrect")}
        </p>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {formatRelative(review.created_at)}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        <EfBadge ef={review.ef_after} t={t} />
        <Info
          className="h-3 w-3 text-m3-on-surface-variant/60 cursor-help shrink-0 hidden sm:block"
          aria-label={t("teacher_sr_cohort.ef_hint")}
          tabIndex={0}
        >
          <title>{t("teacher_sr_cohort.ef_hint")}</title>
        </Info>
      </div>
    </div>
  );
}

/** Most recent review attempts, newest first. */
export function RecentReviewsSection({
  reviews,
  isLoading,
  formatRelative,
  t,
}: {
  reviews: RecentReview[];
  isLoading: boolean;
  formatRelative: (iso: string) => string;
  t: TranslateFn;
}) {
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
      <div className="px-6 py-4 border-b border-m3-outline-variant/20">
        <h2 className="font-heading font-bold text-base text-m3-on-surface flex items-center gap-2">
          <Clock className="h-4 w-4 text-m3-secondary" />
          {t("teacher_sr_student_detail.recent_title")}
        </h2>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {reviews.length > 0
            ? t("teacher_sr_student_detail.recent_count", {
                count: reviews.length,
              })
            : t("teacher_sr_student_detail.no_history")}
        </p>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-m3-surface-container-low animate-pulse"
            />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="px-6 py-10 flex flex-col items-center gap-2 text-center">
          <Clock className="h-7 w-7 text-m3-on-surface-variant opacity-40" />
          <p className="text-sm text-m3-on-surface-variant">
            {t("teacher_sr_student_detail.empty_reviews")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-m3-outline-variant/10">
          {reviews.map((review, idx) => (
            <ReviewRow
              key={`${review.question_id}-${review.created_at}-${idx}`}
              review={review}
              formatRelative={formatRelative}
              t={t}
            />
          ))}
        </div>
      )}
    </section>
  );
}
