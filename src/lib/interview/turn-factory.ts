/**
 * Factories and types for interview conversation turns.
 *
 * Split out of `routes/course-interview.tsx` (step 1 of that file's
 * decomposition). Every function here is pure — same input, same turn object, no
 * hooks and no rendering — which is what made them the safe first move out of a
 * 2989-line route that had no tests at all.
 *
 * The `id` prefixes matter and are not cosmetic: the transcript keys React
 * children off them and the presentation tracker keys "has this AI turn finished
 * presenting" off them, so two turns colliding on an id would drop one from the
 * transcript. Prefixes are q-/f-/a- plus the ceremony kind.
 */

import type { InterviewSessionHistoryTurn } from "@/lib/api/types";
import type {
  ConversationTurn,
  InterviewQuestionView,
} from "@/lib/interview/types";
import { normalizeQuestionText } from "@/lib/interview/question-content";

export type InterviewTurnAction =
  | "answer"
  | "repeat"
  | "clarify"
  | "explain_term"
  | "hint";

export type InterviewPhase =
  | "prestart"
  | "opening"
  | "readiness"
  | "transition"
  | "questioning"
  | "closing"
  | "results";

export type FinishReason = "natural" | "ended_early" | "timed_out";

export function questionTypeLabel(
  type: string | null | undefined,
  t: (k: string) => string,
) {
  switch (type) {
    case "conceptual":
      return t("course_interview.question_types.conceptual");
    case "behavioral":
      return t("course_interview.question_types.behavioral");
    case "technical":
      return t("course_interview.question_types.technical");
    case "situational":
      return t("course_interview.question_types.situational");
    case "system_design":
      return t("course_interview.question_types.system_design");
    default:
      return null;
  }
}

export function makeAiTurn(
  question: InterviewQuestionView,
  isFollowUp = false,
  elapsedSeconds = 0,
): ConversationTurn {
  // Normalize at the data-mapping seam (spec §6): strip any guardrail / policy /
  // wrapper text that leaked into prompt_text so the Question Card only ever
  // renders the actual question. Fall back to the raw prompt only when
  // sanitization removed everything (avoids a blank card for an odd-but-valid
  // prompt the patterns over-matched).
  const { text } = normalizeQuestionText(question.prompt_text);
  return {
    id: `q-${question.id}-${isFollowUp ? "f" : "m"}`,
    role: "ai",
    text: text || question.prompt_text,
    elapsedSeconds,
    questionType: question.question_type,
    isFollowUp,
    kind: isFollowUp ? "followup" : "question",
  };
}

export function makeFollowUpTurn(
  text: string,
  key: string,
  elapsedSeconds: number,
  kind: "followup" | "clarification" | "hint" = "followup",
): ConversationTurn {
  return {
    id: `f-${key}`,
    role: "ai",
    text,
    elapsedSeconds,
    isFollowUp: true,
    kind,
  };
}

export function makeUserTurn(
  text: string,
  key: string,
  elapsedSeconds?: number,
  kind: "answer" | "clarification" | "hint" = "answer",
): ConversationTurn {
  return { id: `a-${key}`, role: "user", text, elapsedSeconds, kind };
}

export function makeCeremonyTurn(
  kind: "opening" | "briefing" | "transition" | "closing",
  text: string,
  sessionId: string,
  elapsedSeconds?: number,
): ConversationTurn {
  return {
    id: `${kind}-${sessionId}`,
    role: "ai",
    text,
    elapsedSeconds,
    kind,
  };
}

export function restoreHistoryTurn(
  turn: InterviewSessionHistoryTurn,
): ConversationTurn {
  return {
    id: turn.id,
    role: turn.role,
    text: turn.content_text,
    elapsedSeconds: turn.elapsed_seconds ?? undefined,
    questionType: turn.question_type,
    isFollowUp: turn.is_follow_up,
    kind: turn.kind,
    restored: true,
  };
}

/** A stable idempotency key for one answer submission (adaptive safeguard #1). */
export function newTurnKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `tk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
