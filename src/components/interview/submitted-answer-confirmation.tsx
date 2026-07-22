import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Loader2, RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Compact main-screen confirmation for the most recently submitted answer
 * (interview main-screen spec §8).
 *
 * Visually SECONDARY to the Question Card: a subtle success rail with a 2–3
 * line answer preview, never a large candidate chat bubble and never something
 * that reads as a second active input. The full answer stays in the Transcript
 * drawer; this card exposes an expand/collapse for a quick in-place peek plus a
 * "View full answer" action that opens the drawer.
 *
 * Three visual states, driven by `status`:
 *  - `submitted`   → ✓ success rail + preview + View full answer
 *  - `processing`  → success rail with an "Analyzing your answer…" note
 *  - `failed`      → danger rail, preserved-answer note, Try again / keep editing
 */
export type SubmittedAnswerConfirmationStatus = "submitted" | "processing" | "failed";

export interface SubmittedAnswerConfirmationProps {
  status: SubmittedAnswerConfirmationStatus;
  /** The submitted (or attempted) answer text; preview is derived from it. */
  answer: string;
  /** Opens the Transcript drawer at the full answer. */
  onViewFullAnswer?: () => void;
  /** Failure-state retry (reuses the same submissionId — no duplicate turn). */
  onRetry?: () => void;
  /** Failure-state "keep editing" — returns focus to the composer. */
  onContinueEditing?: () => void;
  /** Optional submitted-at label (already formatted) shown when useful. */
  timestamp?: string;
  /**
   * Collapsed "✓ Previous answer submitted" form (spec §2 next-question state):
   * once the next question is active the confirmation shrinks to a single line
   * and drops the inline preview, keeping the workspace focused on the new
   * question while still acknowledging the prior answer.
   */
  previous?: boolean;
  className?: string;
}

export function SubmittedAnswerConfirmation({
  status,
  answer,
  onViewFullAnswer,
  onRetry,
  onContinueEditing,
  timestamp,
  previous = false,
  className,
}: SubmittedAnswerConfirmationProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const previewId = useId();
  const trimmed = answer.trim();

  if (status === "failed") {
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

  // Collapsed acknowledgement once a new question is active (spec §2).
  if (previous) {
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

  const processing = status === "processing";

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
              onClick={() => setExpanded((open) => !open)}
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

export default SubmittedAnswerConfirmation;
