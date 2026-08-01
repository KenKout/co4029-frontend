import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  resolveStageState,
  STAGE_LABEL_KEYS,
  type RunProgressView,
  type StageState,
  type TranslateFn,
} from "./generation-progress-helpers";

function StageStep({
  label,
  state,
  index,
}: {
  label: string;
  state: StageState;
  index: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
          state === "done" && "bg-emerald-500 text-white",
          state === "active" &&
            "bg-m3-primary text-white ring-4 ring-m3-primary/20",
          state === "pending" &&
            "bg-m3-surface-container text-m3-on-surface-variant",
        )}
      >
        {state === "done" ? (
          <Check className="h-4 w-4" />
        ) : state === "active" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          index + 1
        )}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium text-center leading-tight truncate w-full",
          state === "pending"
            ? "text-m3-on-surface-variant"
            : "text-m3-on-surface",
        )}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Horizontal done/active/pending stepper over the stages seen so far.
 * Renders nothing when no stage has checkpointed, matching the pre-split
 * `stageKeys.length > 0 &&` guard.
 */
export function GenerationProgressStepper({
  stageKeys,
  view,
  t,
}: {
  stageKeys: readonly string[];
  view: Pick<RunProgressView, "status" | "stageIndex" | "isTerminal">;
  t: TranslateFn;
}) {
  if (stageKeys.length === 0) return null;
  return (
    <div className="flex items-start gap-1">
      {stageKeys.map((key, i) => (
        <StageStep
          key={key}
          index={i}
          label={t(STAGE_LABEL_KEYS[key] ?? "", key)}
          state={resolveStageState(i + 1, view)}
        />
      ))}
    </div>
  );
}
