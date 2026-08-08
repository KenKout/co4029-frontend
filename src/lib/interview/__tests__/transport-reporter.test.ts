import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decideTextTransport } from "../text-transport";
import {
  reportTextTransport,
  resetTransportReporting,
} from "../transport-reporter";

const HYBRID_READY = {
  inputMode: "hybrid" as const,
  onboardingStage: "completed",
  roomConnected: true,
};

describe("decideTextTransport", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("names the flag when the feature is off", () => {
    vi.stubEnv("VITE_INTERVIEW_LK_TEXT", "0");
    expect(decideTextTransport(HYBRID_READY)).toEqual({
      transport: "rest",
      reason: "flag-off",
    });
  });

  it("names the session mode for non-hybrid sessions", () => {
    vi.stubEnv("VITE_INTERVIEW_LK_TEXT", "1");
    expect(decideTextTransport({ ...HYBRID_READY, inputMode: "text" })).toEqual(
      {
        transport: "rest",
        reason: "not-hybrid",
      },
    );
    expect(
      decideTextTransport({ ...HYBRID_READY, inputMode: "voice" }),
    ).toEqual({ transport: "rest", reason: "not-hybrid" });
  });

  it("names onboarding when setup has not finished", () => {
    vi.stubEnv("VITE_INTERVIEW_LK_TEXT", "1");
    expect(
      decideTextTransport({
        ...HYBRID_READY,
        onboardingStage: "identity_check",
      }),
    ).toEqual({ transport: "rest", reason: "onboarding-incomplete" });
  });

  it("names the room when it is not connected", () => {
    // The gate a missing agent worker lands on: dispatch never happens, the
    // agent never joins, and every turn silently takes REST.
    vi.stubEnv("VITE_INTERVIEW_LK_TEXT", "1");
    expect(
      decideTextTransport({ ...HYBRID_READY, roomConnected: false }),
    ).toEqual({ transport: "rest", reason: "room-disconnected" });
  });

  it("reports livekit only when every gate passes", () => {
    vi.stubEnv("VITE_INTERVIEW_LK_TEXT", "1");
    expect(decideTextTransport(HYBRID_READY)).toEqual({
      transport: "livekit",
      reason: "livekit",
    });
  });
});

describe("reportTextTransport", () => {
  beforeEach(() => {
    resetTransportReporting();
  });

  it("logs the session, transport and deciding gate", () => {
    const log = vi.fn();
    reportTextTransport("s1", { transport: "rest", reason: "flag-off" }, log);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain("session=s1");
    expect(log.mock.calls[0][0]).toContain("transport=rest");
    expect(log.mock.calls[0][0]).toContain("reason=flag-off");
  });

  it("stays quiet while the decision is unchanged", () => {
    const log = vi.fn();
    const decision = { transport: "livekit", reason: "livekit" } as const;

    reportTextTransport("s1", decision, log);
    reportTextTransport("s1", decision, log);
    reportTextTransport("s1", decision, log);

    expect(log).toHaveBeenCalledTimes(1);
  });

  it("reports again when the gate changes mid-session", () => {
    // The transition that matters operationally: a room that drops takes every
    // later turn down the REST path, and that has to show up.
    const log = vi.fn();
    reportTextTransport("s1", { transport: "livekit", reason: "livekit" }, log);
    reportTextTransport(
      "s1",
      { transport: "rest", reason: "room-disconnected" },
      log,
    );

    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[1][0]).toContain("reason=room-disconnected");
  });

  it("reports per session so a second interview does not inherit the first", () => {
    const log = vi.fn();
    const decision = { transport: "rest", reason: "flag-off" } as const;

    reportTextTransport("s1", decision, log);
    reportTextTransport("s2", decision, log);

    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[1][0]).toContain("session=s2");
  });
});
