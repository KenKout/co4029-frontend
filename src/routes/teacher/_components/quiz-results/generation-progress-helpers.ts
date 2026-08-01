import type { useTranslation } from "react-i18next";

import type { QuizGenerationRunRead } from "@/lib/api/types";

/**
 * Pure projection + formatting helpers for {@link GenerationProgress},
 * extracted from the former 161-line / complexity-32 component body.
 *
 * Everything here is React-free: the component reads one `RunProgressView`
 * instead of re-deriving a dozen `?.`/`??` fallbacks inline, and the
 * status-dependent branch chains (headline text, stepper state) collapse into
 * lookup tables plus early-return helpers. Output is byte-identical to the
 * pre-split inline expressions.
 */

export type TranslateFn = ReturnType<typeof useTranslation>["t"];

/** Machine status of a generation run, as reported by the status poll. */
export type RunStatus = QuizGenerationRunRead["status"];

/** One append-only progress event recorded as a pipeline stage starts. */
export type StageEvent = NonNullable<
  NonNullable<QuizGenerationRunRead["progress"]>["events"]
>[number];

/** Rendered state of a single node in the horizontal stage stepper. */
export type StageState = "done" | "active" | "pending";

/** Human-readable label keys per machine stage key (see _progress.py). */
export const STAGE_LABEL_KEYS: Record<string, string> = {
  retrieval: "teacher_quiz_results.generation.stages.retrieval",
  outline: "teacher_quiz_results.generation.stages.outline",
  ideation: "teacher_quiz_results.generation.stages.ideation",
  generation: "teacher_quiz_results.generation.stages.generation",
  validation: "teacher_quiz_results.generation.stages.validation",
  dedup: "teacher_quiz_results.generation.stages.dedup",
  persistence: "teacher_quiz_results.generation.stages.persistence",
};

/** Headline copy for the three terminal statuses; absent key = still in flight. */
const TERMINAL_HEADLINE_KEYS: Record<string, string> = {
  completed: "teacher_quiz_results.generation.done",
  failed: "teacher_quiz_results.generation.failed",
  cancelled: "teacher_quiz_results.generation.cancelled",
};

/** Flattened read of a run's status + progress checkpoint. */
export interface RunProgressView {
  status: RunStatus;
  isTerminal: boolean;
  events: StageEvent[];
  /** Timestamp the elapsed timer freezes at, or null while still running. */
  frozenEnd: string | null;
  totalStages: number;
  stageIndex: number;
  currentStage: string | null;
}

export function formatElapsed(seconds: number): string {
  if (seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

type RunCheckpoint = QuizGenerationRunRead["progress"];

/** Defaults for a run whose worker hasn't written a checkpoint yet. */
function readCheckpoint(
  progress: RunCheckpoint,
): Pick<
  RunProgressView,
  "events" | "totalStages" | "stageIndex" | "currentStage"
> {
  return {
    events: progress?.events ?? [],
    totalStages: progress?.total_stages ?? 0,
    stageIndex: progress?.stage_index ?? 0,
    currentStage: progress?.current_stage ?? null,
  };
}

/** Collapse `run.status` + `run.progress` into one flat, non-optional view. */
export function readRunProgress(run: QuizGenerationRunRead): RunProgressView {
  const status = run.status;
  const isTerminal =
    status === "completed" || status === "failed" || status === "cancelled";
  const progress = run.progress ?? null;
  return {
    status,
    isTerminal,
    frozenEnd: isTerminal
      ? (run.completed_at ?? progress?.updated_at ?? null)
      : null,
    ...readCheckpoint(progress),
  };
}

/**
 * Stepped percentage. On completion force 100%; otherwise derive from the
 * stage index. Never show a fake 0% — a running-but-uncheckpointed run
 * reads as indeterminate (null).
 */
export function computePercent(
  status: RunStatus,
  totalStages: number,
  stageIndex: number,
): number | null {
  if (status === "completed") return 100;
  if (!totalStages || !stageIndex) return null;
  // A stage that's "active" is partway done — count it as half-complete
  // so the bar advances as stages start rather than only when they finish.
  return Math.round(((stageIndex - 0.5) / totalStages) * 100);
}

/**
 * Build the ordered stage list from the events we've seen plus the current
 * stage, so the stepper renders even before every stage has checkpointed.
 */
export function collectStageKeys(
  events: readonly StageEvent[],
  currentStage: string | null,
): string[] {
  const seen: string[] = [];
  for (const ev of events) {
    if (!seen.includes(ev.stage)) seen.push(ev.stage);
  }
  if (currentStage && !seen.includes(currentStage)) seen.push(currentStage);
  return seen;
}

/** Done / active / pending for the stepper node at 1-based `position`. */
export function resolveStageState(
  position: number,
  view: Pick<RunProgressView, "status" | "stageIndex" | "isTerminal">,
): StageState {
  if (view.status === "completed") return "done";
  if (position < view.stageIndex) return "done";
  if (position === view.stageIndex && !view.isTerminal) return "active";
  return "pending";
}

/** Status headline: terminal copy via lookup, else the running-stage line. */
export function resolveHeadline(
  view: Pick<RunProgressView, "status" | "currentStage">,
  t: TranslateFn,
): string {
  const terminalKey = TERMINAL_HEADLINE_KEYS[view.status];
  if (terminalKey) return t(terminalKey);
  const stage = view.currentStage;
  if (!stage) return t("teacher_quiz_results.generation.starting");
  return t("teacher_quiz_results.generation.running_stage", {
    stage: t(STAGE_LABEL_KEYS[stage] ?? "", stage),
  });
}
