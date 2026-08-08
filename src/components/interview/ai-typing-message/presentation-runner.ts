import type { NarrationPresentation } from "@/lib/hooks/use-interview-narration";

import {
  MAX_DURATION_READY_WAIT_MS,
  MAX_NARRATION_READY_WAIT_MS,
  MAX_PLAYOUT_WAIT_MS,
  MIN_PREPARATION_MS,
  normalizePresentation,
  nowMs,
  typingDelayAfter,
  type PresentationPhase,
  type Speak,
} from "./narration";

export type PresentationCallbacks = {
  onTick?: () => void;
  onTypingChange?: (typing: boolean) => void;
  onTextComplete?: () => void;
  onPresentationComplete?: () => void;
};

export type PresentationRunOptions = {
  animate: boolean;
  shouldType: boolean;
  text: string;
  speak: Speak;
  /** False for client-authored ceremony text the agent never voices. */
  agentVoiced?: boolean;
  callbacks: () => PresentationCallbacks;
  setShown: (value: string) => void;
  setPhase: (value: PresentationPhase) => void;
};

type Wait = (milliseconds: number) => Promise<void>;

type TurnContext = {
  options: PresentationRunOptions;
  presentation: NarrationPresentation;
  wait: Wait;
  isCancelled: () => boolean;
};

type TimerPool = { wait: Wait; clearAll: () => void };

function createTimerPool(): TimerPool {
  const timers = new Set<number>();
  return {
    wait: (milliseconds) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, milliseconds);
        timers.add(timer);
      }),
    clearAll: () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    },
  };
}

function startNarration(
  speak: Speak,
  text: string,
  agentVoiced: boolean,
): NarrationPresentation {
  try {
    return normalizePresentation(speak(text, { agentVoiced }));
  } catch {
    return {
      started: Promise.resolve(),
      finished: Promise.resolve(),
    };
  }
}

function trackNarrationStart(presentation: NarrationPresentation) {
  let narrationStartedAt: number | null = null;
  const started = presentation.started
    .catch(() => undefined)
    .then(() => {
      narrationStartedAt = nowMs();
    });
  return { started, startedAt: () => narrationStartedAt };
}

function pacedDelays(
  baseDelays: readonly number[],
  remainingDuration: number,
): number[] {
  const totalWeight = baseDelays.reduce((total, delay) => total + delay, 0);
  return baseDelays.map((delay) =>
    Math.max(1, (remainingDuration * delay) / totalWeight),
  );
}

type DelayResolution = {
  durationMs: Promise<number | null>;
  baseDelays: number[];
  startedAt: () => number | null;
  wait: Wait;
  isCancelled: () => boolean;
};

/** Resolves to `null` when the turn was cancelled while awaiting the duration. */
async function resolveDelays(input: DelayResolution): Promise<number[] | null> {
  const duration = await Promise.race([
    input.durationMs.catch(() => null),
    input.wait(MAX_DURATION_READY_WAIT_MS).then(() => null),
  ]);
  if (input.isCancelled()) return null;
  if (duration === null || !Number.isFinite(duration) || duration <= 0) {
    return input.baseDelays;
  }
  const narrationStartedAt = input.startedAt();
  const elapsedSinceNarrationStart =
    narrationStartedAt === null ? 0 : Math.max(0, nowMs() - narrationStartedAt);
  const remainingDuration = Math.max(0, duration - elapsedSinceNarrationStart);
  return pacedDelays(input.baseDelays, remainingDuration);
}

type TypeRun = {
  characters: string[];
  delays: number[];
  wait: Wait;
  isCancelled: () => boolean;
  emit: (value: string) => void;
};

/** Resolves to `false` when the turn was cancelled mid-way. */
async function typeCharacters(run: TypeRun): Promise<boolean> {
  run.emit(run.characters[0]);
  for (let index = 1; index < run.characters.length; index += 1) {
    if (run.isCancelled()) return false;
    await run.wait(run.delays[index - 1]);
    if (run.isCancelled()) return false;
    run.emit(run.characters.slice(0, index + 1).join(""));
  }
  return true;
}

/** Yields a getter for when narration began, or `null` if it never did. */
async function awaitTypingRelease(
  context: TurnContext,
): Promise<() => number | null> {
  const narration = trackNarrationStart(context.presentation);
  await Promise.all([
    context.wait(MIN_PREPARATION_MS),
    Promise.race([
      narration.started,
      context.wait(MAX_NARRATION_READY_WAIT_MS),
    ]),
  ]);
  return narration.startedAt;
}

async function typeText(context: TurnContext): Promise<void> {
  const { options, presentation, wait, isCancelled } = context;
  // Report "the AI has the floor" BEFORE the wait, not after it.
  //
  // `awaitTypingRelease` holds for the narration to start — on the agent path
  // that includes the whole join (~10-13s measured). Flagging it only afterwards
  // left `agentStatus` at "idle" for that entire stretch, so the workspace read
  // "Waiting for your answer" while the interviewer was still getting to the
  // question. Naming the state at the top makes it honest for both paths: the
  // client typewriter starts a beat later either way.
  options.callbacks().onTypingChange?.(true);
  const startedAt = await awaitTypingRelease(context);
  if (isCancelled()) {
    options.callbacks().onTypingChange?.(false);
    return;
  }
  if (!options.shouldType) {
    options.setShown(options.text);
    options.setPhase("complete");
    options.callbacks().onTick?.();
    options.callbacks().onTextComplete?.();
    return;
  }

  const characters = Array.from(options.text);
  if (characters.length === 0) {
    options.setPhase("complete");
    options.callbacks().onTextComplete?.();
    return;
  }

  const baseDelays = characters
    .slice(1)
    .map((_, index) => typingDelayAfter(characters[index]));
  let delays = baseDelays;
  if (presentation.durationMs) {
    const paced = await resolveDelays({
      durationMs: presentation.durationMs,
      baseDelays,
      startedAt,
      wait,
      isCancelled,
    });
    if (paced === null) return;
    delays = paced;
  }

  options.setPhase("typing");
  const emit = (value: string) => {
    options.setShown(value);
    options.callbacks().onTick?.();
  };
  const completed = await typeCharacters({
    characters,
    delays,
    wait,
    isCancelled,
    emit,
  });
  if (!completed) return;
  options.setPhase("complete");
  options.callbacks().onTextComplete?.();
}

async function runTurn(context: TurnContext): Promise<void> {
  const { options, presentation, wait, isCancelled } = context;
  await Promise.all([
    typeText(context),
    Promise.race([
      presentation.finished.catch(() => undefined),
      wait(MAX_PLAYOUT_WAIT_MS),
    ]),
  ]);
  if (isCancelled()) return;
  options.setShown(options.text);
  options.setPhase("complete");
  options.callbacks().onTypingChange?.(false);
  options.callbacks().onPresentationComplete?.();
}

/**
 * Drives one AI turn's presentation (prepare → narrate → type → settle) and
 * returns the effect cleanup that cancels it.
 */
export function runPresentation(options: PresentationRunOptions): () => void {
  if (!options.animate) {
    options.setShown(options.text);
    options.setPhase("complete");
    options.callbacks().onTypingChange?.(false);
    options.callbacks().onTextComplete?.();
    return () => undefined;
  }

  let cancelled = false;
  const pool = createTimerPool();

  options.setPhase("preparing");
  options.callbacks().onTypingChange?.(false);

  void runTurn({
    options,
    presentation: startNarration(
      options.speak,
      options.text,
      options.agentVoiced ?? true,
    ),
    wait: pool.wait,
    isCancelled: () => cancelled,
  });

  return () => {
    cancelled = true;
    pool.clearAll();
    options.callbacks().onTypingChange?.(false);
  };
}
