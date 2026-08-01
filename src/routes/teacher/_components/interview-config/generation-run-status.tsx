/**
 * The live run panel of the Generate tab: status headline, stepped percentage,
 * elapsed timer, progress bar, and the terminal failure / success note.
 *
 * Split out of `generation-section.tsx` (step 9 of the interview-config
 * decomposition). Mirrors the quiz `GenerationProgress` layout.
 */

import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, X } from "lucide-react";

import type { InterviewGenerationRunPublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  formatElapsedSeconds,
  type GenerationProgress,
  type GenerationRunState,
} from "@/routes/teacher/_components/interview-config/generation-progress";

export function GenerationRunStatus({
  run,
  state,
}: {
  run: InterviewGenerationRunPublic | undefined;
  state: GenerationRunState;
}) {
  const { t } = useTranslation();
  const { inProgress, failed, completed, progress, elapsed } = state;
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3 text-sm border",
        failed
          ? "border-red-200 bg-red-50 text-red-800"
          : completed
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-blue-200 bg-blue-50 text-blue-800",
      )}
    >
      {/* Header: status icon + headline on the left; stepped % (when
          known) + live elapsed timer on the right — mirrors the quiz
          GenerationProgress layout. */}
      <GenerationRunHeader
        inProgress={inProgress}
        failed={failed}
        progress={progress}
        elapsed={elapsed}
      />

      {!failed && (
        <GenerationProgressBar
          completed={completed}
          inProgress={inProgress}
          progress={progress}
        />
      )}

      {failed && run?.failure_message && (
        <p className="mt-1 text-xs">{run.failure_message}</p>
      )}
      {completed && (
        <p className="mt-1 text-xs">
          {t("teacher_interview_config.generate.success_body")}
        </p>
      )}
    </div>
  );
}

function GenerationRunHeader({
  inProgress,
  failed,
  progress,
  elapsed,
}: {
  inProgress: boolean;
  failed: boolean;
  progress: GenerationProgress | null;
  elapsed: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2 font-bold">
        {inProgress ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : failed ? (
          <X className="h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">
          {inProgress
            ? t("teacher_interview_config.generate.in_progress")
            : failed
              ? t("teacher_interview_config.generate.failed")
              : t("teacher_interview_config.generate.completed")}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
        {progress && !failed && (
          <span className="font-extrabold">
            {progress.accepted}/{progress.target}
          </span>
        )}
        <span
          className="opacity-80"
          title={t("teacher_interview_config.generate.elapsed")}
        >
          {formatElapsedSeconds(elapsed)}
        </span>
      </div>
    </div>
  );
}

function GenerationProgressBar({
  completed,
  inProgress,
  progress,
}: {
  completed: boolean;
  inProgress: boolean;
  progress: GenerationProgress | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-xs font-medium">
        <span>
          {completed
            ? t("teacher_interview_config.generate.phase_done")
            : progress?.phase === "saving"
              ? t("teacher_interview_config.generate.phase_saving")
              : t("teacher_interview_config.generate.phase_generating")}
        </span>
        {progress && <span className="tabular-nums">{progress.percent}%</span>}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-current/15">
        {progress ? (
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out",
              completed ? "bg-emerald-500" : "bg-blue-500",
            )}
            style={{
              width: `${Math.max(progress.percent, inProgress ? 6 : 0)}%`,
            }}
          />
        ) : (
          /* No checkpoint yet — indeterminate pulse instead of a fake 0%. */
          <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-500/60" />
        )}
      </div>
    </div>
  );
}
