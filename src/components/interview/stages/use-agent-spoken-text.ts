/**
 * The agent's own audio-synchronised transcript for one turn.
 *
 * WHY THIS EXISTS
 *
 * The client was pacing agent-spoken text itself: hold the words until
 * `lk.agent.state` flips to "speaking", then run a typewriter at an ESTIMATED
 * speed (words ÷ 150 wpm). Both halves are guesses, and they were wrong in
 * different ways on every attempt — the state attribute only says *that* the
 * agent is speaking, never how far through it is, so the text and the voice
 * could only ever drift.
 *
 * livekit-agents already solves this properly. With `sync_transcription=True`
 * (which `realtime/agent.py` sets explicitly) the SDK attaches a
 * `TranscriptSynchronizer` that paces the published transcript against the
 * ACTUAL TTS playout — RMS-based speaking-rate detection, per segment, on the
 * agent side where the audio really is. It streams the result on the
 * `lk.transcription` topic, and `useTranscriptions()` surfaces it.
 *
 * So the correct client behaviour is not to animate at all: render exactly the
 * text the agent has spoken so far. That is what this hook returns.
 *
 * SCOPE
 *
 * Only the CURRENT agent turn matters here — the question card shows one
 * question. Segments are matched to the expected text rather than blindly
 * taking the newest, so a stale segment from the previous question cannot
 * briefly overwrite the new one during the changeover.
 */
import { useMemo } from "react";

/**
 * The shape this module needs from a transcription segment.
 *
 * Structural rather than importing `ReceivedTranscriptionSegment`, so the
 * question card does not take a hard dependency on the LiveKit types and tests
 * can hand in plain objects.
 */
export interface TranscriptionLike {
  text: string;
  final?: boolean;
}

/** Normalised form for comparing spoken text against expected text. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u201c\u201d]/gu, '"')
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Does `spoken` look like the beginning of `expected`?
 *
 * A prefix test rather than equality: the whole point is that the transcript
 * arrives progressively, so a partial segment is the normal case. Short
 * fragments are rejected because almost anything is a prefix of almost
 * anything at two or three characters, and a false match would attach the
 * previous question's tail to this card.
 */
const MIN_MATCH_CHARS = 8;

export function transcriptMatchesTurn(
  spoken: string,
  expected: string,
): boolean {
  const s = normalise(spoken);
  const e = normalise(expected);
  if (!s || !e) return false;
  if (s.length < MIN_MATCH_CHARS) return false;
  return e.startsWith(s) || s.startsWith(e);
}

export interface AgentSpokenText {
  /**
   * What the agent has spoken so far for this turn, or `null` when the
   * synchronised transcript is not usable (no agent, nothing spoken yet, or the
   * segments belong to a different turn). `null` means "fall back to the
   * existing presentation path" — never render an empty card.
   */
  text: string | null;
  /** True once the agent's segment for this turn is marked final. */
  isFinal: boolean;
}

/**
 * Progressive text for `expectedText`, paced by the agent's real audio.
 *
 * MUST only be called from inside a LiveKit `RoomContext`: `useVoiceAssistant`
 * throws without one. `QuestionCard` is also rendered outside any room (tests,
 * and any non-room surface), so the caller passes the already-resolved
 * transcript segments in rather than letting this reach for context itself.
 *
 * Returns `{text: null}` whenever the synchronised transcript cannot be
 * trusted for this turn, so callers keep their previous behaviour instead of
 * showing a blank question.
 */
export function useAgentSpokenText(
  expectedText: string,
  enabled: boolean,
  agentTranscriptions: readonly TranscriptionLike[] | undefined,
): AgentSpokenText {
  return useMemo(() => {
    if (!enabled || !expectedText) return { text: null, isFinal: false };
    if (!agentTranscriptions?.length) return { text: null, isFinal: false };

    // Walk backwards: the turn being spoken now is the most recent segment
    // that actually belongs to this question.
    for (let i = agentTranscriptions.length - 1; i >= 0; i -= 1) {
      const segment = agentTranscriptions[i];
      const spoken = segment?.text ?? "";
      if (!spoken) continue;
      if (transcriptMatchesTurn(spoken, expectedText)) {
        return {
          // Never render MORE than the approved question text: the segment is
          // the same sentence, but the card must not become an uncontrolled
          // mirror of whatever the agent emitted.
          text: spoken.length > expectedText.length ? expectedText : spoken,
          isFinal: Boolean(segment.final),
        };
      }
    }
    return { text: null, isFinal: false };
  }, [agentTranscriptions, enabled, expectedText]);
}
