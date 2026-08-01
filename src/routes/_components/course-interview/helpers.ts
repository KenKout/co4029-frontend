import type { InterviewPhase } from "@/lib/interview/turn-factory";
import type { InterviewActionsContext } from "./types";

/**
 * Pure helpers shared by the course-interview action modules and screens,
 * extracted from the former 2.3k-line course-interview.tsx. No React, no
 * side effects — each one is a branch chain that used to be inlined at two
 * or more call sites.
 */

type RespondResult = Awaited<
  ReturnType<InterviewActionsContext["respond"]["mutateAsync"]>
>;

/**
 * Map the backend's assistance kind onto the local transcript turn kind. This
 * exact chain was inlined in both handleAssistance and handleRespond; it is
 * character-for-character the same decision, just named.
 */
export function resolveAssistanceTurnKind(
  assistanceKind: RespondResult["assistance_kind"],
) {
  return assistanceKind === "hint"
    ? "hint"
    : assistanceKind === "clarification" || assistanceKind === "term"
      ? "clarification"
      : "followup";
}

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
