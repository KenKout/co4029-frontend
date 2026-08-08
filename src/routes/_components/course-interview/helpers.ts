import type { InterviewPhase } from "@/lib/interview/turn-factory";

/**
 * Pure helpers shared by the course-interview action modules and screens,
 * extracted from the former 2.3k-line course-interview.tsx. No React, no
 * side effects — each one is a branch chain that used to be inlined at two
 * or more call sites.
 *
 * `resolveAssistanceTurnKind` lived here until typed turns moved onto `lk.chat`:
 * it mapped the REST response's `assistance_kind`, which the control contract does
 * not carry. The kind is now decided from the OUTBOUND `turn_action` instead, at
 * the one site that knows it (`handleAssistance`).
 */

/**
 * A live session runs fullscreen with the app sidebar unmounted, and mounts the
 * proctoring deterrent.
 */
export function isInterviewActive(args: {
  sessionId: string | null;
  hasFinishResult: boolean;
  phase: InterviewPhase;
}): boolean {
  const { sessionId, hasFinishResult, phase } = args;
  return Boolean(
    sessionId &&
      !hasFinishResult &&
      (phase === "opening" ||
        phase === "readiness" ||
        phase === "transition" ||
        phase === "questioning" ||
        phase === "closing"),
  );
}
