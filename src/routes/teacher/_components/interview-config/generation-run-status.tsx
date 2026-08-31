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
  const { inProgress, failed, cancelled, completed, progress, elapsed } = state;
  return (
    <div
      role={failed || cancelled ? "alert" : "status"}
      aria-live={inProgress ? "polite" : undefined}
      className={cn(
        "rounded-xl border p-4 text-sm shadow-sm",
        failed
          ? "border-red-200 bg-red-50 text-red-900"
          : cancelled
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : completed
              ? "border-emerald-200/80 bg-emerald-50/70 text-emerald-900"
              : "border-m3-primary/20 bg-m3-primary/[0.055] text-m3-on-surface",
      )}
    >
      <GenerationRunHeader
        inProgress={inProgress}
        failed={failed}
        cancelled={cancelled}
        progress={progress}
        elapsed={elapsed}
      />

      {!failed && !cancelled && (
        <GenerationProgressBar
          completed={completed}
          inProgress={inProgress}
          progress={progress}
        />
      )}

      {failed && run?.failure_message && (
        <p className="mt-3 border-t border-red-200/80 pt-3 text-xs leading-5">
          {run.failure_message}
        </p>
      )}
      {cancelled && (
        <p className="mt-3 border-t border-amber-200/80 pt-3 text-xs leading-5">
          {t("teacher_interview_config.generate.cancelled")}
        </p>
      )}
      {completed && (
        <p className="mt-2 text-xs leading-5 text-emerald-800/80">
          {t("teacher_interview_config.generate.success_body")}
        </p>
      )}
    </div>
  );
}

function GenerationRunHeader({
  inProgress,
  failed,
  cancelled,
  progress,
  elapsed,
}: {
  inProgress: boolean;
  failed: boolean;
  cancelled: boolean;
  progress: GenerationProgress | null;
  elapsed: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-2 font-bold">
        {inProgress ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : failed ? (
          <X className="h-4 w-4 shrink-0" />
        ) : cancelled ? (
          <X className="h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">
          {inProgress
            ? t("teacher_interview_config.generate.in_progress")
            : failed
              ? t("teacher_interview_config.generate.failed")
              : cancelled
                ? t("teacher_interview_config.generate.cancelled")
                : t("teacher_interview_config.generate.completed")}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
        {progress && !failed && (
          <span className="rounded-md bg-current/10 px-1.5 py-0.5 font-extrabold">
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
    <div className="mt-4 space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
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
