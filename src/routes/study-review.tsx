import { useMemo, useRef, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Inbox,
  Lightbulb,
  Loader2,
  PartyPopper,
  XCircle,
} from "lucide-react";
import {
  submitReview,
  useReviewQueue,
} from "@/lib/api/hooks/spaced-repetition";
import { queryKeys } from "@/lib/api/query-keys";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { RichContent } from "@/components/ui/rich-content";
import { QuestionRenderer } from "@/routes/_components/QuestionRenderer";
import type { ReviewCard, ReviewSubmitResult } from "@/lib/api/types";
import { cn } from "@/lib/utils";

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
  // Full due backlog across everything (unscoped by the server), so the done
  // screen can say how many cards remain beyond the ones in this batch.
  const totalDue = data?.total_due ?? 0;
  // Daily-cap accounting. dailyCap 0 = unlimited. cappedOut = the queue is
  // empty specifically because today's cap is used up (not because the student
  // is genuinely caught up), so we show "come back tomorrow" instead of a
  // misleading "all done".
  const dailyCap = data?.daily_cap ?? 0;
  const reviewedToday = data?.reviewed_today ?? 0;
  const dailyRemaining = data?.daily_remaining ?? 0;
  const cappedOut = dailyCap > 0 && dailyRemaining === 0 && totalDue > 0;
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
    return (
      <div className="max-w-2xl mx-auto pt-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-m3-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto pt-10 text-center">
        <p className="text-sm text-m3-on-surface-variant">
          {t("study_review.load_failed", "Couldn't load your review session.")}
        </p>
      </div>
    );
  }

  const total = cards.length;
  const done = index >= total;

  if (total === 0) {
    // Capped out vs genuinely caught up are different messages: one says "come
    // back tomorrow" (work remains, you've hit today's healthy limit), the
    // other celebrates an empty backlog.
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

  if (done) {
    // total_due was the full backlog when the queue loaded, before this
    // session's answers. Passing cards leave the backlog; failing ones stay
    // due — but either way the student cleared `answeredCount` from the top of
    // the queue, so the honest "still waiting" figure is total_due minus what
    // they just worked through, floored at zero.
    const remaining = Math.max(0, totalDue - answeredCount);
    // With a daily cap, "Keep reviewing" only helps if today's allowance still
    // has room after this batch. dailyRemaining was the allowance at load; the
    // student just spent `answeredCount` of it.
    const capRemainingNow =
      dailyCap > 0 ? Math.max(0, dailyRemaining - answeredCount) : remaining;
    const moreToday = remaining > 0 && capRemainingNow > 0;
    const cappedForToday =
      remaining > 0 && dailyCap > 0 && capRemainingNow === 0;
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
        {moreToday ? (
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
        ) : cappedForToday ? (
          <div className="mx-auto max-w-sm rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800">
              {t("study_review.capped_done", {
                remaining,
                defaultValue:
                  "That's today's cap done. {{remaining}} cards remain — come back tomorrow.",
              })}
            </p>
          </div>
        ) : (
          <p className="text-sm font-semibold text-emerald-700">
            {t("study_review.all_caught_up", "You're all caught up!")}
          </p>
        )}
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

  const card = cards[index];
  const pct = Math.round((index / total) * 100);

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link
            to="/study/cards-due"
            search={{ lesson, course }}
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label={t("study_review.back", "Back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title={t("study_review.title", "Review session")}
            subtitle={t("study_review.progress", {
              current: index + 1,
              total,
              defaultValue: "Card {{current}} of {{total}}",
            })}
          />
        </div>

        {/* Wide two-column layout: the card fills the main column, the session
            rail uses the right-hand space for progress + running stats. */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6 items-start">
          <ReviewCardView
            key={card.question_id}
            card={card}
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

          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="bg-m3-surface-container-lowest rounded-2xl ghost-border shadow-editorial p-5 space-y-4">
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-m3-on-surface-variant">
                    {t("study_review.session_progress", "Progress")}
                  </span>
                  <span className="text-xs font-semibold text-m3-on-surface tabular-nums">
                    {index}/{total}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-m3-surface-container-high overflow-hidden">
                  <div
                    className="h-full bg-m3-primary transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              {dailyCap > 0 && (
                <div className="text-[11px] text-m3-on-surface-variant">
                  {t("study_review.today_progress", {
                    done: reviewedToday + answeredCount,
                    cap: dailyCap,
                    defaultValue: "{{done}} of {{cap}} reviews today",
                  })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <div className="text-xl font-headline font-black text-emerald-700 tabular-nums">
                    {correctCount}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700/70">
                    {t("study_review.stat_correct", "Correct")}
                  </div>
                </div>
                <div className="rounded-xl bg-m3-surface-container-high p-3 text-center">
                  <div className="text-xl font-headline font-black text-m3-on-surface tabular-nums">
                    {total - index}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-m3-on-surface-variant">
                    {t("study_review.stat_remaining", "Left")}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReviewCardView({
  card,
  onResolved,
  onNext,
  isLast,
}: {
  card: ReviewCard;
  onResolved: (result: ReviewSubmitResult) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReviewSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track real hint usage — the quiz-taking path does the same, and the SM-2
  // Q grade depends on it (correct WITH hint → Q∈{1,2}, WITHOUT → Q∈{3,4,5}).
  // Hardcoding false here would grade a review card on a different scale than
  // the exact same card answered inside a quiz.
  const [hintShown, setHintShown] = useState(false);
  const startedAt = useRef<number>(Date.now());

  const hintText = (card.question as { hint_text?: string | null }).hint_text;
  const hintFormat =
    (card.question as { hint_format?: string }).hint_format ?? "plain";

  const hasAnswer =
    selectedOptionId !== null || (answerText ?? "").trim().length > 0;
  const graded = result !== null;

  async function handleSubmit() {
    if (!hasAnswer || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitReview(card.question_id, {
        selected_option_id: selectedOptionId,
        answer_text: answerText,
        hint_used: hintShown,
        t_actual_ms: Date.now() - startedAt.current,
      });
      setResult(res);
      onResolved(res);
    } catch {
      setError(t("study_review.submit_failed", "Couldn't submit — try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-m3-surface-container-lowest rounded-2xl ghost-border shadow-editorial p-6 sm:p-8 space-y-5">
      {/* Course + lesson context (the thing the old screen was missing) */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="font-bold px-2 py-0.5 rounded-full bg-m3-primary-fixed text-m3-primary">
          {card.course_title}
        </span>
        <span className="text-m3-on-surface-variant">{card.lesson_title}</span>
      </div>

      {/* Prompt */}
      <RichContent
        value={card.question.prompt_text}
        format={
          (card.question as { prompt_format?: string }).prompt_format ?? "plain"
        }
        className="text-base font-medium text-m3-on-surface"
      />

      {/* Answer input (reuses the quiz-taking renderer for every type) */}
      <QuestionRenderer
        question={card.question}
        selectedOptionId={selectedOptionId}
        answerText={answerText}
        disabled={graded || submitting}
        onSelectOption={(id) => !graded && setSelectedOptionId(id)}
        onAnswerTextChange={(v) => !graded && setAnswerText(v)}
      />

      {/* Hint — parity with the quiz-taking flow. Viewing it flags the answer
          as assisted recall, which caps the SM-2 grade at Q≤2 so a hinted
          review can't inflate the card's interval the way an unaided one does.
          Only offered before grading and only when the question carries one. */}
      {hintText && !graded && (
        <div>
          {hintShown ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <div className="min-w-0 space-y-0.5">
                <RichContent
                  value={hintText}
                  format={hintFormat}
                  className="text-sm text-amber-900"
                />
                <p className="text-[11px] text-amber-700/80">
                  {t(
                    "study_review.hint_counts",
                    "Using a hint counts as assisted recall.",
                  )}
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setHintShown(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
            >
              <Lightbulb className="h-4 w-4" />
              {t("study_review.show_hint", "Show hint")}
            </button>
          )}
        </div>
      )}

      {/* Feedback after grading */}
      {graded && (
        <div
          className={cn(
            "rounded-xl p-4 flex items-start gap-3",
            result.correct
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800",
          )}
        >
          {result.correct ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-sm">
              {result.correct
                ? t("study_review.correct", "Correct!")
                : t("study_review.incorrect", "Not quite.")}
            </p>
            {!result.correct && result.correct_answer_text && (
              <p className="text-xs">
                {t("study_review.correct_answer", "Answer")}:{" "}
                <span className="font-semibold">
                  {result.correct_answer_text}
                </span>
              </p>
            )}
            {result.explanation && (
              <p className="text-xs opacity-90">{result.explanation}</p>
            )}
            <p className="text-xs opacity-80">
              {result.passing
                ? t("study_review.next_in", {
                    days: result.interval_days,
                    defaultValue: "Next review in {{days}} day(s).",
                  })
                : t(
                    "study_review.will_repeat",
                    "You'll see this one again soon.",
                  )}
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Action */}
      <div className="flex justify-end">
        {!graded ? (
          <Button
            onClick={handleSubmit}
            disabled={!hasAnswer || submitting}
            className="gap-2 cursor-pointer"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("study_review.submit", "Submit")}
          </Button>
        ) : (
          <Button onClick={onNext} className="gap-2 cursor-pointer">
            {isLast
              ? t("study_review.finish", "Finish")
              : t("study_review.next", "Next card")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
