/**
 * Report which transport a typed turn actually took.
 *
 * Exists because the REST fallback in `decideTextTransport` is silent by
 * design: no gate fails a turn, they all degrade it. So a candidate can hold an
 * entire interview over REST with `VITE_INTERVIEW_LK_TEXT=1` set and nothing
 * says the LiveKit path was never used. That makes "the flag is on" untestable
 * by observation — which is how it came to be enabled on one machine, absent
 * from the template, and unnoticed.
 *
 * Reports on CHANGE only. The decision is stable for long stretches (usually a
 * whole session), so a line per turn would bury the transitions that matter.
 */

import type { TextTransportDecision } from "@/lib/interview/text-transport";

/**
 * Last reported `session:transport:reason`.
 *
 * The session id is part of the key rather than a separate guard, so resuming
 * or starting a second interview in one page load re-reports instead of
 * inheriting the previous session's line. One string rather than a per-session
 * map: only the most recent session can be the live one.
 */
let lastReported: string | null = null;

/** Test seam — this module keeps state across calls by design. */
export function resetTransportReporting(): void {
  lastReported = null;
}

export function reportTextTransport(
  sessionId: string | null,
  decision: TextTransportDecision,
  log: (message: string) => void = console.info,
): void {
  const session = sessionId ?? "none";
  const key = `${session}:${decision.transport}:${decision.reason}`;
  if (key === lastReported) return;
  lastReported = key;
  log(
    `[interview:transport] session=${session} ` +
      `transport=${decision.transport} reason=${decision.reason}`,
  );
}
