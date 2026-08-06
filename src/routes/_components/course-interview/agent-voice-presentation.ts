/**
 * Presentation timing for turns the LiveKit AGENT speaks.
 *
 * While the room is live the client must not narrate (the agent's audio track
 * IS the voice — see `use-interview-speech.ts` and the double-voice gate). The
 * gate used to hand `AiTypingMessage` a fully-settled presentation for those
 * turns: `started` and `finished` both already resolved.
 *
 * That silently removed the pacing signal. `AiTypingMessage` holds its text at
 * the "preparing" indicator until `presentation.started` resolves, precisely so
 * the words appear WITH the voice. An already-resolved `started` releases the
 * typewriter on the spot, while the agent still has to join the room and run
 * its own TTS before it says anything — so question one typed itself out almost
 * completely before the voice came up ("text viết gần xong mới voice lên").
 *
 * This coordinator restores the missing signal from the only source that knows:
 * the agent's own `lk.agent.state` attribute, surfaced by `useVoiceAssistant()`
 * as "initializing" | "idle" | "listening" | "thinking" | "speaking". A turn's
 * text is released when the agent actually enters `speaking`, and the turn
 * counts as presented when it leaves that state.
 *
 * FAILURE SAFETY: if no agent phase has ever been reported (flag off, agent
 * never joined, or a future SDK stops publishing the attribute) `present()`
 * returns the old already-settled presentation, so the worst case is exactly
 * today's behaviour rather than text stuck behind a signal that never arrives.
 * Both waits are capped for the same reason.
 */
import type { NarrationPresentation } from "@/lib/hooks/use-interview-narration";

/** What the agent's voice is doing right now, as far as the client can tell. */
export type AgentVoicePhase = "unknown" | "quiet" | "speaking";

/**
 * Cap on how long a turn's text waits for the agent to start speaking.
 *
 * Covers room handover + agent-side TTS for question one (observed: a few
 * seconds). On expiry the text types anyway — a late caption beats a stalled
 * screen.
 */
export const AGENT_VOICE_START_TIMEOUT_MS = 6_000;

/**
 * Cap on how long a turn stays "presenting" after the agent began speaking.
 *
 * Only reached if a `speaking` → quiet transition is never observed. Kept well
 * under `MAX_PLAYOUT_WAIT_MS` (30s) in the presentation runner so this is never
 * the thing that pins the composer.
 */
export const AGENT_VOICE_END_TIMEOUT_MS = 20_000;

export interface AgentVoiceCoordinator {
  /** Report the agent's current phase. Idempotent; only transitions settle waiters. */
  setPhase: (phase: AgentVoicePhase) => void;
  /** The presentation handle for one agent-spoken turn. */
  present: () => NarrationPresentation;
}

/** Map `useVoiceAssistant()` output onto a phase, without leaking SDK strings. */
export function resolveAgentVoicePhase(
  agentPresent: boolean,
  state: string | undefined,
): AgentVoicePhase {
  if (!agentPresent) return "unknown";
  if (state === "speaking") return "speaking";
  if (
    state === "listening" ||
    state === "thinking" ||
    state === "idle" ||
    state === "initializing"
  ) {
    return "quiet";
  }
  // "disconnected" / "connecting" / anything newer: no usable voice signal.
  return "unknown";
}

function settledPresentation(): NarrationPresentation {
  return { started: Promise.resolve(), finished: Promise.resolve() };
}

export function createAgentVoiceCoordinator(): AgentVoiceCoordinator {
  let phase: AgentVoicePhase = "unknown";
  // Whether a usable phase has EVER been seen. Until then we cannot distinguish
  // "the agent is quiet" from "this build never reports agent state", so the
  // gate must not make a turn wait on a signal that may never arrive.
  let everReported = false;
  const startWaiters = new Set<() => void>();
  const endWaiters = new Set<() => void>();

  const drain = (waiters: Set<() => void>) => {
    const pending = [...waiters];
    waiters.clear();
    pending.forEach((settle) => settle());
  };

  const waitFor = (waiters: Set<() => void>, timeoutMs: number) =>
    new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        waiters.delete(settle);
        resolve();
      };
      const timer = window.setTimeout(settle, timeoutMs);
      waiters.add(settle);
    });

  return {
    setPhase: (next: AgentVoicePhase) => {
      if (next !== "unknown") everReported = true;
      if (next === phase) return;
      const wasSpeaking = phase === "speaking";
      phase = next;
      if (next === "speaking") {
        drain(startWaiters);
      } else if (wasSpeaking) {
        drain(endWaiters);
      }
    },

    present: (): NarrationPresentation => {
      if (!everReported) return settledPresentation();

      // Agent already mid-utterance: this turn's text belongs with it now.
      if (phase === "speaking") {
        return {
          started: Promise.resolve(),
          finished: waitFor(endWaiters, AGENT_VOICE_END_TIMEOUT_MS),
        };
      }

      let spokeForThisTurn = false;
      const started = waitFor(
        startWaiters,
        AGENT_VOICE_START_TIMEOUT_MS,
      ).then(() => {
        spokeForThisTurn = phase === "speaking";
      });
      // When the agent never actually spoke, there is no playout to wait out —
      // settle immediately so the turn completes exactly as it does today.
      const finished = started.then(() =>
        spokeForThisTurn
          ? waitFor(endWaiters, AGENT_VOICE_END_TIMEOUT_MS)
          : undefined,
      );
      return { started, finished };
    },
  };
}
