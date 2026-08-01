import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { QuizGenerationRunRead } from "@/lib/api/types";

import { GenerationProgressHeader } from "./GenerationProgressHeader";
import { GenerationProgressLogs } from "./GenerationProgressLogs";
import { GenerationProgressStepper } from "./GenerationProgressStepper";
import {
  collectStageKeys,
  computePercent,
  readRunProgress,
  resolveHeadline,
} from "./generation-progress-helpers";
import { useElapsedSeconds } from "./use-elapsed-seconds";

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
 *
 * The stepper, header and logs panel live in sibling files; the projection and
 * formatting logic lives in `generation-progress-helpers.ts`. Every hook stays
 * here so the call order matches the pre-split component exactly.
 */
export function GenerationProgress({ run }: { run: QuizGenerationRunRead }) {
  const { t } = useTranslation();
  const [logsOpen, setLogsOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const view = readRunProgress(run);
  const { status, isTerminal, events, totalStages, stageIndex, currentStage } =
    view;

  const elapsed = useElapsedSeconds(run.started_at, view.frozenEnd);

  // Auto-scroll the logs panel to the newest event when open.
  useEffect(() => {
    if (logsOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [logsOpen, events.length]);

  const percent = useMemo(
    () => computePercent(status, totalStages, stageIndex),
    [status, totalStages, stageIndex],
  );

  const stageKeys = useMemo(
    () => collectStageKeys(events, currentStage),
    [events, currentStage],
  );

  const headline = resolveHeadline(view, t);

  return (
    <div className="rounded-xl border border-m3-outline-variant bg-card p-4 space-y-4">
      <GenerationProgressHeader
        status={status}
        headline={headline}
        percent={percent}
        elapsed={elapsed}
        t={t}
      />

      <GenerationProgressStepper
        stageKeys={stageKeys}
        view={{ status, stageIndex, isTerminal }}
        t={t}
      />

      {/* Failure detail */}
      {status === "failed" && run.error_message && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-xs text-red-700">
          {run.error_message}
        </div>
      )}

      <GenerationProgressLogs
        events={events}
        logsOpen={logsOpen}
        onToggleLogs={() => setLogsOpen((v) => !v)}
        logsEndRef={logsEndRef}
        t={t}
      />
    </div>
  );
}
