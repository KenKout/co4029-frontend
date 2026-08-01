import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  useLatestQuizGenerationRun,
  useQuizGenerationRun,
} from "@/lib/api/hooks/quizzes";
import type { GenerationRunRead } from "@/lib/api/types";

/**
 * Active-run attachment + polling for the quiz generation panel.
 *
 * Reattach to the latest server-side run on mount instead of
 * persisting the run id in the browser. Survives cross-device
 * sessions, tab closes, and lets two teachers viewing the same
 * quiz both see the in-flight run.
 *
 * Only auto-reattach a NON-TERMINAL run (pending/running). A completed
 * or failed run is shown as a dismissible "last result" via
 * `displayRun` below — reattaching it to `activeRunId` was the bug
 * where clicking Generate just surfaced an already-finished run's data
 * instead of starting fresh.
 */
export function useGenerationRunTracking(quizId: string) {
  const { data: latestRun } = useLatestQuizGenerationRun(quizId);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  useEffect(() => {
    if (activeRunId) return;
    if (
      latestRun?.id &&
      (latestRun.status === "pending" || latestRun.status === "running")
    ) {
      setActiveRunId(latestRun.id);
    }
  }, [latestRun?.id, latestRun?.status, activeRunId]);
  const { data: activeRun } = useQuizGenerationRun(quizId, activeRunId);

  // The run to visualise: the live one if attached, else the most recent
  // finished run so the teacher still sees "last generation" context
  // (stepper collapsed to done + logs) without it blocking a new run.
  const displayRun = activeRun ?? (activeRunId ? undefined : latestRun) ?? null;

  return { activeRunId, setActiveRunId, activeRun, displayRun };
}

/**
 * Surface terminal-state toasts exactly once per run id (the
 * polling hook re-runs on every refetch — without the ref guard
 * we'd fire the toast on every successful 3s tick).
 */
export function useRunTerminalToasts(
  activeRun: GenerationRunRead | undefined,
  activeRunId: string | null,
) {
  const toastedRunIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeRun || !activeRunId) return;
    const status = activeRun.status;
    if (
      status !== "completed" &&
      status !== "failed" &&
      status !== "cancelled"
    ) {
      return;
    }
    if (toastedRunIdRef.current === activeRunId) return;
    toastedRunIdRef.current = activeRunId;

    if (status === "completed") {
      toast.success("Quiz generation completed");
    } else if (status === "failed") {
      toast.error(activeRun.error_message ?? "Quiz generation failed", {
        duration: 8000,
      });
    } else {
      toast.info("Quiz generation cancelled");
    }
  }, [activeRun, activeRunId]);
}
