import { describe, expect, it } from "vitest";

import { interviewRoomProps } from "../agent-voice-presentation";
import { isInterviewActive } from "../helpers";

/**
 * The mandatory fullscreen gate as seen by the ROOM and the SCREEN ORDER.
 *
 * `fullscreenGranted` is the outermost hold on every room capability: an
 * unexpected exit mid-session drops all five props at once, so the client
 * disconnects, stops warming/prefetching, publishes no mic, and dispatches no
 * agent while the gate screen is up. The screen-order cases pin that a live
 * session without fullscreen renders the gate INSTEAD of the workspace, and
 * that results beat the gate (a timed-out session must always unlock).
 */

const ROOM_PROPS_BASE = {
  sessionId: "s-1",
  phase: "questioning" as const,
  onboardingStage: "completed",
  pendingFirstQuestion: null as unknown,
  micOn: true,
  finishResult: undefined as unknown,
  closingReason: null as "natural" | "ended_early" | "timed_out" | null,
  fullscreenGranted: false,
};

describe("the fullscreen gate zeroes every room capability", () => {
  it("onboarding: no warm room, no prefetch while locked", () => {
    const props = interviewRoomProps({
      ...ROOM_PROPS_BASE,
      onboardingStage: "readiness",
    });
    expect(props).toEqual({
      active: false,
      prefetch: false,
      warm: false,
      agentWanted: false,
      audio: false,
    });
  });

  it("questioning: the live room drops to all-false while locked", () => {
    const props = interviewRoomProps({ ...ROOM_PROPS_BASE });
    expect(props).toEqual({
      active: false,
      prefetch: false,
      warm: false,
      agentWanted: false,
      audio: false,
    });
  });

  it("natural closing: even the agent's goodbye is cut while locked", () => {
    const props = interviewRoomProps({
      ...ROOM_PROPS_BASE,
      phase: "closing",
      closingReason: "natural",
    });
    expect(props.active).toBe(false);
    expect(props.audio).toBe(false);
  });

  it("granted restores the exact pre-gate behaviour (control)", () => {
    const granted = interviewRoomProps({
      ...ROOM_PROPS_BASE,
      fullscreenGranted: true,
    });
    expect(granted.active).toBe(true);
    expect(granted.prefetch).toBe(true);
    expect(granted.agentWanted).toBe(true);
    expect(granted.audio).toBe(true);

    const grantedWarm = interviewRoomProps({
      ...ROOM_PROPS_BASE,
      fullscreenGranted: true,
      onboardingStage: "readiness",
    });
    expect(grantedWarm.active).toBe(false);
    expect(grantedWarm.warm).toBe(true);
  });
});

describe("screen order (isInterviewActive drives the gate's lock scope)", () => {
  it("a live session in every active phase is gated", () => {
    for (const phase of [
      "opening",
      "readiness",
      "transition",
      "questioning",
      "closing",
    ] as const) {
      expect(
        isInterviewActive({ sessionId: "s-1", hasFinishResult: false, phase }),
      ).toBe(true);
    }
  });

  it("results is NOT gated: finishResult ends the lock before the gate renders", () => {
    // The routes check finishResult BEFORE requiredOpen, so this false is what
    // lets a timed-out/finished session always unlock into the verdict.
    expect(
      isInterviewActive({
        sessionId: "s-1",
        hasFinishResult: true,
        phase: "questioning",
      }),
    ).toBe(false);
    expect(
      isInterviewActive({
        sessionId: "s-1",
        hasFinishResult: false,
        phase: "results",
      }),
    ).toBe(false);
  });

  it("no session (lobby) is not gated", () => {
    expect(
      isInterviewActive({
        sessionId: null,
        hasFinishResult: false,
        phase: "prestart",
      }),
    ).toBe(false);
  });
});
