/**
 * Which turns the transcript may show while an AI turn is still being presented.
 *
 * The main stage holds an incoming AI turn at a "preparing" indicator until its
 * narration actually starts, then types it out in step with the audio (see
 * `AiTypingMessage`). The transcript surfaces render with `isLatest={false}`,
 * which makes `AiTypingMessage` skip animation and paint the full text
 * immediately — so a question the interviewer had not finished reading was
 * already fully readable in the transcript panel.
 *
 * Rule: hide the LAST AI turn until it has been presented. Only the last one,
 * because:
 *
 * - Restored history (a resumed session) never passes through the presentation
 *   lifecycle, so it is not in `presentedAiTurnIds`. Filtering every unpresented
 *   AI turn would blank the whole transcript on resume.
 * - Only the newest AI turn is ever mid-presentation; everything before it has
 *   necessarily finished (or was restored).
 *
 * Pure so the sequencing rule is unit-testable and identical on every surface
 * (docked panel, overlay drawer, and the inline stage list).
 */
import type { ConversationTurn } from "@/components/interview/interview-workspace";

/**
 * Drop the newest AI turn when it has not finished presenting.
 *
 * @param transcript Turns in chronological order.
 * @param presentedAiTurnIds Ids of AI turns whose presentation completed.
 * @returns The same array reference when nothing is hidden, so callers keep
 *   referential stability and do not re-render needlessly.
 */
export function visibleTranscriptTurns(
  transcript: ConversationTurn[],
  presentedAiTurnIds: ReadonlySet<string>,
): ConversationTurn[] {
  const lastAiIndex = findLastAiIndex(transcript);
  if (lastAiIndex === -1) return transcript;
  const lastAi = transcript[lastAiIndex];
  if (presentedAiTurnIds.has(lastAi.id)) return transcript;
  return transcript.filter((_, index) => index !== lastAiIndex);
}

/**
 * Count shown in the transcript header / trigger badge.
 *
 * Derived from the same rule as {@link visibleTranscriptTurns} so the number
 * cannot disagree with the list — a count of 5 above 4 rendered turns reads as
 * a bug, and a count that ticks up a beat before its turn appears re-introduces
 * exactly the "it showed early" tell we are removing.
 */
export function visibleTranscriptCount(
  transcript: ConversationTurn[],
  presentedAiTurnIds: ReadonlySet<string>,
): number {
  return visibleTranscriptTurns(transcript, presentedAiTurnIds).length;
}

function findLastAiIndex(transcript: ConversationTurn[]): number {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    if (transcript[index].role === "ai") return index;
  }
  return -1;
}
