/**
 * Hook that listens for proctoring/integrity DOM events and batches POSTs
 * to the integrity-events endpoint. Never surfaces errors to the UI.
 * Detaches all listeners on unmount.
 *
 * Every raw browser signal carries a generated `client_event_id` (a UUID in
 * the event metadata). The SERVER dedupes on (session, client_event_id), so
 * a retried batch after a network loss is scored once — retries used to be
 * absorbed only by luck (the endpoint was fire-and-forget and the batch was
 * already spliced from the queue). The server's response also reports
 * `warning_issued`: True ONLY on the request whose events first crossed the
 * configured threshold — surfaced here as the single authoritative warning
 * (in addition to the unchanged local immediate nudges).
 */
import { useCallback, useEffect, useRef } from "react";
import { useReportIntegrityEvents } from "@/lib/api/hooks/interviews";
import type { IntegrityEvent } from "@/lib/api/types";
import { currentFullscreenElement } from "@/lib/hooks/useAssessmentFullscreen";

const BATCH_DELAY_MS = 2000; // debounce window before sending
const MAX_BATCH = 50; // backend cap

function newClientEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts: the server tolerates any invalid /
  // absent key (it just loses retry dedupe for that event).
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math
    .random()
    .toString(16)
    .slice(2)}`;
}

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
  /**
   * Fired when the SERVER reports the threshold crossing for this batch
   * (`warning_issued: true` in the ingest response). Exactly once per
   * session by construction — the server owns the one-shot flag. This is the
   * policy-backed warning the learner was told about in the lobby; the
   * immediate `onWarning` nudges above remain unchanged.
   */
  onThresholdWarning?: (score: number, threshold: number) => void;
}

export function useIntegrityReporter(
  sessionId: string | null | undefined,
  options: IntegrityReporterOptions = {},
): {
  /** Arm the hold: the NEXT fullscreen_exit is deferred until resolved. */
  holdNextFullscreenExit: () => void;
  /** Settle the held exit: record=true enqueues it, record=false drops it. */
  resolveHeldFullscreenExit: (record: boolean) => void;
} {
  const report = useReportIntegrityEvents(sessionId);
  const pendingRef = useRef<IntegrityEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the latest callbacks in refs so enqueue stays referentially stable
  // (the effect's listeners don't need to re-attach when they change).
  const onWarningRef = useRef(options.onWarning);
  onWarningRef.current = options.onWarning;
  const onThresholdRef = useRef(options.onThresholdWarning);
  onThresholdRef.current = options.onThresholdWarning;
  // The held fullscreen exit: an event that has happened (the browser DID
  // leave fullscreen) but whose scoring is deferred until the gate dialog is
  // answered. `holdTimerRef` bounds the hold — if the dialog is never
  // answered (tab closed mid-dialog is moot, but a stuck render must not
  // swallow the signal forever) the event records after HOLD_TIMEOUT_MS.
  const heldFsExitRef = useRef<IntegrityEvent | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HOLD_TIMEOUT_MS = 60_000;

  // Set by `holdNextFullscreenExit`; the NEXT enqueued fullscreen_exit is
  // parked in `heldFsExitRef` instead of the queue until released.
  const holdNextRef = useRef(false);

  const flush = useCallback(() => {
    if (!sessionId || pendingRef.current.length === 0) return;
    const events = pendingRef.current.splice(0, MAX_BATCH);
    // Fire-and-forget for ERRORS — integrity failures must never break the
    // interview UI — but the SUCCESS path reports the server's crossing
    // signal, which the lobby policy promised would appear exactly once.
    report
      .mutateAsync({ events })
      .then((res) => {
        if (res?.warning_issued) {
          onThresholdRef.current?.(
            res.integrity_score ?? 0,
            res.integrity_score_threshold ?? 0,
          );
        }
      })
      .catch(() => {
        /* intentionally silent */
      });
  }, [sessionId, report]);

  const resolveHeldFullscreenExit = useCallback(
    (record: boolean) => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      holdNextRef.current = false;
      const held = heldFsExitRef.current;
      heldFsExitRef.current = null;
      if (held && record) {
        // Straight into the pending queue; the batch timer scheduled here
        // sends it with the next flush.
        pendingRef.current.push(held);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, BATCH_DELAY_MS);
      }
    },
    [flush],
  );
  const holdNextFullscreenExit = useCallback(() => {
    holdNextRef.current = true;
  }, []);
  // Blurs awaiting their one-macrotask `document.hidden` check. A set, not a
  // single handle: two blurs in a row are two signals, and only a tab switch
  // may cancel them. See the listener comments below.
  const pendingBlursRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

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
      enqueue({
        event_type: "tab_switch",
        severity: "warning",
        metadata: { client_event_id: newClientEventId() },
      });
      onWarningRef.current?.("tab_switch");
    }

    function onBlur() {
      const handle = setTimeout(() => {
        pendingBlursRef.current.delete(handle);
        // visibilitychange already recorded this as a tab switch.
        if (document.hidden) return;
        enqueue({
          event_type: "focus_lost",
          severity: "info",
          metadata: { client_event_id: newClientEventId() },
        });
      }, 0);
      pendingBlursRef.current.add(handle);
    }

    function onFullscreenChange() {
      // Only report when LEAVING fullscreen — the shared helper covers the
      // WebKit-prefixed property so a Safari exit (which never touches
      // `document.fullscreenElement`) is still recorded.
      if (currentFullscreenElement()) return;
      const event: IntegrityEvent = {
        event_type: "fullscreen_exit",
        severity: "warning",
        metadata: { client_event_id: newClientEventId() },
      };
      if (holdNextRef.current) {
        // The gate wants to ask "accidental?" first: hold the event while its
        // Back / Continue dialog is up (bounded by the hold timer so a stuck
        // dialog cannot swallow the signal forever). The gate settles it via
        // `resolveHeldFullscreenExit` — Back drops the event, Continue sends
        // it to the normal queue.
        heldFsExitRef.current = event;
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          holdTimerRef.current = null;
          const held = heldFsExitRef.current;
          heldFsExitRef.current = null;
          if (held) {
            pendingRef.current.push(held);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(flush, BATCH_DELAY_MS);
          }
        }, HOLD_TIMEOUT_MS);
        // The immediate toast nudge still fires: the exit DID happen; only
        // its scoring is deferred.
        onWarningRef.current?.("fullscreen_exit");
        return;
      }
      enqueue(event);
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
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      // An exit still held at unmount records as normal (the session is
      // ending — there is no dialog left to answer).
      const stillHeld = heldFsExitRef.current;
      heldFsExitRef.current = null;
      if (stillHeld) pendingRef.current.push(stillHeld);
      flush();
    };
  }, [sessionId, enqueue, flush]);

  return { holdNextFullscreenExit, resolveHeldFullscreenExit };
}
