import { describe, expect, it } from "vitest";

import { clientOwnsClosing } from "../agent-voice-presentation";

/**
 * Who reads the closing goodbye.
 *
 * Found by auditing every AI utterance in a session against "who renders it"
 * vs "who speaks it". All the others line up:
 *
 *   setup ceremony lines   client narrates (agent is not in the room yet)
 *   ready_transition       client narrates (agent suppresses its room intro)
 *   questions / follow-ups agent, via speak_text
 *   assistance             client uses ai_turn_text || ai_followup_text, which
 *                          IS speak_text
 *   transitions            taking.py sets ai_turn_text = transition_text on both
 *                          the next-question and final paths
 *
 * The closing did NOT. `beginClosing()` calls `POST /finish`, renders
 * `result.closing_text` as a ceremony turn, and that turn goes through
 * `speakIfOn`. With a live room `speakIfOn` defers to the agent — but /finish
 * tells the agent nothing, so the goodbye appeared on screen unread.
 *
 * It is not unconditional though: on a `"natural"` end the turn pipeline itself
 * finished, and the agent already ran submit_session and spoke that exact
 * string. Narrating there would double it.
 */

describe("clientOwnsClosing", () => {
  it("lets the agent keep a natural ending", () => {
    // The agent reached the end through the turn pipeline and has already
    // spoken this closing (orchestration_bridge returns it as speak_text).
    expect(clientOwnsClosing("natural")).toBe(false);
  });

  it("claims the goodbye when the candidate ends the interview", () => {
    // THE bug. POST /finish writes the ceremony message and enqueues
    // evaluation; the agent is never told, so nobody read the goodbye.
    expect(clientOwnsClosing("ended_early")).toBe(true);
  });

  it("claims the goodbye when the client timer fires", () => {
    // Same shape: the timeout is client-side, the agent hears nothing about it.
    expect(clientOwnsClosing("timed_out")).toBe(true);
  });

  it("claims the goodbye for any future non-natural reason", () => {
    // Fail safe toward "someone reads it": an unread goodbye is a worse
    // outcome than a doubled one, and only "natural" has an agent utterance.
    expect(clientOwnsClosing("abandoned")).toBe(true);
    expect(clientOwnsClosing("")).toBe(true);
  });
});
