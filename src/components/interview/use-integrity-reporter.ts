/**
 * Hook that listens for proctoring/integrity DOM events and batches POSTs
 * to the integrity-events endpoint. Never surfaces errors to the UI.
 * Detaches all listeners on unmount.
 */
import { useCallback, useEffect, useRef } from "react";
import { useReportIntegrityEvents } from "@/lib/api/hooks/interviews";
import type { IntegrityEvent } from "@/lib/api/types";
import { currentFullscreenElement } from "@/lib/hooks/useAssessmentFullscreen";

const BATCH_DELAY_MS = 2000; // debounce window before sending
const MAX_BATCH = 50; // backend cap

export interface IntegrityReporterOptions {
  /**
   * Fired synchronously the moment a warning-level signal is recorded, so the
   * UI can nudge the candidate in real time (FR-5.8 level-1 deterrent). Only
   * `tab_switch` and `fullscreen_exit` are surfaced — `focus_lost` (blur) is
   * intentionally excluded because it fires far too often (address-bar click,
   * devtools, OS notifications) to warn on without being noise. Recording of
   * every event is unaffected; this is purely an additional notification hook.
   */
  onWarning?: (eventType: IntegrityEvent["event_type"]) => void;
}

export function useIntegrityReporter(
  sessionId: string | null | undefined,
  options: IntegrityReporterOptions = {},
) {
  const report = useReportIntegrityEvents(sessionId);
  const pendingRef = useRef<IntegrityEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the latest callback in a ref so enqueue stays referentially stable
  // (the effect's listeners don't need to re-attach when the callback changes).
  const onWarningRef = useRef(options.onWarning);
  onWarningRef.current = options.onWarning;
  // Blurs awaiting their one-macrotask `document.hidden` check. A set, not a
  // single handle: two blurs in a row are two signals, and only a tab switch
  // may cancel them. See the listener comments below.
  const pendingBlursRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const flush = useCallback(() => {
    if (!sessionId || pendingRef.current.length === 0) return;
    const events = pendingRef.current.splice(0, MAX_BATCH);
    // Fire-and-forget — integrity errors must never break the interview UI
    report.mutateAsync({ events }).catch(() => {
      /* intentionally silent */
    });
  }, [sessionId, report]);

  const enqueue = useCallback(
    (event: IntegrityEvent) => {
      if (!sessionId) return;
      pendingRef.current.push(event);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, BATCH_DELAY_MS);
    },
    [sessionId, flush],
  );

  useEffect(() => {
    if (!sessionId) return;

    // One tab switch fires BOTH `blur` and `visibilitychange`, so it used to
    // land in the log twice — an info `focus_lost` next to a warning
    // `tab_switch` — and a teacher reading the timeline saw two incidents
    // where the candidate had done one thing.
    //
    // The two cases are only distinguishable by `document.hidden`, and that is
    // not settled while `blur` is dispatching (engines differ on whether blur
    // or visibilitychange comes first). So the blur decision waits one
    // macrotask and then reads it: hidden means the blur WAS the tab switch
    // and is dropped, visible means the window lost focus on its own — an
    // alt-tab to another app, a devtools click — which is the only thing
    // `focus_lost` is meant to record.
    function onVisibilityChange() {
      if (!document.hidden) return;
      // Any blur still pending belongs to this same switch. Drop them.
      for (const handle of pendingBlursRef.current) clearTimeout(handle);
      pendingBlursRef.current.clear();
      enqueue({ event_type: "tab_switch", severity: "warning" });
      onWarningRef.current?.("tab_switch");
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

    function onFullscreenChange() {
      // Only report when LEAVING fullscreen — the shared helper covers the
      // WebKit-prefixed property so a Safari exit (which never touches
      // `document.fullscreenElement`) is still recorded.
      if (currentFullscreenElement()) return;
      enqueue({ event_type: "fullscreen_exit", severity: "warning" });
      onWarningRef.current?.("fullscreen_exit");
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    // Both fullscreen events, always: Safari fires only the webkit-prefixed
    // one, so listening to the standard event alone left Safari exits
    // unrecorded while the gate UI (which listens to both) still locked.
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        onFullscreenChange,
      );
      // Flush remaining events on unmount
      for (const handle of pendingBlursRef.current) clearTimeout(handle);
      pendingBlursRef.current.clear();
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
  }, [sessionId, enqueue, flush]);
}
