/**
 * Which transport carries a typed interview turn.
 *
 * Two paths exist on purpose:
 *
 *   "rest"    POST /interview-sessions/{id}/respond — the long-standing path.
 *             Always used for onboarding (no room exists yet: the agent is
 *             dispatched by the join token, which the backend refuses to mint
 *             until onboarding_stage === "completed") and for pure-text
 *             sessions (which never join a room at all).
 *
 *   "livekit" the `lk.chat` text stream on the session's ONE LiveKit room.
 *             Hybrid sessions only, after onboarding, and only when the flag is
 *             on. Structured turn results come back on the control topic.
 *
 * The flag defaults OFF so a deploy changes nothing until it is set explicitly.
 */

/** True when the LiveKit text transport is enabled for this build. */
export function livekitTextEnabled(): boolean {
  return import.meta.env.VITE_INTERVIEW_LK_TEXT === "1";
}

export type TextTransport = "rest" | "livekit";

/**
 * Which gate decided the transport. Exists because the REST fallback is silent:
 * a working interview is not evidence the LiveKit path carried it, so the
 * deciding gate has to be nameable or the flag can look enabled while doing
 * nothing.
 */
export type TextTransportReason =
  /** `VITE_INTERVIEW_LK_TEXT` is not "1". */
  | "flag-off"
  /** Pure voice or pure text session; neither holds a room for typed turns. */
  | "not-hybrid"
  /** Onboarding answers predate the room, and the agent is not dispatched yet. */
  | "onboarding-incomplete"
  /** Room never connected or has dropped — commonly no agent worker available. */
  | "room-disconnected"
  | "livekit";

export interface TextTransportDecision {
  transport: TextTransport;
  reason: TextTransportReason;
}

/**
 * Pick the transport for a typed turn.
 *
 * Deliberately a pure function of the session's own state so it can be unit
 * tested and so every call site agrees. `roomConnected` is required: a hybrid
 * session whose room has dropped must fall back to REST rather than write into
 * a dead stream — the candidate keeps interviewing either way.
 */
export function resolveTextTransport(args: {
  inputMode: "voice" | "text" | "hybrid";
  onboardingStage: string | null | undefined;
  roomConnected: boolean;
}): TextTransport {
  return decideTextTransport(args).transport;
}

/**
 * The same decision, plus which gate made it.
 *
 * `resolveTextTransport` stays the call-site API so existing consumers and
 * tests are untouched; this is the variant the observability log needs.
 */
export function decideTextTransport(args: {
  inputMode: "voice" | "text" | "hybrid";
  onboardingStage: string | null | undefined;
  roomConnected: boolean;
}): TextTransportDecision {
  if (!livekitTextEnabled()) return { transport: "rest", reason: "flag-off" };
  // Pure-text sessions never hold a room.
  if (args.inputMode !== "hybrid") {
    return { transport: "rest", reason: "not-hybrid" };
  }
  // Onboarding answers predate the room's existence.
  if (args.onboardingStage !== "completed") {
    return { transport: "rest", reason: "onboarding-incomplete" };
  }
  if (!args.roomConnected) {
    return { transport: "rest", reason: "room-disconnected" };
  }
  return { transport: "livekit", reason: "livekit" };
}
