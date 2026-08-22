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

/**
 * What the agent's voice is doing, as far as this client can tell.
 *
 * `failed` is distinct from `unknown` on purpose, and the distinction is
 * load-bearing: `unknown` means "no usable signal yet, keep waiting" (the join
 * window), whereas `failed` means "the agent is not coming, stop waiting". They
 * used to be the same value, so a crashed worker made a turn sit out the full
 * 20s start timeout in silence before releasing its text.
 */
export type AgentVoicePhase = "unknown" | "quiet" | "speaking" | "failed";

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
 * How long an expected agent may take to appear before it is treated as failed.
 *
 * `lk.agent.state === "failed"` only covers a worker that joined and then
 * reported failure; it cannot describe an agent that was never dispatched,
 * because there is no participant to publish the attribute. That case is real —
 * the worker reports itself unavailable above `interview_voice_load_threshold`
 * (~4100 times on a shared box) and LiveKit will not dispatch to it — and it
 * left the candidate in an empty room with the phase stuck on "unknown", which
 * means "keep waiting".
 *
 * 25s sits above both the measured join (10-13s) and the SDK's own 20s agent
 * timeout, so a slow-but-successful join is never pre-empted.
 */
export const AGENT_JOIN_DEADLINE_MS = 25_000;

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

/**
 * Does the LiveKit agent own the spoken voice right now?
 *
 * Exported and pure so the regression below is pinned against the REAL
 * predicate. A test that re-implements this logic passes whatever the shipped
 * code does — which is exactly how a copy of it stayed green while the bug it
 * described was reintroduced.
 *
 * A connected room is NOT sufficient. A WARMED room (opened during setup so the
 * ~10-13s worker startup overlaps onboarding) is connected with nobody in it:
 * the client is still the only voice and narrates the ceremony lines itself.
 * `use-interview-speech.ts` cancels in-flight narration on the handover edge, so
 * treating a warm connection as a handover truncated the greeting — reported as
 * «đọc được "Hi Xà" xong dừng lại». Session bd61e0f3: warm token 16:51:46.397,
 * greeting fetched 16:51:46.409 (17.8s of audio), cancelled a beat later when
 * the room finished connecting.
 *
 * Gating on completed onboarding is exactly the moment the agent is dispatched.
 */
export function resolveAgentOwnsTheVoice(args: {
  onboardingStage: string | null | undefined;
  roomWanted: boolean;
  connecting: boolean;
  chatConnected: boolean;
  pendingFirstQuestion: boolean;
}): boolean {
  if (args.onboardingStage !== "completed") return false;
  // Once onboarding is complete the agent owns the voice unconditionally — no
  // per-beat exception, in particular not for `pendingFirstQuestion`.
  //
  // The tempting exception is the post-onboarding transition line ("…Here is your
  // first question."), which exists only client-side and which the agent never
  // receives, so only browser narration can voice it. Carving that out puts TWO
  // voices on one beat: the native agent speaks question one the instant it joins
  // (`native_runtime.NativeInterviewAgent.on_enter`) and warm-room makes that
  // almost immediate, so the browser's speech-synthesis voice reads the ceremony
  // line over the agent's Deepgram voice asking the question. Two utterances at
  // once is heard as an interviewer talking "super fast".
  //
  // Cost of having no exception: the transition line is typed but never spoken.
  // That is the cheaper failure — one consistent interviewer voice beats a
  // ceremony line in a second voice on top of the question — and `present()`
  // paces its typewriter to the agent's audio, so text and voice stay in step.
  //
  // Text-only sessions are unaffected: no room is opened for them, so
  // `roomWanted` and `chatConnected` are both false and the client keeps the voice.
  return args.roomWanted || args.connecting || args.chatConnected;
}

/**
 * Should the room be opened/kept open with a warm (non-dispatching) token?
 *
 * Two windows, not one:
 *
 * 1. During onboarding — the point of warm-room: the ~10-13s LiveKit worker
 *    startup overlaps setup instead of preceding question one.
 * 2. Through the transition beat that follows it. `roomActive` is deliberately
 *    false while `pendingFirstQuestion` holds, so the client can voice the
 *    transition line the agent never receives. If `warm` also went false there,
 *    `connect` (`active || warm`) would drop and re-establish the WebRTC session
 *    mid-utterance — the teardown re-idles the audio output route and clips the
 *    opening syllables. Reported as «bị voice thiếu 2 3 chữ đầu (nhưng sau đó
 *    đọc tiếp đúng nhịp)».
 *
 * Warming past onboarding costs nothing: the provider only mints a warm token
 * while nothing else wants a real room, and by then the agent is dispatched.
 */
export function shouldWarmRoom(args: {
  sessionId: string | null;
  onboardingStage: string | null | undefined;
  pendingFirstQuestion: boolean;
}): boolean {
  if (!args.sessionId) return false;
  return args.onboardingStage !== "completed" || args.pendingFirstQuestion;
}

/**
 * Did the AGENT end the interview itself, rather than the candidate?
 *
 * Exported and pure so tests exercise the shipped rule instead of a copy.
 *
 * Only `"natural"` comes from the turn pipeline: `orchestration_bridge` runs
 * `submit_session` and returns the closing as `speak_text`, so on a live room
 * the agent is speaking that goodbye over LiveKit right then. Everything else —
 * `"ended_early"` (End button, leaving) and `"timed_out"` (the client's own
 * timer) — never reaches the agent at all: `POST /finish` writes the ceremony
 * message and enqueues evaluation, and that is the whole of it.
 *
 * Which is why the two endings differ on screen: a natural end plays its
 * goodbye and then shows the result, while the candidate-initiated endings go
 * straight to the result rather than holding them ~10s for a farewell they did
 * not ask for. The goodbye is still persisted server-side, so it stays in the
 * transcript either way.
 */
export function agentEndedTheInterview(reason: string): boolean {
  return reason === "natural";
}

/**
 * Does the ending render a goodbye turn, or go straight to the result?
 *
 * Load-bearing beyond politeness: presenting the closing turn is what advances
 * `phase` from "closing" to "results" (`handleTurnPresented` in
 * use-interview-sequencing). So whenever this returns false the caller MUST
 * enter the result directly — otherwise nothing fires the trigger and the screen
 * hangs on the interview view forever.
 *
 * False when the candidate ended it themselves (no agent involved, and they
 * should not be held for a farewell they opted out of) or when the server
 * returned no closing text at all.
 */
export function shouldPresentGoodbye(args: {
  reason: string;
  closingText: string | null | undefined;
}): boolean {
  return agentEndedTheInterview(args.reason) && Boolean(args.closingText);
}

/** Map `useVoiceAssistant()` output onto a phase, without leaking SDK strings. */
export function resolveAgentVoicePhase(
  agentPresent: boolean,
  state: string | undefined,
): AgentVoicePhase {
  // `failed` is reported by the SDK when the worker could not start or crashed,
  // and it arrives WITHOUT an agent participant — so this check has to come
  // before the `agentPresent` guard or it would be swallowed as "unknown" and
  // the turn would wait out the full start timeout for an agent that is never
  // coming.
  if (state === "failed") return "failed";
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
  // "disconnected" / "connecting" / "pre-connect-buffering" / anything newer:
  // no usable voice signal YET. Distinct from `failed` — these are transient.
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
      } else if (next === "failed") {
        // The agent is not coming. Release EVERY waiter immediately rather than
        // letting each turn burn its 20s start timeout in silence: the text is
        // all the candidate is going to get, so it should appear now.
        drain(startWaiters);
        drain(endWaiters);
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
      // The agent already failed: waiting is pointless, and `agentExpected` is
      // still true (the room is still "wanted"), so without this a turn arriving
      // after the failure would wait the full timeout all over again.
      if (phase === "failed") return settledPresentation();

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
