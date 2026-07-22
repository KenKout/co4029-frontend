/**
 * Quiz proctoring/integrity reporter. Listens for browser activity signals
 * (tab switch, focus loss) during a live quiz attempt and batch-POSTs them to
 * `POST /attempts/{attempt_id}/integrity-events`. Fire-and-forget: integrity
 * errors must NEVER break or interrupt the quiz-taking UI. Detaches all
 * listeners on unmount and flushes any pending events.
 *
 * Mirrors the interview `useIntegrityReporter` pattern. Events are recorded
 * server-side only while the attempt is in_progress and are for post-attempt /
 * teacher review — never surfaced to the student.
 */
import { useCallback, useEffect, useRef } from "react";
import {
  type QuizIntegrityEvent,
  useReportQuizIntegrityEvents,
} from "@/lib/api/hooks/quizzes";

const BATCH_DELAY_MS = 2000; // debounce window before sending
const MAX_BATCH = 50; // backend cap

export function useQuizIntegrityReporter(
  attemptId: string | null | undefined,
) {
  const report = useReportQuizIntegrityEvents(attemptId);
  const pendingRef = useRef<QuizIntegrityEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (!attemptId || pendingRef.current.length === 0) return;
    const events = pendingRef.current.splice(0, MAX_BATCH);
    // Fire-and-forget — integrity errors must never break the quiz UI.
    report.mutateAsync({ events }).catch(() => {
      /* intentionally silent */
    });
  }, [attemptId, report]);

  const enqueue = useCallback(
    (event: QuizIntegrityEvent) => {
      if (!attemptId) return;
      pendingRef.current.push(event);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, BATCH_DELAY_MS);
    },
    [attemptId, flush],
  );

  useEffect(() => {
    if (!attemptId) return;

    function onVisibilityChange() {
      // Tab hidden = switched away / minimised / locked screen.
      if (document.hidden) {
        enqueue({ event_type: "tab_switch", severity: "warning" });
      }
    }

    function onBlur() {
      // Window lost focus (e.g. alt-tab to another app) without hiding the tab.
      enqueue({ event_type: "focus_lost", severity: "info" });
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      // Flush remaining events on unmount.
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
  }, [attemptId, enqueue, flush]);
}
