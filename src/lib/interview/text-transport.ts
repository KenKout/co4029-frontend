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
  if (!livekitTextEnabled()) return "rest";
  // Pure-text sessions never hold a room.
  if (args.inputMode !== "hybrid") return "rest";
  // Onboarding answers predate the room's existence.
  if (args.onboardingStage !== "completed") return "rest";
  if (!args.roomConnected) return "rest";
  return "livekit";
}
