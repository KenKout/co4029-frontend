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
 * Sized from measurement, not guesswork. Token mint → `voice.room_join` on this
 * deployment: 10.0s, 13.2s, 13.3s (sessions 43a25e3d, 38b75255, d6cb2619), and
 * the agent then runs its own TTS (~3.0-3.6s for a question-length utterance)
 * before any audio arrives. So the realistic worst case is ~17s and the
 * previous 6s cap expired while the agent was still joining — the text was
 * released early and outran the voice anyway.
 *
 * 20s leaves headroom over that without letting a genuinely dead room pin the
 * screen indefinitely. On expiry the text types anyway: a late caption beats a
 * stalled screen.
 */
export const AGENT_VOICE_START_TIMEOUT_MS = 20_000;

/**
 * Cap on how long a turn stays "presenting" after the agent began speaking.
 *
 * Only reached if a `speaking` → quiet transition is never observed. Kept well
 * under `MAX_PLAYOUT_WAIT_MS` (30s) in the presentation runner so this is never
 * the thing that pins the composer.
 */
export const AGENT_VOICE_END_TIMEOUT_MS = 20_000;

/**
 * Words per minute assumed for the agent's TTS when estimating how long a turn
 * will take to speak.
 *
 * The agent publishes no duration — `lk.agent.state` only says *that* it is
 * speaking, never for how long — so the typewriter needs an estimate to pace
 * against. Measured on this deployment: Deepgram Aura-2 (`aura-2-orpheus-en`)
 * takes 5.98s for the 15-word question "What is the primary difference between
 * operational processing and information processing in an organizational
 * context?", i.e. ~151 wpm once the sentence-final pause is accounted for.
 *
 * That matches `wordsPerMinuteFromTraits`' neutral landing (150), which is the
 * same figure the browser-voice path already estimates with — so this is the
 * existing model applied to the agent path, not a new invented constant.
 */
const AGENT_WORDS_PER_MINUTE = 150;

/** Pause the agent's TTS takes at each sentence/clause boundary, in ms. */
const AGENT_PUNCTUATION_PAUSE_MS = 180;

/** Floor, mirroring `estimateSpeechDurationMs` — a stub utterance still takes time. */
const AGENT_MIN_DURATION_MS = 800;

/**
 * Estimate how long the agent will spend speaking `text`.
 *
 * Deliberately the same shape as `estimateSpeechDurationMs` in
 * `use-interview-narration/audio-support` (words ÷ wpm, plus a fixed pause per
 * punctuation mark). Kept local rather than imported because that helper takes
 * `PersonaTraits` and a language and applies a Vietnamese rate factor, none of
 * which apply here: the agent's voice is chosen server-side and the client has
 * no visibility into it.
 */
export function estimateAgentSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  if (words === 0) return AGENT_MIN_DURATION_MS;
  const pauses = (text.match(/[.!?;:]/gu) ?? []).length * AGENT_PUNCTUATION_PAUSE_MS;
  return Math.max(
    AGENT_MIN_DURATION_MS,
    (words * 60_000) / AGENT_WORDS_PER_MINUTE + pauses,
  );
}

export interface AgentVoiceCoordinator {
  /** Report the agent's current phase. Idempotent; only transitions settle waiters. */
  setPhase: (phase: AgentVoicePhase) => void;
  /**
   * Declare that an agent is EXPECTED to speak, before one has appeared.
   *
   * Without this the coordinator could not tell "no agent will ever speak"
   * (flag off, text-only session — must not wait) from "the agent is still
   * joining" (must wait). It resolved that ambiguity with `everReported`, which
   * only flips once `lk.agent.state` has actually been published — i.e. once
   * the agent is already IN the room.
   *
   * Question one mounts before that. Measured on session d6cb2619: the turn
   * mounts ~13:09:05 and `room_join` lands at 13:09:14.5, so for ~10s
   * `everReported` was false, `present()` returned the settled fallback, and
   * the text typed itself out at base speed long before the voice — the
   * reported "text chạy gần hết voice mới phát".
   *
   * The workspace already knows the answer: `roomWanted` (the provider's
   * `active`) is true across the whole join. Feeding it here lets a turn wait
   * for an agent that has not arrived yet, while a text-only session still
   * degrades to the settled presentation exactly as before.
   */
  setAgentExpected: (expected: boolean) => void;
  /** The presentation handle for one agent-spoken turn. */
  present: (text: string) => NarrationPresentation;
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
  // Set by the workspace from `roomWanted`: an agent is on its way even though
  // `lk.agent.state` has not been published yet. Without it a turn mounting
  // during the join window degraded to the settled presentation and outran the
  // voice by the whole join duration (~10s measured).
  let agentExpected = false;
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

    setAgentExpected: (expected: boolean) => {
      agentExpected = expected;
    },

    present: (text: string): NarrationPresentation => {
      // Only skip the wait when nothing will ever speak: no agent has reported
      // a phase AND none is on the way. During the join both are the same
      // observable state (`state === undefined`), which is why `agentExpected`
      // has to come from outside.
      if (!everReported && !agentExpected) return settledPresentation();

      // The agent never reports how LONG it will speak — `lk.agent.state` is a
      // start/stop signal only. Without a duration the runner falls back to the
      // per-character base delays (~4.9s for the 15-word question measured
      // above) while the audio actually runs 5.98s, so the text finishes about
      // a second early and reads as "voice chậm hơn text". Supplying an
      // estimate makes the runner stretch the delays to match.
      const durationMs = Promise.resolve(estimateAgentSpeechMs(text));

      // Agent already mid-utterance: this turn's text belongs with it now.
      if (phase === "speaking") {
        return {
          started: Promise.resolve(),
          finished: waitFor(endWaiters, AGENT_VOICE_END_TIMEOUT_MS),
          durationMs,
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
      return { started, finished, durationMs };
    },
  };
}
