import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  ScrollText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { QuizGenerationRunRead } from "@/lib/api/types";

/**
 * Live progress view for an in-flight (or just-finished) AI quiz
 * generation run.
 *
 * The backend pipeline writes a checkpoint as each stage starts
 * (migration 0035 → `run.progress` = { current_stage, stage_index,
 * total_stages, updated_at, events[] }). This component turns that into:
 *
 *  - a horizontal stage stepper (done / active / pending),
 *  - a stepped percentage derived from stage_index / total_stages,
 *  - an elapsed timer that ticks locally off `started_at`, and
 *  - a SEPARATE collapsible logs panel listing each stage event with a
 *    timestamp and detail (e.g. "42 chunks retrieved").
 *
 * Progress granularity is stage-level by design: each stage is one long
 * LLM call in the worker, so a truthful bar steps 6 times (or 4 for
 * regenerate) rather than animating a fake 0-100%. When the run is still
 * `pending` (worker hasn't picked it up) or no checkpoint has landed yet,
 * we show an indeterminate "starting" state instead of a false 0%.
 */

/** Human-readable label keys per machine stage key (see _progress.py). */
const STAGE_LABEL_KEYS: Record<string, string> = {
  retrieval: "teacher_quiz_results.generation.stages.retrieval",
  outline: "teacher_quiz_results.generation.stages.outline",
  ideation: "teacher_quiz_results.generation.stages.ideation",
  generation: "teacher_quiz_results.generation.stages.generation",
  validation: "teacher_quiz_results.generation.stages.validation",
  dedup: "teacher_quiz_results.generation.stages.dedup",
  persistence: "teacher_quiz_results.generation.stages.persistence",
};

function formatElapsed(seconds: number): string {
  if (seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatClock(iso: string): string {
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

/** Live-ticking elapsed timer. Freezes at the terminal timestamp when done. */
function useElapsedSeconds(
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
    const end = frozenEnd ? new Date(frozenEnd).getTime() : now;
    return Math.max(0, (end - start) / 1000);
  }, [startedAt, frozenEnd, now]);
}

function StageStep({
  label,
  state,
  index,
}: {
  label: string;
  state: "done" | "active" | "pending";
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

export function GenerationProgress({ run }: { run: QuizGenerationRunRead }) {
  const { t } = useTranslation();
  const [logsOpen, setLogsOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const status = run.status;
  const isTerminal =
    status === "completed" || status === "failed" || status === "cancelled";
  const progress = run.progress ?? null;
  const events = progress?.events ?? [];

  const elapsed = useElapsedSeconds(
    run.started_at,
    isTerminal ? run.completed_at ?? progress?.updated_at ?? null : null,
  );

  // Auto-scroll the logs panel to the newest event when open.
  useEffect(() => {
    if (logsOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [logsOpen, events.length]);

  const totalStages = progress?.total_stages ?? 0;
  const stageIndex = progress?.stage_index ?? 0;
  const currentStage = progress?.current_stage ?? null;

  // Stepped percentage. On completion force 100%; otherwise derive from the
  // stage index. Never show a fake 0% — a running-but-uncheckpointed run
  // reads as indeterminate.
  const percent = useMemo(() => {
    if (status === "completed") return 100;
    if (!totalStages || !stageIndex) return null;
    // A stage that's "active" is partway done — count it as half-complete
    // so the bar advances as stages start rather than only when they finish.
    return Math.round(((stageIndex - 0.5) / totalStages) * 100);
  }, [status, totalStages, stageIndex]);

  // Build the ordered stage list from the events we've seen plus the known
  // total, so the stepper renders even before every stage has checkpointed.
  const stageKeys = useMemo(() => {
    const seen: string[] = [];
    for (const ev of events) {
      if (!seen.includes(ev.stage)) seen.push(ev.stage);
    }
    if (currentStage && !seen.includes(currentStage)) seen.push(currentStage);
    return seen;
  }, [events, currentStage]);

  const headline =
    status === "completed"
      ? t("teacher_quiz_results.generation.done")
      : status === "failed"
        ? t("teacher_quiz_results.generation.failed")
        : status === "cancelled"
          ? t("teacher_quiz_results.generation.cancelled")
          : currentStage
            ? t("teacher_quiz_results.generation.running_stage", {
                stage: t(
                  STAGE_LABEL_KEYS[currentStage] ?? "",
                  currentStage,
                ),
              })
            : t("teacher_quiz_results.generation.starting");

  return (
    <div className="rounded-xl border border-m3-outline-variant bg-card p-4 space-y-4">
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

      {/* Stage stepper */}
      {stageKeys.length > 0 && (
        <div className="flex items-start gap-1">
          {stageKeys.map((key, i) => {
            const position = i + 1;
            let state: "done" | "active" | "pending";
            if (status === "completed") {
              state = "done";
            } else if (position < stageIndex) {
              state = "done";
            } else if (position === stageIndex && !isTerminal) {
              state = "active";
            } else {
              state = "pending";
            }
            return (
              <StageStep
                key={key}
                index={i}
                label={t(STAGE_LABEL_KEYS[key] ?? "", key)}
                state={state}
              />
            );
          })}
        </div>
      )}

      {/* Failure detail */}
      {status === "failed" && run.error_message && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-xs text-red-700">
          {run.error_message}
        </div>
      )}

      {/* Separate collapsible logs panel */}
      {events.length > 0 && (
        <div className="rounded-lg border border-m3-outline-variant/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setLogsOpen((v) => !v)}
            aria-expanded={logsOpen}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-m3-on-surface-variant hover:bg-m3-surface-container-low transition-colors cursor-pointer"
          >
            {logsOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <ScrollText className="h-3.5 w-3.5" />
            {t("teacher_quiz_results.generation.logs_toggle", {
              count: events.length,
            })}
          </button>
          {logsOpen && (
            <div className="max-h-48 overflow-y-auto bg-m3-surface-container-lowest px-3 py-2 space-y-1 font-mono text-[11px]">
              {events.map((ev, i) => (
                <div key={`${ev.stage}-${ev.at}-${i}`} className="flex gap-2">
                  <span className="shrink-0 text-m3-on-surface-variant/70 tabular-nums">
                    {formatClock(ev.at)}
                  </span>
                  <span className="shrink-0 font-semibold text-m3-primary">
                    {t(STAGE_LABEL_KEYS[ev.stage] ?? "", ev.stage)}
                  </span>
                  {ev.detail && (
                    <span className="text-m3-on-surface-variant truncate">
                      {ev.detail}
                    </span>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
