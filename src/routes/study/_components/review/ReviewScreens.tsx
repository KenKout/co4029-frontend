import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Inbox, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  deriveDoneStats,
  type ReviewQueueStats,
  type ReviewScope,
} from "./helpers";

/** In-flight queue fetch. */
export function ReviewLoadingState() {
  return (
    <div className="max-w-2xl mx-auto pt-10 flex justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-m3-primary" />
    </div>
  );
}

/** The queue request failed. */
export function ReviewErrorState() {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl mx-auto pt-10 text-center">
      <p className="text-sm text-m3-on-surface-variant">
        {t("study_review.load_failed", "Couldn't load your review session.")}
      </p>
    </div>
  );
}

/**
 * Capped out vs genuinely caught up are different messages: one says "come
 * back tomorrow" (work remains, you've hit today's healthy limit), the
 * other celebrates an empty backlog.
 */
export function ReviewEmptyQueue({ stats }: { stats: ReviewQueueStats }) {
  const { t } = useTranslation();
  const { cappedOut, dailyCap, totalDue } = stats;

  return (
    <div className="max-w-2xl mx-auto pt-10">
      <EmptyState
        icon={Inbox}
        title={
          cappedOut
            ? t("study_review.capped_title", "That's your reviews for today")
            : t("study_review.empty_title", "Nothing to review")
        }
        description={
          cappedOut
            ? t("study_review.capped_body", {
                cap: dailyCap,
                remaining: totalDue,
                defaultValue:
                  "You've hit today's cap of {{cap}}. {{remaining}} cards are waiting — come back tomorrow to keep your streak steady.",
              })
            : t(
                "study_review.empty_body",
                "You're all caught up. Come back when cards are due.",
              )
        }
        cta={
          <Link to="/dashboard/sr">
            <Button variant="default" className="cursor-pointer">
              {t("study_review.back_to_dashboard", "Back to dashboard")}
            </Button>
          </Link>
        }
      />
    </div>
  );
}

/** The backlog / cap notice under the session-complete headline. */
function DoneBacklogNotice({
  scope,
  remaining,
  moreToday,
  cappedForToday,
}: {
  scope: ReviewScope;
  remaining: number;
  moreToday: boolean;
  cappedForToday: boolean;
}) {
  const { t } = useTranslation();
  const { lesson, course } = scope;

  if (moreToday) {
    return (
      <div className="mx-auto max-w-sm rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 space-y-3">
        <p className="text-sm font-semibold text-amber-800">
          {t("study_review.remaining_backlog", {
            count: remaining,
            defaultValue: "{{count}} more cards still due.",
          })}
        </p>
        {/* Send the student back to the cards-due overview to pick what to
            review next. The cards-due cache was invalidated on each answer,
            so its counts are already fresh. */}
        <Link to="/study/cards-due" search={{ lesson, course }}>
          <Button variant="default" size="sm" className="cursor-pointer">
            {t("study_review.keep_reviewing", "Keep reviewing")}
          </Button>
        </Link>
      </div>
    );
  }

  if (cappedForToday) {
    return (
      <div className="mx-auto max-w-sm rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-800">
          {t("study_review.capped_done", {
            remaining,
            defaultValue:
              "That's today's cap done. {{remaining}} cards remain — come back tomorrow.",
          })}
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm font-semibold text-emerald-700">
      {t("study_review.all_caught_up", "You're all caught up!")}
    </p>
  );
}

/** The end-of-session screen: score line, backlog notice, back link. */
export function ReviewDoneScreen({
  stats,
  scope,
  answeredCount,
  correctCount,
}: {
  stats: ReviewQueueStats;
  scope: ReviewScope;
  answeredCount: number;
  correctCount: number;
}) {
  const { t } = useTranslation();
  const { remaining, moreToday, cappedForToday } = deriveDoneStats(
    stats,
    answeredCount,
  );

  return (
    <div className="max-w-2xl mx-auto pt-10 text-center space-y-4">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
        <PartyPopper className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-headline font-black text-m3-on-surface">
        {t("study_review.done_title", "Session complete!")}
      </h2>
      <p className="text-sm text-m3-on-surface-variant">
        {t("study_review.done_body", {
          correct: correctCount,
          total: answeredCount,
          defaultValue: "You got {{correct}} of {{total}} right.",
        })}
      </p>
      <DoneBacklogNotice
        scope={scope}
        remaining={remaining}
        moreToday={moreToday}
        cappedForToday={cappedForToday}
      />
      <div>
        <Link to="/dashboard/sr">
          <Button variant="outline" className="cursor-pointer">
            {t("study_review.back_to_dashboard", "Back to dashboard")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
