import { useTranslation } from "react-i18next";
import { Clock3 } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatRelativeInterviewTime } from "@/lib/interview/format";

/**
 * The centre header cell: which question is live, how long the candidate has
 * been on it, and the progress bar (determinate when a total or a time limit is
 * known, travelling-band indeterminate otherwise).
 */
export function InterviewHeaderProgress({
  currentQuestion,
  safeCurrent,
  safeTotal,
  progress,
  questionElapsed,
  questionLingering,
}: {
  currentQuestion: number | null | undefined;
  safeCurrent: number;
  safeTotal: number | null;
  progress: number | null;
  questionElapsed: number | null | undefined;
  questionLingering: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-w-0 lg:col-start-2">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="truncate text-text-strong">
          {currentQuestion
            ? safeTotal
              ? t("course_interview.workspace.question_of", {
                  current: safeCurrent,
                  total: safeTotal,
                })
              : t("course_interview.workspace.question_number", {
                  current: safeCurrent,
                })
            : t("course_interview.workspace.interview_setup")}
        </span>
        {typeof questionElapsed === "number" && currentQuestion ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 tabular-nums",
              questionLingering ? "text-amber-600" : "text-text-muted",
            )}
            title={t("course_interview.workspace.time_on_question")}
            aria-label={t("course_interview.workspace.time_on_question")}
          >
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {formatRelativeInterviewTime(questionElapsed)}
          </span>
        ) : (
          <span className="hidden shrink-0 text-text-muted sm:inline">
            {t("course_interview.workspace.in_progress")}
          </span>
        )}
      </div>
      {progress !== null ? (
        <Progress
          value={progress}
          aria-label={t("course_interview.workspace.question_progress")}
          className="gap-0 [&_[data-slot=progress-track]]:h-1.5"
        />
      ) : (
        <div
          role="progressbar"
          aria-label={t("course_interview.workspace.question_progress_unknown")}
          className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
        >
          {/* Indeterminate: a band that actually travels. The previous
              version was a stationary one-third bar that merely pulsed in
              place, which reads as a stalled or broken progress bar rather
              than as "total unknown". Reuses the existing `shimmer`
              keyframe (background-position, no layout) at a progress-bar
              tempo instead of its 8s decorative default. */}
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,transparent_0%,var(--color-primary)_50%,transparent_100%)] bg-[length:200%_100%] motion-safe:animate-shimmer"
            style={{ animationDuration: "1.6s" }}
          />
        </div>
      )}
    </div>
  );
}
