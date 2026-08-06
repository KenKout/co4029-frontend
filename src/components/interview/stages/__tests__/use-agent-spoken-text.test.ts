import { describe, expect, it } from "vitest";

import { transcriptMatchesTurn } from "../use-agent-spoken-text";

/**
 * Matching an agent transcript segment to the question card's turn.
 *
 * Context: the client used to pace agent-spoken text itself — hold for
 * `lk.agent.state`, then type at an assumed 150 wpm. Both are estimates, and
 * they drifted from the real audio every time. livekit-agents already publishes
 * a transcript paced against the ACTUAL TTS playout when
 * `sync_transcription=True` (set in `realtime/agent.py`), so the card now
 * mirrors that stream instead.
 *
 * Mirroring only works if segments are attributed to the right turn. These
 * tests pin that: a partial segment must match (it arrives progressively), and
 * the PREVIOUS question's text must not, or the card would flash the wrong
 * question during a changeover.
 */

const Q1 =
  "What is the primary difference between operational processing and " +
  "information processing in an organizational context?";
const Q2 = "How would you design a star schema for a retail data warehouse?";

describe("transcriptMatchesTurn", () => {
  it("matches a partial segment against the full question", () => {
    // The normal case: the transcript arrives a few words at a time.
    expect(transcriptMatchesTurn("What is the primary diff", Q1)).toBe(true);
  });

  it("matches the completed segment", () => {
    expect(transcriptMatchesTurn(Q1, Q1)).toBe(true);
  });

  it("does NOT match a different question", () => {
    // The changeover hazard: Q2's segment must never render on Q1's card.
    expect(transcriptMatchesTurn(Q2, Q1)).toBe(false);
    expect(transcriptMatchesTurn(Q1, Q2)).toBe(false);
  });

  it("ignores punctuation and smart-quote differences", () => {
    // The agent's TTS pipeline strips/normalises markup, so the transcript is
    // the same sentence with different characters.
    expect(
      transcriptMatchesTurn(
        "What is the primary difference between operational processing",
        Q1,
      ),
    ).toBe(true);
    expect(transcriptMatchesTurn("Let\u2019s begin \u2014 what is", "Let's begin — what is")).toBe(
      true,
    );
  });

  it("is case insensitive", () => {
    expect(transcriptMatchesTurn("WHAT IS THE PRIMARY", Q1)).toBe(true);
  });

  it("rejects fragments too short to be distinctive", () => {
    // "What" is a prefix of almost every question in the bank; matching on it
    // would attach the wrong segment.
    expect(transcriptMatchesTurn("What", Q1)).toBe(false);
    expect(transcriptMatchesTurn("Wh", Q1)).toBe(false);
  });

  it("rejects empty input on either side", () => {
    expect(transcriptMatchesTurn("", Q1)).toBe(false);
    expect(transcriptMatchesTurn(Q1, "")).toBe(false);
    expect(transcriptMatchesTurn("   ", Q1)).toBe(false);
  });

  it("matches when the transcript runs slightly longer than the turn", () => {
    // The agent can append a trailing beat; the caller clamps the render to the
    // approved text, but attribution must still succeed.
    expect(transcriptMatchesTurn(`${Q1} Take your time.`, Q1)).toBe(true);
  });

  it("does not match an unrelated interjection", () => {
    expect(transcriptMatchesTurn("Thank you for that answer.", Q1)).toBe(false);
  });
});
