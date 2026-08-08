import { describe, expect, it } from "vitest";

import {
  agentEndedTheInterview,
  shouldPresentGoodbye,
} from "../agent-voice-presentation";

/**
 * What happens on screen when an interview ends, and why the two endings differ.
 *
 * The closing turn used to do two jobs at once: it was the goodbye, AND
 * presenting it was the trigger that moved `phase` from "closing" to "results"
 * (see `handleTurnPresented` in use-interview-sequencing). So pressing End held
 * the candidate on the interview screen for the ~10s it took to read out a
 * farewell they had just opted out of.
 *
 * Only `"natural"` involves the agent: `orchestration_bridge` runs
 * `submit_session` and returns the closing as `speak_text`, so on a live room
 * the agent is speaking it over LiveKit right then — cutting to the result there
 * would truncate it mid-sentence and drop the two-turn ending the spec asks for.
 *
 * `"ended_early"` (End button, leaving) and `"timed_out"` never reach the agent
 * at all: `POST /finish` writes the ceremony message and enqueues evaluation,
 * full stop. Nothing is speaking, so nothing is worth waiting for — and because
 * no goodbye turn gets rendered, `beginClosing` must enter the result directly
 * or the presentation trigger never fires and the screen hangs in "closing".
 *
 * The goodbye is still persisted server-side either way, so it stays in the
 * transcript and the attempt history.
 */

describe("agentEndedTheInterview", () => {
  it("is true only for a natural end", () => {
    // The turn pipeline finished on its own → the agent owns the goodbye.
    expect(agentEndedTheInterview("natural")).toBe(true);
  });

  it("is false when the candidate presses End", () => {
    // Straight to the result. This is the behaviour change.
    expect(agentEndedTheInterview("ended_early")).toBe(false);
  });

  it("is false when the client timer runs out", () => {
    // The timeout is client-side; the agent is never told.
    expect(agentEndedTheInterview("timed_out")).toBe(false);
  });

  it("is false for any future reason", () => {
    // Fails toward "show the result", which is the safe half: a skipped
    // farewell is recoverable (it is in the transcript), a screen stuck in
    // "closing" is not.
    expect(agentEndedTheInterview("abandoned")).toBe(false);
    expect(agentEndedTheInterview("")).toBe(false);
  });
});

describe("shouldPresentGoodbye", () => {
  const TEXT = "Thank you. That concludes your interview. Goodbye.";

  it("presents the goodbye on a natural end", () => {
    expect(shouldPresentGoodbye({ reason: "natural", closingText: TEXT })).toBe(
      true,
    );
  });

  it("skips it when the candidate pressed End", () => {
    // The behaviour the user asked for: End -> results, no ~10s farewell.
    expect(
      shouldPresentGoodbye({ reason: "ended_early", closingText: TEXT }),
    ).toBe(false);
  });

  it("skips it on a client timeout", () => {
    expect(
      shouldPresentGoodbye({ reason: "timed_out", closingText: TEXT }),
    ).toBe(false);
  });

  it("skips it when the server returned no closing text", () => {
    // Pre-existing branch, kept: rendering an empty turn would hang the screen,
    // since presenting that turn is the only thing that advances to results.
    expect(shouldPresentGoodbye({ reason: "natural", closingText: null })).toBe(
      false,
    );
    expect(shouldPresentGoodbye({ reason: "natural", closingText: "" })).toBe(
      false,
    );
    expect(
      shouldPresentGoodbye({ reason: "natural", closingText: undefined }),
    ).toBe(false);
  });
});
