/**
 * Hook that listens for proctoring/integrity DOM events and batches POSTs
 * to the integrity-events endpoint. Never surfaces errors to the UI.
 * Detaches all listeners on unmount.
 */
import { useCallback, useEffect, useRef } from "react";
import { useReportIntegrityEvents } from "@/lib/api/hooks/interviews";
import type { IntegrityEvent } from "@/lib/api/types";

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

    function onVisibilityChange() {
      if (document.hidden) {
        enqueue({ event_type: "tab_switch", severity: "warning" });
        onWarningRef.current?.("tab_switch");
      }
    }

    function onBlur() {
      enqueue({ event_type: "focus_lost", severity: "info" });
    }

    function onFullscreenChange() {
      // Only report when leaving fullscreen (document.fullscreenElement becomes null)
      if (!document.fullscreenElement) {
        enqueue({ event_type: "fullscreen_exit", severity: "warning" });
        onWarningRef.current?.("fullscreen_exit");
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      // Flush remaining events on unmount
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
  }, [sessionId, enqueue, flush]);
}
