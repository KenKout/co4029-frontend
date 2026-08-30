import { describe, expect, it } from "vitest";

import { interviewRoomProps } from "../agent-voice-presentation";

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
 *
 * End/timer is a second, harder hold: `beginClosing` moves the phase to
 * `closing` synchronously, before the finish API resolves, and the page gates
 * every room capability on that transition (`roomRequested`). So the room
 * disconnects, RoomAudioRenderer unmounts, and the mic drops the instant the
 * candidate presses End or the timer runs out — in-flight agent audio cannot
 * continue into the closing/result screen. The five InterviewRoomProvider
 * props are computed by the SHIPPED `interviewRoomProps` predicate; the
 * terminal-state cases below exercise it directly.
 */

function roomActive(args: {
  sessionId: string | null;
  voiceActive: boolean;
  inputMode: "voice" | "text" | "hybrid";
  onboardingStage: string;
  pendingFirstQuestion: unknown;
  phase?: "questioning" | "closing" | "results";
  finishResult?: unknown;
}): boolean {
  const terminal =
    args.phase === "closing" ||
    args.phase === "results" ||
    Boolean(args.finishResult);
  return (
    !terminal &&
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
  phase?: "questioning" | "closing" | "results";
  finishResult?: unknown;
}): boolean {
  const terminal =
    args.phase === "closing" ||
    args.phase === "results" ||
    Boolean(args.finishResult);
  return (
    !terminal &&
    Boolean(args.sessionId) &&
    args.inputMode === "hybrid" &&
    args.onboardingStage === "completed"
  );
}

/**
 * The five InterviewRoomProvider props as computed by the SHIPPED policy
 * (`interviewRoomProps` in agent-voice-presentation.ts) — imported, not
 * mirrored, so the regression passes only when the real rule is right.
 * `roomRequested` is the terminal gate: End/timer flips the phase to `closing`
 * synchronously, so every capability — token mint, warm connection, agent
 * dispatch, mic publish — dies at that transition. The exception is a
 * `natural` closing: the agent is reading the goodbye over LiveKit, so the
 * room stays fully live until the farewell presents and the phase advances
 * to results (which nulls `closingReason` in the same tick).
 */
const ROOM_PROPS_BASE = {
  sessionId: "s-1",
  phase: "questioning" as const,
  onboardingStage: "completed",
  pendingFirstQuestion: null as unknown,
  micOn: true,
  finishResult: undefined as unknown,
  closingReason: null as "natural" | "ended_early" | "timed_out" | null,
};

const BASE = {
  sessionId: "s-1",
  voiceActive: false,
  inputMode: "hybrid" as const,
  onboardingStage: "completed",
  pendingFirstQuestion: null as unknown,
};

const TERMINAL_STATES: (
  | { phase: "closing"; closingReason?: "ended_early" | "timed_out" }
  | { phase: "results" }
  | { finishResult: { status: string } }
)[] = [
  // End button / timer expiry: closingReason is "ended_early"/"timed_out",
  // never "natural" — the room must die at once.
  { phase: "closing", closingReason: "ended_early" },
  { phase: "closing", closingReason: "timed_out" },
  { phase: "results" },
  { finishResult: { status: "completed" } },
];

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

  it("stops the room immediately in a terminal state", () => {
    // End button / timer expiry move the phase to `closing` synchronously
    // (beginClosing), before the finish API resolves — so the room must be
    // down even while `finishResult` is still null.
    for (const terminal of TERMINAL_STATES) {
      expect(roomActive({ ...BASE, ...terminal })).toBe(false);
      expect(prefetch({ ...BASE, ...terminal })).toBe(false);
    }
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

describe("terminal states kill every room capability", () => {
  it.each(TERMINAL_STATES)("all five props are off: %j", (terminal) => {
    // `micOn` irrelevant: audio is AND-gated on roomActive.
    const props = interviewRoomProps({ ...ROOM_PROPS_BASE, ...terminal });
    expect(props.active).toBe(false);
    expect(props.prefetch).toBe(false);
    expect(props.warm).toBe(false);
    expect(props.agentWanted).toBe(false);
    expect(props.audio).toBe(false);
  });

  it("keeps the full room live mid-questioning (control)", () => {
    const props = interviewRoomProps(ROOM_PROPS_BASE);
    expect(props.active).toBe(true);
    expect(props.prefetch).toBe(true);
    // Warming stops once the transition has been presented; the room is live.
    expect(props.warm).toBe(false);
    expect(props.agentWanted).toBe(true);
    expect(props.audio).toBe(true);
  });
});

describe("a natural closing keeps the room for the agent's goodbye", () => {
  it("holds every capability up while the farewell is presenting", () => {
    // The agent is speaking the closing over LiveKit right now; the room must
    // not drop it, and the client must not take over the voice.
    const props = interviewRoomProps({
      ...ROOM_PROPS_BASE,
      phase: "closing",
      closingReason: "natural",
    });
    expect(props.active).toBe(true);
    expect(props.prefetch).toBe(true);
    // No warming in closing — `active` alone holds the connection.
    expect(props.warm).toBe(false);
    expect(props.agentWanted).toBe(true);
    expect(props.audio).toBe(true);
  });

  it("cuts the room the moment the farewell has presented (→results)", () => {
    // handleTurnPresented advances closing → results and nulls closingReason
    // in the same tick; terminal then, and only then.
    const props = interviewRoomProps({
      ...ROOM_PROPS_BASE,
      phase: "results",
      closingReason: null,
    });
    expect(props.active).toBe(false);
    expect(props.prefetch).toBe(false);
    expect(props.warm).toBe(false);
    expect(props.agentWanted).toBe(false);
    expect(props.audio).toBe(false);
  });

  it("does not hold a stale natural closing when the finish already landed", () => {
    const props = interviewRoomProps({
      ...ROOM_PROPS_BASE,
      phase: "closing",
      closingReason: "natural",
      finishResult: { status: "completed" },
    });
    expect(props.active).toBe(false);
    expect(props.audio).toBe(false);
  });
});
