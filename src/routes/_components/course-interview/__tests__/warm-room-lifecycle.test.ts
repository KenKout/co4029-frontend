import { describe, expect, it } from "vitest";

/**
 * When the room is warmed, and when the interviewer is sent in.
 *
 * The room used to open only after onboarding, because minting a token WAS
 * dispatching the agent — the token carried `RoomConfiguration.agents`. So the
 * ~10-13s LiveKit worker startup (measured 10.0 / 13.2 / 13.3s from mint to
 * `voice.room_join`) landed in front of question one as dead air.
 *
 * Warming splits the two: join during setup with a token that starts nothing,
 * then dispatch. These are pure predicates mirroring the wiring in
 * `course-interview.tsx` and `interview-room-provider.tsx`, pinned here because
 * the failure modes are all "one flag true at the wrong moment" and none of
 * them are visible from the types.
 */

type Mode = "voice" | "text" | "hybrid";

/** `warm` prop, as computed by the page shell. */
function shouldWarm(args: {
  sessionId: string | null;
  inputMode: Mode;
  onboardingStage: string | null;
}): boolean {
  return Boolean(
    args.sessionId &&
      (args.inputMode === "hybrid" || args.inputMode === "voice") &&
      args.onboardingStage !== "completed",
  );
}

/** `agentWanted` prop, as computed by the page shell. */
function shouldDispatch(args: {
  sessionId: string | null;
  onboardingStage: string | null;
}): boolean {
  return Boolean(args.sessionId && args.onboardingStage === "completed");
}

/** Whether the provider mints a WARM (non-dispatching) token. */
function mintsWarmToken(args: {
  warm: boolean;
  active: boolean;
  prefetch: boolean;
}): boolean {
  return args.warm && !args.active && !args.prefetch;
}

/** Whether the provider opens a connection. */
function connects(args: {
  active: boolean;
  warm: boolean;
  hasToken: boolean;
}): boolean {
  return (args.active || args.warm) && args.hasToken;
}

const SETUP = { sessionId: "s-1", onboardingStage: "identity_check" };
const DONE = { sessionId: "s-1", onboardingStage: "completed" };

describe("warming the room during setup", () => {
  it("warms a hybrid session while onboarding is still running", () => {
    expect(shouldWarm({ ...SETUP, inputMode: "hybrid" })).toBe(true);
  });

  it("warms a voice session too", () => {
    expect(shouldWarm({ ...SETUP, inputMode: "voice" })).toBe(true);
  });

  it("never warms a text-only session", () => {
    // No room is ever wanted, so opening one would be pure waste — and would
    // put a candidate who chose text into a LiveKit room they never asked for.
    expect(shouldWarm({ ...SETUP, inputMode: "text" })).toBe(false);
  });

  it("stops warming once onboarding is complete", () => {
    // From here the normal dispatching token is both allowed and simpler.
    expect(shouldWarm({ ...DONE, inputMode: "hybrid" })).toBe(false);
  });

  it("does not warm before a session exists", () => {
    expect(
      shouldWarm({
        sessionId: null,
        inputMode: "hybrid",
        onboardingStage: "identity_check",
      }),
    ).toBe(false);
  });
});

describe("which token gets minted", () => {
  it("mints warm while only warming is asked for", () => {
    expect(mintsWarmToken({ warm: true, active: false, prefetch: false })).toBe(
      true,
    );
  });

  it("mints a DISPATCHING token once the room is genuinely active", () => {
    // Belt and braces: if `active` is somehow true while `warm` still is, the
    // interview is under way and must not be waiting on a second call.
    expect(mintsWarmToken({ warm: true, active: true, prefetch: false })).toBe(
      false,
    );
  });

  it("mints a DISPATCHING token when the transition prefetch runs", () => {
    // The prefetch beat only happens post-onboarding, where dispatch is legal.
    expect(mintsWarmToken({ warm: true, active: false, prefetch: true })).toBe(
      false,
    );
  });

  it("mints a dispatching token in the original flow", () => {
    expect(mintsWarmToken({ warm: false, active: true, prefetch: false })).toBe(
      false,
    );
  });
});

describe("connecting", () => {
  it("connects while warming — otherwise warming buys nothing", () => {
    // The whole optimisation is that the CONNECTION overlaps setup. Minting a
    // token and sitting on it would save only the HTTP round trip.
    expect(connects({ active: false, warm: true, hasToken: true })).toBe(true);
  });

  it("still connects for a normal active session", () => {
    expect(connects({ active: true, warm: false, hasToken: true })).toBe(true);
  });

  it("never connects without a token", () => {
    expect(connects({ active: false, warm: true, hasToken: false })).toBe(false);
    expect(connects({ active: true, warm: false, hasToken: false })).toBe(false);
  });

  it("does not connect a text-only session", () => {
    expect(connects({ active: false, warm: false, hasToken: true })).toBe(false);
  });
});

describe("dispatching the interviewer", () => {
  it("dispatches once onboarding completes", () => {
    expect(shouldDispatch(DONE)).toBe(true);
  });

  it("does NOT dispatch during setup", () => {
    // This is the safety property the whole split rests on: an agent that
    // joined early would start talking over the setup screen, and would carry
    // a language chosen before the language check ran.
    expect(shouldDispatch(SETUP)).toBe(false);
  });

  it("does not dispatch without a session", () => {
    expect(
      shouldDispatch({ sessionId: null, onboardingStage: "completed" }),
    ).toBe(false);
  });

  it("warming and dispatching are never both true", () => {
    // They are driven by opposite sides of the same condition, so a state that
    // satisfied both would mean the room is being warmed after the interview
    // started.
    for (const stage of ["identity_check", "audio_check", "briefing", "completed"]) {
      const args = { sessionId: "s-1", onboardingStage: stage };
      expect(
        shouldWarm({ ...args, inputMode: "hybrid" }) && shouldDispatch(args),
      ).toBe(false);
    }
  });
});
