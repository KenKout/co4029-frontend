import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveTextTransport } from "../text-transport";

/**
 * Which transport carries a typed turn.
 *
 * This is the flag gate, so it is the one thing that decides whether a deploy
 * changes behaviour at all. Every case below asserts the REST fallback survives:
 * a bug here does not degrade gracefully, it either sends interview answers into
 * a stream nobody reads (answer lost, turn never graded) or opens a room for a
 * session that must not have one.
 */

const HYBRID_READY = {
  inputMode: "hybrid" as const,
  onboardingStage: "completed",
  roomConnected: true,
};

function enableFlag() {
  vi.stubEnv("VITE_INTERVIEW_LK_TEXT", "1");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveTextTransport", () => {
  it("stays on REST while the flag is off, even when everything else is ready", () => {
    // The deploy-safety property: shipping this code with the flag unset must be
    // indistinguishable from before it existed. Stub explicitly rather than
    // relying on the build-time env, which may carry "1" in some deployments.
    vi.stubEnv("VITE_INTERVIEW_LK_TEXT", "0");
    expect(resolveTextTransport(HYBRID_READY)).toBe("rest");
  });

  it("uses livekit for a flagged hybrid session after onboarding", () => {
    enableFlag();
    expect(resolveTextTransport(HYBRID_READY)).toBe("livekit");
  });

  it("keeps pure-text sessions on REST", () => {
    // A text session never joins a room, so `lk.chat` has no connection to
    // write to and the backend refuses to mint it a token.
    enableFlag();
    expect(
      resolveTextTransport({ ...HYBRID_READY, inputMode: "text" }),
    ).toBe("rest");
  });

  it("keeps onboarding answers on REST", () => {
    // The agent is dispatched by the join token, which the backend will not mint
    // until onboarding_stage === "completed" — so during onboarding there is
    // provably no agent listening on lk.chat.
    enableFlag();
    for (const stage of ["identity_check", "audio_check", "readiness", null]) {
      expect(
        resolveTextTransport({ ...HYBRID_READY, onboardingStage: stage }),
      ).toBe("rest");
    }
  });

  it("falls back to REST when the room is not connected", () => {
    // A dropped room mid-session must not silently swallow answers. REST keeps
    // the candidate interviewing.
    enableFlag();
    expect(
      resolveTextTransport({ ...HYBRID_READY, roomConnected: false }),
    ).toBe("rest");
  });

  it("treats any flag value other than \"1\" as off", () => {
    // Guards against a truthiness bug: "0"/"false"/"" must not enable it.
    for (const value of ["0", "false", "", "true", "yes"]) {
      vi.stubEnv("VITE_INTERVIEW_LK_TEXT", value);
      const expected = value === "1" ? "livekit" : "rest";
      expect(resolveTextTransport(HYBRID_READY), `flag=${value}`).toBe(expected);
    }
  });
});
