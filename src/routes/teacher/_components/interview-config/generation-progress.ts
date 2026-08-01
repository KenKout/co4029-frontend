/**
 * Live progress of an interview question-generation run: the reader for the
 * pipeline's checkpoints, the elapsed-time ticker, and the derived run state the
 * Generate tab renders.
 *
 * Split out of `generation-section.tsx` (step 9 of the interview-config
 * decomposition). These exist purely to render that panel's live status —
 * nothing else reads them — so they stay beside it rather than moving to lib/.
 */

import { useEffect, useMemo, useState } from "react";

import type { InterviewGenerationRunPublic } from "@/lib/api/types";

export interface GenerationProgress {
  phase: "generating" | "saving" | "completed";
  accepted: number;
  target: number;
  percent: number;
}

/**
 * Reads live generation progress the pipeline writes into
 * `config_json.progress` ({ phase, accepted, target }) each backfill round.
 * Once the run completes, falls back to the pipeline summary's
 * `questions_persisted` / `question_count_requested` so the bar lands on 100%.
 */
export function readGenerationProgress(
  run: InterviewGenerationRunPublic | undefined,
): GenerationProgress | null {
  const cfg = run?.config_json as Record<string, unknown> | undefined;
  if (!cfg) return null;

  // Completed summary takes precedence so the bar always finishes at target.
  const pipeline = cfg.pipeline as Record<string, unknown> | undefined;
  const gen = pipeline?.generation as Record<string, unknown> | undefined;
  const summary = gen ? completedProgress(gen) : null;
  if (summary) return summary;

  const live = cfg.progress as Record<string, unknown> | undefined;
  return live ? liveProgress(live) : null;
}

function toInt(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.max(0, Math.floor(v))
    : null;
}

function completedProgress(
  gen: Record<string, unknown>,
): GenerationProgress | null {
  const target = toInt(gen.question_count_requested);
  const accepted = toInt(gen.questions_persisted);
  if (target === null || accepted === null) return null;
  return {
    phase: "completed",
    accepted,
    target,
    percent:
      target > 0
        ? Math.round((Math.min(accepted, target) / target) * 100)
        : 100,
  };
}

function liveProgress(
  live: Record<string, unknown>,
): GenerationProgress | null {
  const target = toInt(live.target);
  const accepted = toInt(live.accepted);
  const phaseRaw = live.phase;
  const phase =
    phaseRaw === "saving" || phaseRaw === "completed" ? phaseRaw : "generating";
  if (target === null || accepted === null) return null;
  return {
    phase,
    accepted,
    target,
    percent:
      target > 0 ? Math.round((Math.min(accepted, target) / target) * 100) : 0,
  };
}

/** Format seconds as m:ss (matches the quiz generation progress readout). */
export function formatElapsedSeconds(seconds: number): string {
  if (seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Live-ticking elapsed timer for a generation run (mirrors the quiz
 * GenerationProgress behaviour). Ticks locally off `startedAt` while running
 * and freezes at `frozenEnd` once the run reaches a terminal state.
 */
function useGenerationElapsed(
  startedAt: string | null | undefined,
  frozenEnd: string | null | undefined,
): number {
  const [now, setNow] = useState(() => Date.now());
  const running = Boolean(startedAt) && !frozenEnd;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return useMemo(() => {
    if (!startedAt) return 0;
    const start = new Date(startedAt).getTime();
    if (Number.isNaN(start)) return 0;
    const endMs = frozenEnd ? new Date(frozenEnd).getTime() : now;
    const end = Number.isNaN(endMs) ? now : endMs;
    return Math.max(0, (end - start) / 1000);
  }, [startedAt, frozenEnd, now]);
}

export interface GenerationRunState {
  inProgress: boolean;
  failed: boolean;
  completed: boolean;
  progress: GenerationProgress | null;
  elapsed: number;
}

/** Everything the Generate tab needs to describe the run it is tracking. */
export function useGenerationRunState({
  generating,
  activeRunId,
  run,
}: {
  generating: boolean;
  activeRunId: string | null;
  run: InterviewGenerationRunPublic | undefined;
}): GenerationRunState {
  const inProgress =
    generating ||
    Boolean(
      activeRunId &&
        (!run || run.status === "pending" || run.status === "running"),
    );
  const failed = run?.status === "failed";
  const completed = run?.status === "completed";

  // Live progress the pipeline writes into config_json.progress each round
  // ({ phase, accepted, target }). Falls back to the completed summary's
  // questions_persisted / question_count_requested once the run finishes.
  const progress = readGenerationProgress(run);

  // Live elapsed timer (quiz-style): ticks while running, freezes on finish.
  const isTerminal = failed || completed || run?.status === "cancelled";
  const elapsed = useGenerationElapsed(
    run?.started_at,
    isTerminal ? (run?.finished_at ?? null) : null,
  );

  return { inProgress, failed, completed, progress, elapsed };
}
