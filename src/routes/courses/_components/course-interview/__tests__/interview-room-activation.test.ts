import { describe, expect, it } from "vitest";

/**
 * When the hybrid LiveKit room is allowed to go live.
 *
 * The onboarding transition line ("Great — the introduction is complete.
 * Let's begin. Here is your first question.") is produced by the REST
 * onboarding response and exists ONLY client-side: the agent never receives
 * that text, so the client narration is the only thing that can voice it.
 *
 * The narration gate mutes the client whenever the room is live (so the agent
 * is never doubled). Bringing the room up the moment onboarding completed
 * therefore silenced the transition entirely, and the candidate heard nothing
 * until the agent joined and read its intro + question one back to back.
 *
 * So the room is held back for exactly one beat — while `pendingFirstQuestion`
 * is set — and the token is prefetched during that beat so the hold costs no
 * dead air. This pins both halves of that rule as a pure predicate, mirroring
 * the expression in `routes/course-interview.tsx`.
 */

function roomActive(args: {
  sessionId: string | null;
  voiceActive: boolean;
  inputMode: "voice" | "text" | "hybrid";
  onboardingStage: string;
  pendingFirstQuestion: unknown;
}): boolean {
  return (
    Boolean(args.sessionId) &&
    (args.voiceActive ||
      (args.inputMode === "hybrid" &&
        args.onboardingStage === "completed" &&
        !args.pendingFirstQuestion))
  );
}

function prefetch(args: {
  sessionId: string | null;
  inputMode: "voice" | "text" | "hybrid";
  onboardingStage: string;
}): boolean {
  return (
    Boolean(args.sessionId) &&
    args.inputMode === "hybrid" &&
    args.onboardingStage === "completed"
  );
}

const BASE = {
  sessionId: "s-1",
  voiceActive: false,
  inputMode: "hybrid" as const,
  onboardingStage: "completed",
  pendingFirstQuestion: null as unknown,
};

describe("hybrid room activation vs the transition beat", () => {
  it("holds the room back while the transition line is still presenting", () => {
    // pendingFirstQuestion set === the transition turn is on screen being
    // narrated. The room must stay down so the client can voice it.
    expect(roomActive({ ...BASE, pendingFirstQuestion: { id: "q1" } })).toBe(
      false,
    );
  });

  it("brings the room up the moment the transition has been presented", () => {
    expect(roomActive({ ...BASE, pendingFirstQuestion: null })).toBe(true);
  });

  it("prefetches the token DURING the beat so the hold costs no dead air", () => {
    // Same instant as the first test: room down, token already being minted.
    const during = { ...BASE, pendingFirstQuestion: { id: "q1" } };
    expect(roomActive(during)).toBe(false);
    expect(prefetch(during)).toBe(true);
  });

  it("never holds back a voice session (it has no client transition beat)", () => {
    expect(
      roomActive({
        ...BASE,
        voiceActive: true,
        inputMode: "voice",
        pendingFirstQuestion: { id: "q1" },
      }),
    ).toBe(true);
  });

  it("stays down through onboarding, and does not prefetch either", () => {
    const onboarding = { ...BASE, onboardingStage: "readiness" };
    expect(roomActive(onboarding)).toBe(false);
    expect(prefetch(onboarding)).toBe(false);
  });

  it("stays down for a pure-text session", () => {
    // A `supported_modes: "text"` config never joins a room, so it has no way to
    // send a typed turn at all now that REST /respond is gone. Pinned here as the
    // known gap rather than silently reintroducing a second transport for it.
    const text = { ...BASE, inputMode: "text" as const };
    expect(roomActive(text)).toBe(false);
    expect(prefetch(text)).toBe(false);
  });
});
