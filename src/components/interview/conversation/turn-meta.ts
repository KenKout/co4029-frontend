/**
 * Derived flags for one `<ConversationMessage>` turn.
 *
 * Pulled out of the component so the turn-kind and timestamp predicates stop
 * counting against its branch budget. Pure functions — same booleans, same
 * conditions, character for character.
 */
import type { ConversationTurn } from "@/lib/interview/types";

/**
 * B-Tier-1 #11: nest sub-turns (hint / clarification / follow-up) under their
 * parent question with a left indent + accent rail so the conversation reads
 * as a hierarchy rather than a flat stream.
 */
export function isNestedTurn(turn: ConversationTurn, isAi: boolean): boolean {
  return (
    isAi &&
    (turn.kind === "hint" ||
      turn.kind === "clarification" ||
      turn.kind === "followup" ||
      turn.isFollowUp === true)
  );
}

/** The candidate's turn stamps immediately; an AI turn waits for its text. */
export function shouldShowTimestamp(
  turn: ConversationTurn,
  isAi: boolean,
  textComplete: boolean,
): boolean {
  return turn.elapsedSeconds !== undefined && (!isAi || textComplete);
}

/** The typewriter presentation kind for an AI turn. */
export function presentationKindForTurn(
  turn: ConversationTurn,
): "opening" | "closing" | "question" {
  return turn.kind === "opening" || turn.kind === "closing"
    ? turn.kind
    : "question";
}
