/**
 * The three-promise presentation handle a narration hands back, and the
 * idempotent resolvers behind it.
 *
 * Moved verbatim out of `use-interview-narration.ts`: each promise settles at
 * most once, and `settleAll` is the same triple the hook's `settleActiveRef`
 * used to hold.
 */

export interface NarrationDeferred {
  started: Promise<void>;
  finished: Promise<void>;
  durationMs: Promise<number | null>;
  resolveStarted: () => void;
  resolveFinished: () => void;
  resolveDuration: (durationMs: number | null) => void;
  settleAll: () => void;
}

export function createNarrationDeferred(): NarrationDeferred {
  let startedSettled = false;
  let finishedSettled = false;
  let durationSettled = false;
  let resolveStarted!: () => void;
  let resolveFinished!: () => void;
  let resolveDuration!: (durationMs: number | null) => void;
  const started = new Promise<void>((resolve) => {
    resolveStarted = () => {
      if (!startedSettled) {
        startedSettled = true;
        resolve();
      }
    };
  });
  const finished = new Promise<void>((resolve) => {
    resolveFinished = () => {
      if (!finishedSettled) {
        finishedSettled = true;
        resolve();
      }
    };
  });
  const durationMs = new Promise<number | null>((resolve) => {
    resolveDuration = (duration) => {
      if (!durationSettled) {
        durationSettled = true;
        resolve(duration);
      }
    };
  });

  return {
    started,
    finished,
    durationMs,
    resolveStarted,
    resolveFinished,
    resolveDuration,
    settleAll: () => {
      resolveStarted();
      resolveFinished();
      resolveDuration(null);
    },
  };
}
