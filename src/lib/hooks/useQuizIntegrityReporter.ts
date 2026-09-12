/**
 * Quiz proctoring/integrity reporter. Listens for browser activity signals
 * (tab switch, focus loss, connection loss) during a live quiz attempt and
 * batch-POSTs them to `POST /attempts/{attempt_id}/integrity-events`. Returns
 * `record` so the caller can enqueue a signal it detected itself.
 * Fire-and-forget: integrity errors must NEVER break or interrupt the
 * quiz-taking UI. Detaches all listeners on unmount and flushes any pending
 * events.
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

/**
 * Per-signal retry key. The server dedupes on (attempt, client_event_id), so
 * a batch retried after a network loss is scored ONCE. Without it a single
 * physical tab switch could score twice and push a student over the warning
 * threshold for something they did one time.
 */
function newClientEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Non-secure contexts have no randomUUID. The server tolerates an absent or
  // malformed key (it just loses retry dedupe for that one event), so a weaker
  // id here is strictly better than none.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

export function useQuizIntegrityReporter(attemptId: string | null | undefined) {
  const report = useReportQuizIntegrityEvents(attemptId);
  const pendingRef = useRef<QuizIntegrityEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Blurs awaiting their one-macrotask `document.hidden` check. A set, not a
  // single handle: two blurs in a row are two signals, and only a tab switch
  // may cancel them. See the listener comments below.
  const pendingBlursRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

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
      // Stamped here rather than at each call site so no signal can be added
      // later that silently skips dedupe.
      pendingRef.current.push({
        ...event,
        metadata: { ...event.metadata, client_event_id: newClientEventId() },
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, BATCH_DELAY_MS);
    },
    [attemptId, flush],
  );

  useEffect(() => {
    if (!attemptId) return;

    // One tab switch fires BOTH `blur` and `visibilitychange`, so it used to
    // land in the log twice — an info `focus_lost` next to a warning
    // `tab_switch` — and a teacher reading the timeline saw two incidents
    // where the student had done one thing.
    //
    // The two cases are only distinguishable by `document.hidden`, and that is
    // not settled while `blur` is dispatching (engines differ on whether blur
    // or visibilitychange comes first). So the blur decision waits one
    // macrotask and then reads it: hidden means the blur WAS the tab switch
    // and is dropped, visible means the window lost focus on its own — an
    // alt-tab to another app, a devtools click — which is the only thing
    // `focus_lost` is meant to record.
    function onVisibilityChange() {
      // Tab hidden = switched away / minimised / locked screen.
      if (!document.hidden) return;
      // Any blur still pending belongs to this same switch. Drop them.
      for (const handle of pendingBlursRef.current) clearTimeout(handle);
      pendingBlursRef.current.clear();
      enqueue({ event_type: "tab_switch", severity: "warning" });
    }

    function onBlur() {
      const handle = setTimeout(() => {
        pendingBlursRef.current.delete(handle);
        // visibilitychange already recorded this as a tab switch.
        if (document.hidden) return;
        enqueue({ event_type: "focus_lost", severity: "info" });
      }, 0);
      pendingBlursRef.current.add(handle);
    }

    // Connection loss. The store has accepted `disconnect` / `reconnect` since
    // the endpoint landed, but nothing on the quiz side ever produced them, so
    // a teacher reading the timeline could not tell a dropped connection from
    // a student who simply stopped answering. `disconnect` is only a warning:
    // a flaky network is not misconduct, and the paired `reconnect` is what
    // makes the gap in the timeline explainable rather than suspicious.
    function onOffline() {
      enqueue({ event_type: "disconnect", severity: "warning" });
    }

    function onOnline() {
      enqueue({ event_type: "reconnect", severity: "info" });
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      // Flush remaining events on unmount.
      for (const handle of pendingBlursRef.current) clearTimeout(handle);
      pendingBlursRef.current.clear();
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
  }, [attemptId, enqueue, flush]);

  // Signals that are not DOM events on this hook's own listeners — today the
  // fullscreen exits the deterrent classifies as unexpected. Routed through
  // `enqueue` so they share the same batching, cap and fire-and-forget
  // failure handling as everything else.
  return { record: enqueue };
}
