import { AlertCircle, Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  formatElapsed,
  type RunStatus,
  type TranslateFn,
} from "./generation-progress-helpers";

/**
 * Header row (status icon + headline + stepped % + elapsed) and the progress
 * bar beneath it, lifted verbatim out of `GenerationProgress`. The bar is
 * indeterminate while no checkpoint has landed (`percent === null`).
 */
export function GenerationProgressHeader({
  status,
  headline,
  percent,
  elapsed,
  t,
}: {
  status: RunStatus;
  headline: string;
  percent: number | null;
  elapsed: number;
  t: TranslateFn;
}) {
  return (
    <>
      {/* Header: status + elapsed + stepped % */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {status === "failed" ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          ) : status === "completed" ? (
            <Check className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-m3-primary" />
          )}
          <span className="font-headline font-bold text-sm text-m3-on-surface truncate">
            {headline}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums text-m3-on-surface-variant">
          {percent !== null && (
            <span className="font-bold text-m3-primary">{percent}%</span>
          )}
          <span title={t("teacher_quiz_results.generation.elapsed")}>
            {formatElapsed(elapsed)}
          </span>
        </div>
      </div>

      {/* Progress bar (indeterminate when no checkpoint yet) */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-m3-surface-container">
        {percent === null ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-m3-primary/60" />
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              status === "failed" ? "bg-red-500" : "bg-m3-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </>
  );
}
