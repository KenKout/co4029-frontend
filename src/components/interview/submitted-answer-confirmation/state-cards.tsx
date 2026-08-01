/**
 * The four visual states of `<SubmittedAnswerConfirmation>`, one component per
 * state (spec §8).
 *
 * Extracted from `submitted-answer-confirmation.tsx` verbatim — same sections,
 * classes, aria attributes and i18n keys — so the entry component is a flat
 * early-return dispatch rather than four inlined layouts. The expand/collapse
 * state and the preview id stay OWNED BY THE PARENT and arrive as props, so
 * toggling between states never resets them.
 */
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * B-Tier-1 #13: an unmistakable in-flight state so the student never wonders
 * whether their answer went through. Shows a spinner rail + a dimmed preview
 * of the answer being sent; the composer is disabled by the caller meanwhile.
 */
export function SubmittingAnswerCard({
  trimmed,
  className,
}: {
  trimmed: string;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <section
      className={cn(
        "rounded-xl border border-primary/25 bg-primary-soft/40 px-4 py-3 sm:px-5",
        className,
      )}
      aria-label={t("course_interview.submission.submitting_title")}
      aria-busy="true"
    >
      <div className="flex items-center gap-2">
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin text-primary"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold text-primary">
          {t("course_interview.submission.submitting_title")}
        </p>
      </div>
      {trimmed && (
        <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-6 text-text-muted">
          {trimmed}
        </p>
      )}
    </section>
  );
}

export function FailedAnswerCard({
  onRetry,
  onContinueEditing,
  className,
}: {
  onRetry?: () => void;
  onContinueEditing?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <section
      className={cn(
        "rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 sm:px-5",
        className,
      )}
      aria-label={t("course_interview.submission.failed_title")}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger"
          aria-hidden="true"
        >
          <TriangleAlert className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-danger">
            {t("course_interview.submission.failed_title")}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {t("course_interview.submission.failed_preserved")}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {onRetry && (
              <Button
                type="button"
                size="sm"
                onClick={onRetry}
                className="min-h-9 rounded-lg"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("course_interview.submission.try_again")}
              </Button>
            )}
            {onContinueEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onContinueEditing}
                className="min-h-9 rounded-lg bg-white"
              >
                {t("course_interview.submission.continue_editing")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Collapsed acknowledgement once a new question is active (spec §2). */
export function PreviousAnswerAcknowledgement({
  onViewFullAnswer,
  className,
}: {
  onViewFullAnswer?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs font-medium text-text-muted",
        className,
      )}
    >
      <span
        className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
        aria-hidden="true"
      >
        <Check className="h-2.5 w-2.5" />
      </span>
      <span>{t("course_interview.submission.previous_submitted")}</span>
      {onViewFullAnswer && (
        <button
          type="button"
          onClick={onViewFullAnswer}
          className="ml-1 inline-flex min-h-6 items-center text-xs font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {t("course_interview.submission.view_full_answer")}
        </button>
      )}
    </div>
  );
}

/** The answer preview plus its expand/collapse and "view full answer" row. */
function AnswerPreview({
  trimmed,
  previewId,
  expanded,
  onToggleExpanded,
  onViewFullAnswer,
}: {
  trimmed: string;
  previewId: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onViewFullAnswer?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <p
        id={previewId}
        className={cn(
          // Preview: 2–3 lines, wraps, breaks long/multilingual words, never
          // overflows the container.
          "mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-text-body",
          !expanded && "line-clamp-3",
        )}
      >
        {trimmed}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={previewId}
          className="inline-flex min-h-6 items-center gap-1 text-xs font-semibold text-text-muted outline-none hover:text-text-strong focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
          {expanded
            ? t("course_interview.submission.collapse")
            : t("course_interview.submission.expand")}
        </button>
        {onViewFullAnswer && (
          <button
            type="button"
            onClick={onViewFullAnswer}
            className="inline-flex min-h-6 items-center text-xs font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {t("course_interview.submission.view_full_answer")}
          </button>
        )}
      </div>
    </>
  );
}

export function SubmittedAnswerCard({
  trimmed,
  previewId,
  expanded,
  onToggleExpanded,
  onViewFullAnswer,
  timestamp,
  processing,
  className,
}: {
  trimmed: string;
  previewId: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onViewFullAnswer?: () => void;
  timestamp?: string;
  processing: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <section
      className={cn(
        "rounded-xl border border-success/25 bg-success/5 px-4 py-3 sm:px-5",
        className,
      )}
      aria-label={t("course_interview.submission.submitted_title")}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
          aria-hidden="true"
        >
          <Check className="h-3 w-3" />
        </span>
        <p className="text-sm font-semibold text-success">
          {t("course_interview.submission.submitted_title")}
        </p>
        {timestamp && (
          <time className="ml-auto shrink-0 text-[11px] font-medium tabular-nums text-text-subtle">
            {timestamp}
          </time>
        )}
      </div>

      {trimmed && (
        <AnswerPreview
          trimmed={trimmed}
          previewId={previewId}
          expanded={expanded}
          onToggleExpanded={onToggleExpanded}
          onViewFullAnswer={onViewFullAnswer}
        />
      )}

      {processing && (
        <p className="mt-2 flex items-center gap-2 text-xs font-medium text-text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {t("course_interview.submission.analyzing")}
        </p>
      )}
    </section>
  );
}
