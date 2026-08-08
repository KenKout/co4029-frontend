import { describe, expect, it } from "vitest";

/**
 * Who owns the voice during setup vs during the interview.
 *
 * REGRESSION this pins (reported 2026-08-06): the greeting
 * «Hi, Xà. It's nice to meet you...» played only the first two words and stopped.
 *
 * Cause: warming the room (opened during onboarding so the ~10-13s worker
 * startup overlaps setup) made a CONNECTED room possible while the client was
 * still the only voice. `agentOwnsTheVoice` was `roomWanted || connecting ||
 * chat.connected`, so the warm connection read as an agent handover, and
 * `use-interview-speech.ts` cancels in-flight narration on that edge — killing
 * a 17.8s greeting mid-sentence.
 *
 * Evidence, session bd61e0f3 (`onboarding_stage = identity_check`):
 *   16:51:46.397  warm realtime-token   17ms
 *   16:51:46.409  /narration           237ms  → 106704 bytes = 17.78s of audio
 *   then the room connected and the audio was cancelled.
 *
 * The cancel is correct at the REAL handover; it must simply not fire for a room
 * that has nobody in it. Hence the extra `onboardingStage === "completed"`
 * condition — the same moment the agent is dispatched.
 */

// The REAL predicate, imported — not a copy. A re-implementation here passed
// even after the fix was reverted, which is worse than having no test at all.
import { resolveAgentOwnsTheVoice as agentOwnsTheVoice } from "../agent-voice-presentation";

const SETUP_STAGES = [
  "identity_check",
  "audio_check",
  "language_check",
  "preparation",
  "readiness",
] as const;

describe("client keeps the voice through setup", () => {
  it.each(SETUP_STAGES)(
    "does not hand over during %s even with a warm room connected",
    (stage) => {
      // THE regression. A warmed room is connected with no agent in it, so the
      // client must keep narrating the ceremony lines.
      expect(
        agentOwnsTheVoice({
          onboardingStage: stage,
          roomWanted: true,
          connecting: false,
          chatConnected: true,
          pendingFirstQuestion: false,
        }),
      ).toBe(false);
    },
  );

  it("does not hand over while the warm room is still connecting", () => {
    expect(
      agentOwnsTheVoice({
        onboardingStage: "identity_check",
        roomWanted: true,
        connecting: true,
        chatConnected: false,
        pendingFirstQuestion: false,
      }),
    ).toBe(false);
  });

  it("does not hand over before any session exists", () => {
    expect(
      agentOwnsTheVoice({
        onboardingStage: null,
        roomWanted: false,
        connecting: false,
        chatConnected: false,
        pendingFirstQuestion: false,
      }),
    ).toBe(false);
  });
});

describe("the post-onboarding transition beat", () => {
  /**
   * The one beat where two voices can collide.
   *
   * The transition line ("…Here is your first question.") is client-only text the
   * agent never receives, which argues for letting the client narrate it. But the
   * native agent speaks question one the instant it joins, and warm-room makes
   * that immediate — so narrating here means the browser voice reads the ceremony
   * line OVER the agent's voice asking the question. Heard as an interviewer
   * talking "super fast".
   *
   * The agent therefore owns the voice through this beat too. The line is typed,
   * not spoken.
   */
  it("hands over even while the first question is pending, so only one voice speaks", () => {
    expect(
      agentOwnsTheVoice({
        onboardingStage: "completed",
        roomWanted: true,
        connecting: false,
        chatConnected: true,
        pendingFirstQuestion: true,
      }),
    ).toBe(true);
  });

  it("hands over once the transition has been presented", () => {
    // handleTurnPresented clears pendingFirstQuestion; from here the agent owns
    // question one, which it genuinely has.
    expect(
      agentOwnsTheVoice({
        onboardingStage: "completed",
        roomWanted: true,
        connecting: false,
        chatConnected: true,
        pendingFirstQuestion: false,
      }),
    ).toBe(true);
  });

  it("still refuses to hand over mid-setup even with no pending question", () => {
    // The two guards are independent; neither should mask the other.
    expect(
      agentOwnsTheVoice({
        onboardingStage: "readiness",
        roomWanted: true,
        connecting: false,
        chatConnected: true,
        pendingFirstQuestion: false,
      }),
    ).toBe(false);
  });
});

describe("agent takes the voice once setup is done", () => {
  it("hands over as soon as a room is wanted post-onboarding", () => {
    // This is the case the cancel exists for: the agent's opening must not
    // collide with the tail of the last setup line.
    expect(
      agentOwnsTheVoice({
        onboardingStage: "completed",
        roomWanted: true,
        connecting: false,
        chatConnected: false,
        pendingFirstQuestion: false,
      }),
    ).toBe(true);
  });

  it("hands over during the join window, before chat reports connected", () => {
    // `roomWanted` covers the ~10-13s join: the agent is coming, so the client
    // must already be silent.
    expect(
      agentOwnsTheVoice({
        onboardingStage: "completed",
        roomWanted: true,
        connecting: true,
        chatConnected: false,
        pendingFirstQuestion: false,
      }),
    ).toBe(true);
  });

  it("hands over when only the chat transport reports connected", () => {
    expect(
      agentOwnsTheVoice({
        onboardingStage: "completed",
        roomWanted: false,
        connecting: false,
        chatConnected: true,
        pendingFirstQuestion: false,
      }),
    ).toBe(true);
  });

  it("keeps the client voice for a text-only session after onboarding", () => {
    // No room at all → nothing to hand over to. The transition line and every
    // question stay client-narrated.
    expect(
      agentOwnsTheVoice({
        onboardingStage: "completed",
        roomWanted: false,
        connecting: false,
        chatConnected: false,
        pendingFirstQuestion: false,
      }),
    ).toBe(false);
  });
});
