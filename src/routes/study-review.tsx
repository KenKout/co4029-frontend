import { useMemo, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { useReviewQueue } from "@/lib/api/hooks/spaced-repetition";
import { queryKeys } from "@/lib/api/query-keys";
import { deriveQueueStats } from "@/routes/_components/study-review/helpers";
import { ReviewCardView } from "@/routes/_components/study-review/ReviewCardView";
import {
  ReviewDoneScreen,
  ReviewEmptyQueue,
  ReviewErrorState,
  ReviewLoadingState,
} from "@/routes/_components/study-review/ReviewScreens";

/**
 * Flashcard-style review session — the surface that *resolves* due cards.
 *
 * Pulls the due queue once, then walks it card-by-card with local state:
 * answer → submit (grades + reschedules via SM-2 on the backend) → feedback →
 * next. The queue count is authoritative on load; we track answered cards
 * locally so the progress bar and "done" screen don't need a refetch per card.
 */
export default function StudyReviewPage() {
  const { t } = useTranslation();
  // Scope the session to a lesson or course when the entry link carried it
  // (per-course "Review" or the SR reminder deep-link). Omitted = full backlog.
  const { lesson, course } = useSearch({ strict: false }) as {
    lesson?: string;
    course?: string;
  };
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useReviewQueue({
    limit: 20,
    lessonId: lesson,
    courseSlug: course,
  });

  const cards = useMemo(() => data?.items ?? [], [data]);
  const stats = deriveQueueStats(data);
  const [index, setIndex] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // After every answer the SM-2 write reschedules the card (a wrong answer
  // pushes it to the 24h cooldown, a pass advances it), so the cards-due list
  // and the dashboard tile are now stale. The submit endpoint isn't a
  // react-query mutation, so nothing auto-invalidates — do it here. Without
  // this, returning to /study/cards-due shows the card just answered (the "it
  // still lives in cards-due" bug).
  //
  // The review-queue is invalidated with refetchType:"none": we mark it stale
  // (so it refetches on the next mount / when the student navigates back) but
  // do NOT refetch it mid-session. An active refetch would shrink the `cards`
  // array under the walkthrough — since ReviewCardView is keyed on
  // question_id, cards[index] would resolve to a different card, remounting the
  // component with fresh state and instantly skipping past the feedback the
  // student is still reading. "Keep reviewing" (restartSession) does the
  // explicit refetch when the student is ready for the next batch.
  const invalidateSrCaches = () => {
    void queryClient.invalidateQueries({ queryKey: ["sr", "cards-due"] });
    void queryClient.invalidateQueries({
      queryKey: ["sr", "review-queue"],
      refetchType: "none",
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sr.dashboardSummary(),
    });
  };

  if (isLoading) {
    return <ReviewLoadingState />;
  }

  if (isError) {
    return <ReviewErrorState />;
  }

  const total = cards.length;
  const done = index >= total;

  if (total === 0) {
    return <ReviewEmptyQueue stats={stats} />;
  }

  if (done) {
    return (
      <ReviewDoneScreen
        stats={stats}
        scope={{ lesson, course }}
        answeredCount={answeredCount}
        correctCount={correctCount}
      />
    );
  }

  const card = cards[index];
  const pct = total > 0 ? Math.round((index / total) * 100) : 0;

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Top bar: back + title with today's reviews on the right, then the
            session progress bar with the position + running correct count. */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Link
                to="/study/cards-due"
                search={{ lesson, course }}
                className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
                aria-label={t("study_review.back", "Back")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-lg font-headline font-bold text-m3-on-surface">
                {t("study_review.title", "Review session")}
              </h1>
            </div>
            {stats.dailyCap > 0 && (
              <span className="text-xs font-semibold text-m3-on-surface-variant">
                {t("study_review.today_progress", {
                  done: stats.reviewedToday + answeredCount,
                  cap: stats.dailyCap,
                  defaultValue: "{{done}} of {{cap}} reviews today",
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-m3-surface-container-high overflow-hidden">
              <div
                className="h-full bg-m3-primary transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-m3-on-surface tabular-nums">
              {index}/{total}
            </span>
            <span className="text-xs font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
              {correctCount} {t("study_review.stat_correct", "correct")}
            </span>
          </div>
        </div>

        <ReviewCardView
          key={card.question_id}
          card={card}
          index={index}
          onResolved={(result) => {
            setAnsweredCount((c) => c + 1);
            if (result.correct) setCorrectCount((c) => c + 1);
            // The card was just rescheduled server-side — clear the stale
            // cards-due / dashboard / queue caches so other surfaces reflect
            // it immediately (fixes the card lingering in cards-due).
            invalidateSrCaches();
          }}
          onNext={() => setIndex((i) => i + 1)}
          isLast={index === total - 1}
        />
      </div>
    </div>
  );
}
