import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Inbox,
  Loader2,
  PartyPopper,
  XCircle,
} from "lucide-react";
import {
  submitReview,
  useReviewQueue,
} from "@/lib/api/hooks/spaced-repetition";
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
  const { data, isLoading, isError } = useReviewQueue({ limit: 20 });

  const cards = useMemo(() => data?.items ?? [], [data]);
  const [index, setIndex] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

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
    return (
      <div className="max-w-2xl mx-auto pt-10">
        <EmptyState
          icon={Inbox}
          title={t("study_review.empty_title", "Nothing to review")}
          description={t(
            "study_review.empty_body",
            "You're all caught up. Come back when cards are due.",
          )}
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
        <Link to="/dashboard/sr">
          <Button variant="default" className="cursor-pointer">
            {t("study_review.back_to_dashboard", "Back to dashboard")}
          </Button>
        </Link>
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
  const startedAt = useRef<number>(Date.now());

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
        hint_used: false,
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
